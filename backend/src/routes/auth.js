const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const PUBLIC_FIELDS = 'id, nom, prenom, email, role, telephone, sexe, date_naissance, photo';

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, nom: user.nom, prenom: user.prenom },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// Les hash créés par PHP commencent par $2y$ ; bcryptjs les lit comme $2a$ (même algorithme)
async function checkPassword(plain, stored) {
  if (!stored) return { ok: false };
  if (/^\$2[aby]\$/.test(stored)) {
    return { ok: await bcrypt.compare(plain, stored.replace(/^\$2y\$/, '$2a$')) };
  }
  // Anciens comptes dont le mot de passe était enregistré en clair : on accepte puis on le hache
  return { ok: plain === stored, needsRehash: plain === stored };
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim();
    const motdepasse = String(req.body.motdepasse || '');
    if (!email || !motdepasse) {
      return res.status(400).json({ message: 'Veuillez remplir tous les champs.' });
    }

    const [rows] = await pool.query('SELECT * FROM compte WHERE email = ? LIMIT 1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'E-mail ou mot de passe incorrect.' });
    if (user.statut !== 1) return res.status(403).json({ message: 'Compte désactivé.' });

    const { ok, needsRehash } = await checkPassword(motdepasse, user.motdepasse);
    if (!ok) return res.status(401).json({ message: 'E-mail ou mot de passe incorrect.' });

    if (needsRehash) {
      const hash = await bcrypt.hash(motdepasse, 10);
      await pool.query('UPDATE compte SET motdepasse = ? WHERE id = ?', [hash, user.id]);
    }

    const { motdepasse: _omit, ...safeUser } = user;
    res.json({ token: signToken(user), user: safeUser });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register  (participant ou formateur — jamais admin)
router.post('/register', async (req, res, next) => {
  const b = req.body || {};
  const nom = String(b.nom || '').trim();
  const prenom = String(b.prenom || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const telephone = String(b.telephone || '').trim();
  const sexe = ['homme', 'femme'].includes(b.sexe) ? b.sexe : null;
  const dateNaissance = b.date_naissance || null;
  const role = b.role === 'formateur' ? 'formateur' : 'participant';
  const specialite = role === 'formateur' ? String(b.specialite || '').trim() : null;
  const motdepasse = String(b.motdepasse || '');

  const errors = [];
  if (!nom || !prenom) errors.push('Le nom et le prénom sont obligatoires.');
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.push("L'adresse e-mail n'est pas valide.");
  if (!/^[0-9]{8}$/.test(telephone)) errors.push('Le numéro de téléphone doit contenir exactement 8 chiffres.');
  if (dateNaissance && dateNaissance > '2010-12-31') errors.push('La date de naissance doit être antérieure ou égale au 31/12/2010.');
  if (motdepasse.length < 6) errors.push('Le mot de passe doit contenir au moins 6 caractères.');
  if (motdepasse !== String(b.confirm_motdepasse || '')) errors.push('Les mots de passe ne correspondent pas.');
  if (role === 'formateur' && !specialite) errors.push('Veuillez choisir une spécialité pour le formateur.');
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.query('SELECT id FROM compte WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ message: 'Cet e-mail existe déjà.' });

    const hash = await bcrypt.hash(motdepasse, 10);
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO compte (nom, prenom, date_naissance, sexe, telephone, photo, email, motdepasse, role, statut)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 1)`,
      [nom, prenom, dateNaissance, sexe, telephone, email, hash, role]
    );
    if (role === 'formateur') {
      await conn.query('INSERT INTO formateur (compte_id, specialite) VALUES (?, ?)', [result.insertId, specialite]);
    }
    await conn.commit();

    const [rows] = await conn.query(`SELECT ${PUBLIC_FIELDS} FROM compte WHERE id = ?`, [result.insertId]);
    res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// GET /api/auth/me  -> utilisateur connecté
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM compte WHERE id = ?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Compte introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
