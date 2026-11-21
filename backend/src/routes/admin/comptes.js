const express = require('express');
const pool = require('../../db');

const router = express.Router();

// GET /api/admin/comptes?role=&q=
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (['admin', 'formateur', 'participant'].includes(req.query.role)) {
      where.push('c.role = ?');
      params.push(req.query.role);
    }
    if (req.query.q) {
      where.push('(c.nom LIKE ? OR c.prenom LIKE ? OR c.email LIKE ?)');
      params.push(...Array(3).fill(`%${req.query.q}%`));
    }
    const [rows] = await pool.query(
      `SELECT c.id, c.nom, c.prenom, c.email, c.telephone, c.role, c.statut, c.created_at,
              (SELECT COUNT(*) FROM inscriptions i WHERE i.participant_id = c.id) AS nb_inscriptions
       FROM compte c
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY c.role, c.nom, c.prenom`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// PATCH /api/admin/comptes/:id/statut  { statut: 0 | 1 }
router.patch('/:id/statut', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const statut = req.body?.statut ? 1 : 0;
    if (id === req.user.id && statut === 0) {
      return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
    }
    const [r] = await pool.query('UPDATE compte SET statut = ? WHERE id = ?', [statut, id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Compte introuvable.' });
    res.json({ message: statut ? 'Compte activé.' : 'Compte désactivé.' });
  } catch (err) { next(err); }
});

module.exports = router;
