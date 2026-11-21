const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// Alertes d'absence du participant connecté (créées lors de l'appel par le formateur)
const router = express.Router();
router.use(requireAuth, requireRole('participant'));

// GET /api/alertes
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, message, date_alerte, statut FROM alertes_absence WHERE participant_id = ? ORDER BY date_alerte DESC, id DESC',
      [req.user.id]
    );
    res.json({ alertes: rows, non_lues: rows.filter((a) => a.statut === 'non_lue').length });
  } catch (err) { next(err); }
});

// PATCH /api/alertes/lire-tout
router.patch('/lire-tout', async (req, res, next) => {
  try {
    await pool.query("UPDATE alertes_absence SET statut = 'lue' WHERE participant_id = ?", [req.user.id]);
    res.json({ message: 'Toutes les alertes sont marquées comme lues.' });
  } catch (err) { next(err); }
});

// PATCH /api/alertes/:id/lue
router.patch('/:id/lue', async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "UPDATE alertes_absence SET statut = 'lue' WHERE id = ? AND participant_id = ?",
      [Number(req.params.id) || 0, req.user.id]
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Alerte introuvable.' });
    res.json({ message: 'Alerte marquée comme lue.' });
  } catch (err) { next(err); }
});

module.exports = router;
