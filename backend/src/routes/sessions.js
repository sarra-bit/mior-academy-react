const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/sessions/disponibles -> sessions planifiées à venir avec des places libres
router.get('/disponibles', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, s.statut,
              s.nb_places, s.nb_places_restantes,
              f.id AS formation_id, f.titre, f.prix, f.duree, f.departement, f.categorie,
              f.type_paiement, f.montant_avance,
              c.nom AS formateur_nom, c.prenom AS formateur_prenom
       FROM session_formation s
       JOIN formation f ON f.id = s.formation_id
       LEFT JOIN formateur fo ON fo.id = s.formateur_id
       LEFT JOIN compte c ON c.id = fo.compte_id
       WHERE s.date_session >= CURDATE() AND s.statut = 'Planifiée' AND s.nb_places_restantes > 0
       ORDER BY s.date_session, s.heure_debut`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id -> une session avec sa formation (page d'inscription)
router.get('/:id', async (req, res, next) => {
  try {
    const [[session]] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, s.statut,
              s.nb_places, s.nb_places_restantes, (s.date_session >= CURDATE()) AS a_venir,
              f.id AS formation_id, f.titre, f.description, f.prix, f.duree, f.departement, f.categorie,
              f.type_paiement, f.montant_avance,
              c.nom AS formateur_nom, c.prenom AS formateur_prenom
       FROM session_formation s
       JOIN formation f ON f.id = s.formation_id
       LEFT JOIN formateur fo ON fo.id = s.formateur_id
       LEFT JOIN compte c ON c.id = fo.compte_id
       WHERE s.id = ?`,
      [Number(req.params.id)]
    );
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });
    res.json({ ...session, a_venir: Boolean(session.a_venir) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
