const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

// Messagerie participant <-> formateur.
// conversations.participant_id et conversations.formateur_id sont des compte.id.
const router = express.Router();
router.use(requireAuth, requireRole('participant', 'formateur'));

const MAX_LONGUEUR = 2000;

// Conversation dont l'utilisateur connecté fait partie (ou null)
async function maConversation(req, id) {
  const [[c]] = await pool.query(
    `SELECT c.id, c.participant_id, c.formateur_id,
            o.id AS autre_id, o.nom AS autre_nom, o.prenom AS autre_prenom, o.role AS autre_role
     FROM conversations c
     JOIN compte o ON o.id = IF(c.participant_id = ?, c.formateur_id, c.participant_id)
     WHERE c.id = ? AND (c.participant_id = ? OR c.formateur_id = ?)`,
    [req.user.id, id, req.user.id, req.user.id]
  );
  return c || null;
}

// GET /api/messages/non-lus — nombre de messages reçus non lus
router.get('/non-lus', async (req, res, next) => {
  try {
    const [[r]] = await pool.query(
      `SELECT COUNT(*) AS count FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.participant_id = ? OR c.formateur_id = ?) AND m.sender_id <> ? AND m.is_read = 0`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json({ count: Number(r.count) });
  } catch (err) { next(err); }
});

// GET /api/messages/contacts — participant : formateurs de ses sessions (inscription non refusée)
router.get('/contacts', requireRole('participant'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.nom, c.prenom, fo.specialite,
              GROUP_CONCAT(DISTINCT f.titre ORDER BY f.titre SEPARATOR ', ') AS formations
       FROM inscriptions i
       JOIN session_formation s ON s.id = i.session_id
       JOIN formation f ON f.id = s.formation_id
       JOIN formateur fo ON fo.id = s.formateur_id
       JOIN compte c ON c.id = fo.compte_id
       WHERE i.participant_id = ? AND i.statut_inscription <> 'refusee' AND c.statut = 1
       GROUP BY c.id, c.nom, c.prenom, fo.specialite
       ORDER BY c.nom, c.prenom`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/messages/conversations — mes conversations, la plus récente en premier
router.get('/conversations', async (req, res, next) => {
  try {
    const me = req.user.id;
    const [rows] = await pool.query(
      `SELECT c.id, o.id AS autre_id, o.nom AS autre_nom, o.prenom AS autre_prenom, o.role AS autre_role,
              (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS dernier_message,
              (SELECT m.file_path IS NOT NULL FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS dernier_fichier,
              COALESCE((SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id), c.created_at) AS derniere_activite,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.is_read = 0) AS non_lus
       FROM conversations c
       JOIN compte o ON o.id = IF(c.participant_id = ?, c.formateur_id, c.participant_id)
       WHERE c.participant_id = ? OR c.formateur_id = ?
       ORDER BY derniere_activite DESC, c.id DESC`,
      [me, me, me, me]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/messages/conversations { formateur_id } — participant : ouvrir (ou retrouver) une conversation
router.post('/conversations', requireRole('participant'), async (req, res, next) => {
  try {
    const formateurId = Number(req.body.formateur_id) || 0;
    const [[existante]] = await pool.query(
      'SELECT id FROM conversations WHERE participant_id = ? AND formateur_id = ? ORDER BY id LIMIT 1',
      [req.user.id, formateurId]
    );
    if (existante) return res.json({ id: existante.id });

    // Seulement un formateur d'une session à laquelle le participant est inscrit
    const [[autorise]] = await pool.query(
      `SELECT c.id FROM inscriptions i
       JOIN session_formation s ON s.id = i.session_id
       JOIN formateur fo ON fo.id = s.formateur_id
       JOIN compte c ON c.id = fo.compte_id
       WHERE i.participant_id = ? AND i.statut_inscription <> 'refusee' AND c.id = ? AND c.statut = 1 LIMIT 1`,
      [req.user.id, formateurId]
    );
    if (!autorise) {
      return res.status(403).json({ message: 'Vous pouvez contacter uniquement les formateurs de vos sessions.' });
    }
    const [r] = await pool.query(
      'INSERT INTO conversations (participant_id, formateur_id) VALUES (?, ?)', [req.user.id, formateurId]
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

// GET /api/messages/conversations/:id/messages?after=<id> — et marque comme lus les messages reçus
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const c = await maConversation(req, Number(req.params.id) || 0);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable.' });
    const after = Number(req.query.after) || 0;

    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id <> ? AND is_read = 0', [c.id, req.user.id]
    );
    const [messages] = await pool.query(
      `SELECT id, sender_id, sender_role, message, (file_path IS NOT NULL) AS a_fichier, is_read, created_at
       FROM messages WHERE conversation_id = ? AND id > ? ORDER BY id`,
      [c.id, after]
    );
    res.json({
      conversation: { id: c.id, autre: { id: c.autre_id, nom: c.autre_nom, prenom: c.autre_prenom, role: c.autre_role } },
      messages,
    });
  } catch (err) { next(err); }
});

// POST /api/messages/conversations/:id/messages { message }
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const c = await maConversation(req, Number(req.params.id) || 0);
    if (!c) return res.status(404).json({ message: 'Conversation introuvable.' });
    const texte = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!texte) return res.status(400).json({ message: 'Le message est vide.' });
    if (texte.length > MAX_LONGUEUR) {
      return res.status(400).json({ message: `Le message dépasse ${MAX_LONGUEUR} caractères.` });
    }
    const [r] = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)',
      [c.id, req.user.id, req.user.role, texte]
    );
    const [[m]] = await pool.query(
      'SELECT id, sender_id, sender_role, message, 0 AS a_fichier, is_read, created_at FROM messages WHERE id = ?',
      [r.insertId]
    );
    res.status(201).json(m);
  } catch (err) { next(err); }
});

module.exports = router;
