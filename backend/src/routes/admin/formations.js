const express = require('express');
const pool = require('../../db');

const router = express.Router();

function lireFormation(b) {
  const f = {
    titre: String(b.titre || '').trim(),
    description: String(b.description || '').trim() || null,
    duree: b.duree === '' || b.duree == null ? null : Number(b.duree),
    prix: Number(b.prix),
    competences: String(b.competences || '').trim() || null,
    prerequis: String(b.prerequis || '').trim() || null,
    departement: String(b.departement || '').trim(),
    categorie: String(b.categorie || '').trim() || null,
    type_paiement: b.type_paiement === 'avance' ? 'avance' : 'complet',
    montant_avance: b.montant_avance === '' || b.montant_avance == null ? null : Number(b.montant_avance),
    nb_places: Number(b.nb_places) || 20,
  };
  const errors = [];
  if (!f.titre) errors.push('Le titre est obligatoire.');
  if (!f.departement) errors.push('Le département est obligatoire.');
  if (!(f.prix >= 0)) errors.push('Le prix doit être un nombre positif.');
  if (f.duree != null && !(f.duree > 0)) errors.push('La durée doit être un nombre d’heures positif.');
  if (!(f.nb_places > 0)) errors.push('Le nombre de places doit être positif.');
  if (f.type_paiement === 'avance' && !(f.montant_avance > 0 && f.montant_avance < f.prix)) {
    errors.push("L'avance doit être supérieure à 0 et inférieure au prix.");
  }
  if (f.type_paiement === 'complet') f.montant_avance = null;
  return { f, errors };
}

// GET /api/admin/formations
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*,
              (SELECT COUNT(*) FROM session_formation s WHERE s.formation_id = f.id) AS nb_sessions,
              (SELECT COUNT(*) FROM formateur_formation ff WHERE ff.formation_id = f.id) AS nb_formateurs
       FROM formation f ORDER BY f.departement, f.categorie, f.titre`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/admin/formations
router.post('/', async (req, res, next) => {
  const { f, errors } = lireFormation(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const [r] = await pool.query('INSERT INTO formation SET ?', [f]);
    res.status(201).json({ id: r.insertId, ...f });
  } catch (err) { next(err); }
});

// PUT /api/admin/formations/:id
router.put('/:id', async (req, res, next) => {
  const { f, errors } = lireFormation(req.body || {});
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const [r] = await pool.query('UPDATE formation SET ? WHERE id = ?', [f, Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json({ id: Number(req.params.id), ...f });
  } catch (err) { next(err); }
});

// DELETE /api/admin/formations/:id  (refusé si des sessions existent, pour ne pas perdre d'inscriptions)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM session_formation WHERE formation_id = ?', [id]);
    if (n > 0) {
      return res.status(409).json({ message: `Impossible : cette formation a ${n} session(s). Supprimez d’abord ses sessions.` });
    }
    const [r] = await pool.query('DELETE FROM formation WHERE id = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Formation introuvable.' });
    res.json({ message: 'Formation supprimée.' });
  } catch (err) { next(err); }
});

module.exports = router;
