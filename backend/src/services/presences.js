const pool = require('../db');

// Participants d'une session : inscrits confirmés + membres des groupes liés à la session
async function participantsSession(sessionId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.nom, c.prenom, c.email,
            (SELECT g.nom_groupe FROM groupe_participants gp JOIN groupes g ON g.id = gp.groupe_id
              WHERE gp.participant_id = c.id
                AND (g.session_id = ? OR g.id IN (SELECT groupe_id FROM groupe_sessions WHERE session_id = ?))
              LIMIT 1) AS groupe,
            (SELECT g.id FROM groupe_participants gp JOIN groupes g ON g.id = gp.groupe_id
              WHERE gp.participant_id = c.id
                AND (g.session_id = ? OR g.id IN (SELECT groupe_id FROM groupe_sessions WHERE session_id = ?))
              LIMIT 1) AS groupe_id,
            p.statut_presence, p.remarque
     FROM compte c
     LEFT JOIN presences p ON p.participant_id = c.id AND p.session_id = ?
     WHERE c.id IN (
       SELECT participant_id FROM inscriptions WHERE session_id = ? AND statut_inscription = 'confirmee'
       UNION
       SELECT gp.participant_id FROM groupe_participants gp JOIN groupes g ON g.id = gp.groupe_id
       WHERE g.session_id = ? OR g.id IN (SELECT groupe_id FROM groupe_sessions WHERE session_id = ?)
     )
     ORDER BY groupe, c.nom, c.prenom`,
    Array(8).fill(sessionId)
  );
  return rows;
}

module.exports = { participantsSession };
