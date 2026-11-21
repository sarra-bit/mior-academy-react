const express = require('express');
const pool = require('../../db');

const router = express.Router();

// GET /api/admin/groupes?session_id=  -> groupes d'une session + participants
router.get('/', async (req, res, next) => {
  try {
    const sessionId = Number(req.query.session_id);
    if (!sessionId) return res.status(400).json({ message: 'session_id manquant.' });

    const [[session]] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, f.titre
       FROM session_formation s JOIN formation f ON f.id = s.formation_id WHERE s.id = ?`,
      [sessionId]
    );
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });

    const [groupes] = await pool.query('SELECT * FROM groupes WHERE session_id = ? ORDER BY nom_groupe', [sessionId]);
    const [membres] = await pool.query(
      `SELECT gp.groupe_id, c.id, c.nom, c.prenom, c.email
       FROM groupe_participants gp
       JOIN groupes g ON g.id = gp.groupe_id
       JOIN compte c ON c.id = gp.participant_id
       WHERE g.session_id = ? ORDER BY c.nom`,
      [sessionId]
    );
    // Participants confirmés de la session qui ne sont encore dans aucun groupe de cette session
    const [disponibles] = await pool.query(
      `SELECT c.id, c.nom, c.prenom, c.email
       FROM inscriptions i JOIN compte c ON c.id = i.participant_id
       WHERE i.session_id = ? AND i.statut_inscription = 'confirmee'
         AND c.id NOT IN (SELECT gp.participant_id FROM groupe_participants gp
                          JOIN groupes g ON g.id = gp.groupe_id WHERE g.session_id = ?)
       ORDER BY c.nom`,
      [sessionId, sessionId]
    );

    res.json({
      session,
      groupes: groupes.map((g) => ({ ...g, participants: membres.filter((m) => m.groupe_id === g.id) })),
      disponibles,
    });
  } catch (err) { next(err); }
});

// POST /api/admin/groupes  { session_id, nom_groupe, description }
router.post('/', async (req, res, next) => {
  try {
    const sessionId = Number(req.body?.session_id);
    const nom = String(req.body?.nom_groupe || '').trim();
    if (!nom) return res.status(400).json({ message: 'Le nom du groupe est obligatoire.' });
    const [[s]] = await pool.query('SELECT id FROM session_formation WHERE id = ?', [sessionId]);
    if (!s) return res.status(404).json({ message: 'Session introuvable.' });
    const [r] = await pool.query('INSERT INTO groupes (session_id, nom_groupe, description) VALUES (?, ?, ?)',
      [sessionId, nom, String(req.body?.description || '').trim() || null]);
    res.status(201).json({ id: r.insertId, message: 'Groupe créé.' });
  } catch (err) { next(err); }
});

// PUT /api/admin/groupes/:id
router.put('/:id', async (req, res, next) => {
  try {
    const nom = String(req.body?.nom_groupe || '').trim();
    if (!nom) return res.status(400).json({ message: 'Le nom du groupe est obligatoire.' });
    const [r] = await pool.query('UPDATE groupes SET nom_groupe = ?, description = ? WHERE id = ?',
      [nom, String(req.body?.description || '').trim() || null, Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Groupe introuvable.' });
    res.json({ message: 'Groupe modifié.' });
  } catch (err) { next(err); }
});

// DELETE /api/admin/groupes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM groupes WHERE id = ?', [Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Groupe introuvable.' });
    res.json({ message: 'Groupe supprimé.' });
  } catch (err) { next(err); }
});

// POST /api/admin/groupes/:id/participants  { participant_id }
router.post('/:id/participants', async (req, res, next) => {
  try {
    const groupeId = Number(req.params.id);
    const participantId = Number(req.body?.participant_id);
    const [[g]] = await pool.query('SELECT session_id FROM groupes WHERE id = ?', [groupeId]);
    if (!g) return res.status(404).json({ message: 'Groupe introuvable.' });

    const [insc] = await pool.query(
      "SELECT id FROM inscriptions WHERE participant_id = ? AND session_id = ? AND statut_inscription = 'confirmee'",
      [participantId, g.session_id]
    );
    if (!insc.length) return res.status(400).json({ message: "Ce participant n'a pas d'inscription confirmée à cette session." });

    const [deja] = await pool.query(
      `SELECT gp.id FROM groupe_participants gp JOIN groupes gr ON gr.id = gp.groupe_id
       WHERE gp.participant_id = ? AND gr.session_id = ?`,
      [participantId, g.session_id]
    );
    if (deja.length) return res.status(409).json({ message: 'Ce participant est déjà dans un groupe de cette session.' });

    await pool.query('INSERT INTO groupe_participants (groupe_id, participant_id) VALUES (?, ?)', [groupeId, participantId]);
    res.status(201).json({ message: 'Participant ajouté au groupe.' });
  } catch (err) { next(err); }
});

// DELETE /api/admin/groupes/:id/participants/:participantId
router.delete('/:id/participants/:participantId', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM groupe_participants WHERE groupe_id = ? AND participant_id = ?',
      [Number(req.params.id), Number(req.params.participantId)]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Participant absent de ce groupe.' });
    res.json({ message: 'Participant retiré du groupe.' });
  } catch (err) { next(err); }
});

module.exports = router;
