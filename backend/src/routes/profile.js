const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function loadProfile(id) {
  const [[p]] = await pool.query(
    `SELECT c.id, c.nom, c.prenom, c.email, c.telephone, c.sexe, c.date_naissance, c.photo, c.role,
            c.created_at, fo.specialite
     FROM compte c LEFT JOIN formateur fo ON fo.compte_id = c.id
     WHERE c.id = ?`,
    [id]
  );
  return p;
}

// GET /api/profile
router.get('/', async (req, res, next) => {
  try {
    const p = await loadProfile(req.user.id);
    if (!p) return res.status(404).json({ message: 'Compte introuvable.' });
    res.json(p);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile -> modifier ses informations personnelles
router.put('/', async (req, res, next) => {
  const b = req.body || {};
  const nom = String(b.nom || '').trim();
  const prenom = String(b.prenom || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const telephone = String(b.telephone || '').trim();
  const sexe = ['homme', 'femme'].includes(b.sexe) ? b.sexe : null;
  const dateNaissance = b.date_naissance || null;

  const errors = [];
  if (!nom || !prenom) errors.push('Le nom et le prénom sont obligatoires.');
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.push("L'adresse e-mail n'est pas valide.");
  if (!/^[0-9]{8}$/.test(telephone)) errors.push('Le numéro de téléphone doit contenir exactement 8 chiffres.');
  if (dateNaissance && dateNaissance > '2010-12-31') errors.push('La date de naissance doit être antérieure ou égale au 31/12/2010.');
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  try {
    const [taken] = await pool.query('SELECT id FROM compte WHERE email = ? AND id <> ?', [email, req.user.id]);
    if (taken.length) return res.status(409).json({ message: 'Cet e-mail est déjà utilisé par un autre compte.' });

    await pool.query(
      'UPDATE compte SET nom = ?, prenom = ?, email = ?, telephone = ?, sexe = ?, date_naissance = ? WHERE id = ?',
      [nom, prenom, email, telephone, sexe, dateNaissance, req.user.id]
    );
    if (req.user.role === 'formateur' && typeof b.specialite === 'string' && b.specialite.trim()) {
      await pool.query('UPDATE formateur SET specialite = ? WHERE compte_id = ?', [b.specialite.trim(), req.user.id]);
    }
    res.json(await loadProfile(req.user.id));
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile/password -> changer son mot de passe
router.put('/password', async (req, res, next) => {
  const actuel = String(req.body?.actuel || '');
  const nouveau = String(req.body?.nouveau || '');
  const confirmation = String(req.body?.confirmation || '');

  if (nouveau.length < 6) return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
  if (nouveau !== confirmation) return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });

  try {
    const [[row]] = await pool.query('SELECT motdepasse FROM compte WHERE id = ?', [req.user.id]);
    const stored = row?.motdepasse || '';
    const ok = /^\$2[aby]\$/.test(stored)
      ? await bcrypt.compare(actuel, stored.replace(/^\$2y\$/, '$2a$'))
      : actuel === stored;
    if (!ok) return res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });

    await pool.query('UPDATE compte SET motdepasse = ? WHERE id = ?', [await bcrypt.hash(nouveau, 10), req.user.id]);
    res.json({ message: 'Mot de passe modifié.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
