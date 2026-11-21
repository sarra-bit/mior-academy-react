const express = require('express');
const pool = require('../../db');
const { participantsSession } = require('../../services/presences');

// Suivi des présences (lecture seule pour l'administration)
const router = express.Router();

// GET /api/admin/presences/sessions — sessions commencées (non annulées) avec leurs compteurs
router.get('/sessions', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, f.titre, f.departement,
              c.nom AS formateur_nom, c.prenom AS formateur_prenom,
              SUM(p.statut_presence = 'present') AS presents,
              SUM(p.statut_presence = 'retard') AS retards,
              SUM(p.statut_presence = 'absent') AS absents,
              SUM(p.statut_presence = 'excuse') AS excuses,
              COUNT(p.id) AS saisies
       FROM session_formation s
       JOIN formation f ON f.id = s.formation_id
       LEFT JOIN formateur fo ON fo.id = s.formateur_id
       LEFT JOIN compte c ON c.id = fo.compte_id
       LEFT JOIN presences p ON p.session_id = s.id
       WHERE TIMESTAMP(s.date_session, s.heure_debut) <= NOW() AND s.statut <> 'Annulée'
       GROUP BY s.id
       ORDER BY s.date_session DESC, s.heure_debut DESC`
    );
    res.json(rows.map((r) => ({
      ...r,
      presents: Number(r.presents || 0), retards: Number(r.retards || 0),
      absents: Number(r.absents || 0), excuses: Number(r.excuses || 0), saisies: Number(r.saisies),
    })));
  } catch (err) { next(err); }
});

// GET /api/admin/presences/sessions/:id — détail : participants, statut, total d'absences
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id) || 0;
    const [[session]] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, s.statut, f.titre,
              c.nom AS formateur_nom, c.prenom AS formateur_prenom
       FROM session_formation s JOIN formation f ON f.id = s.formation_id
       LEFT JOIN formateur fo ON fo.id = s.formateur_id LEFT JOIN compte c ON c.id = fo.compte_id
       WHERE s.id = ?`,
      [id]
    );
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });

    const participants = await participantsSession(id);
    // Personnes marquées dans l'appel mais qui ne sont plus inscrites / dans un groupe
    const [autres] = await pool.query(
      `SELECT c.id, c.nom, c.prenom, c.email, NULL AS groupe, NULL AS groupe_id, p.statut_presence, p.remarque
       FROM presences p JOIN compte c ON c.id = p.participant_id WHERE p.session_id = ?`,
      [id]
    );
    const ids = new Set(participants.map((p) => p.id));
    const liste = [...participants, ...autres.filter((a) => !ids.has(a.id))];

    const [absences] = liste.length
      ? await pool.query(
        `SELECT participant_id, COUNT(*) AS n FROM presences
         WHERE statut_presence = 'absent' AND participant_id IN (?) GROUP BY participant_id`,
        [liste.map((p) => p.id)]
      )
      : [[]];
    const totalAbs = new Map(absences.map((a) => [a.participant_id, Number(a.n)]));

    res.json({ session, participants: liste.map((p) => ({ ...p, absences_total: totalAbs.get(p.id) || 0 })) });
  } catch (err) { next(err); }
});

// GET /api/admin/presences/alertes — toutes les alertes d'absence
router.get('/alertes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.message, a.date_alerte, a.statut, c.id AS participant_id, c.nom, c.prenom, c.email, c.telephone
       FROM alertes_absence a JOIN compte c ON c.id = a.participant_id
       ORDER BY a.date_alerte DESC, a.id DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
