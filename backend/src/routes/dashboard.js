const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function count(sql, params = []) {
  const [[row]] = await pool.query(sql, params);
  return Number(Object.values(row)[0]) || 0;
}

// GET /api/dashboard -> statistiques adaptées au rôle de l'utilisateur connecté
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { id, role } = req.user;

    if (role === 'admin') {
      const [prochaines] = await pool.query(
        `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, f.titre
         FROM session_formation s JOIN formation f ON f.id = s.formation_id
         WHERE s.date_session >= CURDATE() ORDER BY s.date_session LIMIT 5`
      );
      return res.json({
        role,
        stats: [
          { label: 'Participants', value: await count("SELECT COUNT(*) FROM compte WHERE role = 'participant'") },
          { label: 'Formateurs', value: await count("SELECT COUNT(*) FROM compte WHERE role = 'formateur'") },
          { label: 'Formations', value: await count('SELECT COUNT(*) FROM formation') },
          { label: 'Sessions à venir', value: await count("SELECT COUNT(*) FROM session_formation WHERE date_session >= CURDATE() AND statut = 'Planifiée'") },
          { label: 'Inscriptions en attente', value: await count("SELECT COUNT(*) FROM inscriptions WHERE statut_inscription = 'en_attente'") },
          { label: 'Paiements à valider', value: await count("SELECT COUNT(*) FROM inscriptions WHERE statut_paiement = 'en_attente'") },
        ],
        sessions: prochaines,
      });
    }

    if (role === 'formateur') {
      const [[fo]] = await pool.query('SELECT id FROM formateur WHERE compte_id = ?', [id]);
      const formateurId = fo ? fo.id : 0;
      const [prochaines] = await pool.query(
        `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, f.titre
         FROM session_formation s JOIN formation f ON f.id = s.formation_id
         WHERE s.formateur_id = ? AND s.date_session >= CURDATE()
         ORDER BY s.date_session LIMIT 5`,
        [formateurId]
      );
      return res.json({
        role,
        stats: [
          { label: 'Mes formations', value: await count('SELECT COUNT(*) FROM formateur_formation WHERE formateur_id = ?', [formateurId]) },
          { label: 'Sessions à venir', value: await count('SELECT COUNT(*) FROM session_formation WHERE formateur_id = ? AND date_session >= CURDATE()', [formateurId]) },
          { label: 'Sessions totales', value: await count('SELECT COUNT(*) FROM session_formation WHERE formateur_id = ?', [formateurId]) },
          { label: 'Messages non lus', value: await count(
            `SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id
             WHERE c.formateur_id = ? AND m.sender_role = 'participant' AND m.is_read = 0`, [id]) },
        ],
        sessions: prochaines,
      });
    }

    // participant
    const [prochaines] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, f.titre, i.statut_inscription
       FROM inscriptions i
       JOIN session_formation s ON s.id = i.session_id
       JOIN formation f ON f.id = s.formation_id
       WHERE i.participant_id = ? AND s.date_session >= CURDATE()
       ORDER BY s.date_session LIMIT 5`,
      [id]
    );
    return res.json({
      role,
      stats: [
        { label: 'Mes inscriptions', value: await count('SELECT COUNT(*) FROM inscriptions WHERE participant_id = ?', [id]) },
        { label: 'Inscriptions confirmées', value: await count("SELECT COUNT(*) FROM inscriptions WHERE participant_id = ? AND statut_inscription = 'confirmee'", [id]) },
        { label: 'Attestations', value: await count("SELECT COUNT(*) FROM attestation WHERE compte_id = ? AND type = 'participant'", [id]) },
        { label: "Alertes d'absence", value: await count("SELECT COUNT(*) FROM alertes_absence WHERE participant_id = ? AND statut = 'non_lue'", [id]) },
      ],
      sessions: prochaines,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
