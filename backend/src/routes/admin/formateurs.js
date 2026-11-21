const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../../db');

const router = express.Router();

function lireInfos(b, { creation }) {
  const d = {
    nom: String(b.nom || '').trim(),
    prenom: String(b.prenom || '').trim(),
    email: String(b.email || '').trim().toLowerCase(),
    telephone: String(b.telephone || '').trim(),
    sexe: ['homme', 'femme'].includes(b.sexe) ? b.sexe : null,
    specialite: String(b.specialite || '').trim(),
    motdepasse: String(b.motdepasse || ''),
  };
  const errors = [];
  if (!d.nom || !d.prenom) errors.push('Le nom et le prénom sont obligatoires.');
  if (!/^\S+@\S+\.\S+$/.test(d.email)) errors.push("L'adresse e-mail n'est pas valide.");
  if (!/^[0-9]{8}$/.test(d.telephone)) errors.push('Le téléphone doit contenir 8 chiffres.');
  if (!d.specialite) errors.push('La spécialité est obligatoire.');
  if (creation && d.motdepasse.length < 6) errors.push('Le mot de passe doit contenir au moins 6 caractères.');
  if (!creation && d.motdepasse && d.motdepasse.length < 6) errors.push('Le nouveau mot de passe doit contenir au moins 6 caractères.');
  return { d, errors };
}

// GET /api/admin/formateurs
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT fo.id, fo.compte_id, fo.specialite, c.nom, c.prenom, c.email, c.telephone, c.sexe, c.statut,
              (SELECT COUNT(*) FROM formateur_formation ff WHERE ff.formateur_id = fo.id) AS nb_formations,
              (SELECT COUNT(*) FROM session_formation s WHERE s.formateur_id = fo.id AND s.date_session >= CURDATE()) AS sessions_a_venir,
              (SELECT GROUP_CONCAT(ff.formation_id) FROM formateur_formation ff WHERE ff.formateur_id = fo.id) AS formation_ids
       FROM formateur fo JOIN compte c ON c.id = fo.compte_id
       ORDER BY c.nom, c.prenom`
    );
    res.json(rows.map((r) => ({ ...r, formation_ids: r.formation_ids ? r.formation_ids.split(',').map(Number) : [] })));
  } catch (err) { next(err); }
});

// POST /api/admin/formateurs -> crée le compte + la fiche formateur
router.post('/', async (req, res, next) => {
  const { d, errors } = lireInfos(req.body || {}, { creation: true });
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.query('SELECT id FROM compte WHERE email = ?', [d.email]);
    if (exists.length) return res.status(409).json({ message: 'Cet e-mail existe déjà.' });
    await conn.beginTransaction();
    const [c] = await conn.query(
      `INSERT INTO compte (nom, prenom, email, telephone, sexe, motdepasse, role, statut)
       VALUES (?, ?, ?, ?, ?, ?, 'formateur', 1)`,
      [d.nom, d.prenom, d.email, d.telephone, d.sexe, await bcrypt.hash(d.motdepasse, 10)]
    );
    const [f] = await conn.query('INSERT INTO formateur (compte_id, specialite) VALUES (?, ?)', [c.insertId, d.specialite]);
    await conn.commit();
    res.status(201).json({ id: f.insertId });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// PUT /api/admin/formateurs/:id -> modifier (mot de passe optionnel)
router.put('/:id', async (req, res, next) => {
  const { d, errors } = lireInfos(req.body || {}, { creation: false });
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const [[fo]] = await pool.query('SELECT compte_id FROM formateur WHERE id = ?', [Number(req.params.id)]);
    if (!fo) return res.status(404).json({ message: 'Formateur introuvable.' });
    const [taken] = await pool.query('SELECT id FROM compte WHERE email = ? AND id <> ?', [d.email, fo.compte_id]);
    if (taken.length) return res.status(409).json({ message: 'Cet e-mail est déjà utilisé.' });

    await pool.query('UPDATE compte SET nom = ?, prenom = ?, email = ?, telephone = ?, sexe = ? WHERE id = ?',
      [d.nom, d.prenom, d.email, d.telephone, d.sexe, fo.compte_id]);
    if (d.motdepasse) {
      await pool.query('UPDATE compte SET motdepasse = ? WHERE id = ?', [await bcrypt.hash(d.motdepasse, 10), fo.compte_id]);
    }
    await pool.query('UPDATE formateur SET specialite = ? WHERE id = ?', [d.specialite, Number(req.params.id)]);
    res.json({ message: 'Formateur modifié.' });
  } catch (err) { next(err); }
});

// PUT /api/admin/formateurs/:id/formations -> remplace la liste des formations affectées
router.put('/:id/formations', async (req, res, next) => {
  const id = Number(req.params.id);
  const ids = [...new Set((req.body?.formation_ids || []).map(Number).filter(Boolean))];
  const conn = await pool.getConnection();
  try {
    const [[fo]] = await conn.query('SELECT id FROM formateur WHERE id = ?', [id]);
    if (!fo) return res.status(404).json({ message: 'Formateur introuvable.' });
    await conn.beginTransaction();
    await conn.query('DELETE FROM formateur_formation WHERE formateur_id = ?', [id]);
    if (ids.length) {
      await conn.query('INSERT INTO formateur_formation (formateur_id, formation_id) VALUES ?', [ids.map((f) => [id, f])]);
    }
    await conn.commit();
    res.json({ message: `${ids.length} formation(s) affectée(s).` });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// DELETE /api/admin/formateurs/:id -> supprime le compte (ses sessions passent "sans formateur")
router.delete('/:id', async (req, res, next) => {
  try {
    const [[fo]] = await pool.query('SELECT compte_id FROM formateur WHERE id = ?', [Number(req.params.id)]);
    if (!fo) return res.status(404).json({ message: 'Formateur introuvable.' });
    await pool.query('DELETE FROM compte WHERE id = ?', [fo.compte_id]);
    res.json({ message: 'Formateur supprimé.' });
  } catch (err) { next(err); }
});

module.exports = router;
