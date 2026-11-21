const express = require('express');
const pool = require('../../db');
const { genererCode, urlVerification } = require('../../services/attestations');

const router = express.Router();

// Un participant reçoit son attestation si son inscription est confirmée
// et son paiement réglé (totalement ou avance), comme dans l'ancien site.
const ELIGIBLE = `i.statut_inscription = 'confirmee' AND i.statut_paiement IN ('paye','avance_payee')`;

// GET /api/admin/attestations/sessions — sessions terminées (non annulées)
router.get('/sessions', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, s.statut,
              f.titre, f.departement, c.nom AS formateur_nom, c.prenom AS formateur_prenom,
              (SELECT COUNT(*) FROM inscriptions i WHERE i.session_id = s.id AND ${ELIGIBLE}) AS eligibles,
              (SELECT COUNT(*) FROM attestation a WHERE a.session_id = s.id AND a.type = 'participant') AS att_participants,
              (SELECT COUNT(*) FROM attestation a WHERE a.session_id = s.id AND a.type = 'formateur') AS att_formateur
       FROM session_formation s
       JOIN formation f ON f.id = s.formation_id
       LEFT JOIN formateur fo ON fo.id = s.formateur_id
       LEFT JOIN compte c ON c.id = fo.compte_id
       WHERE TIMESTAMP(s.date_session, s.heure_fin) < NOW() AND s.statut <> 'Annulée'
       ORDER BY s.date_session DESC, s.heure_debut DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/admin/attestations/sessions/:id/generer — crée les attestations manquantes
router.post('/sessions/:id/generer', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id) || 0;
    const [[s]] = await conn.query(
      `SELECT s.id, s.statut, fo.compte_id AS formateur_compte,
              TIMESTAMP(s.date_session, s.heure_fin) < NOW() AS terminee
       FROM session_formation s LEFT JOIN formateur fo ON fo.id = s.formateur_id WHERE s.id = ?`,
      [id]
    );
    if (!s) return res.status(404).json({ message: 'Session introuvable.' });
    if (!s.terminee || s.statut === 'Annulée') {
      return res.status(409).json({ message: 'Les attestations ne sont générées que pour une session terminée et non annulée.' });
    }

    const [participants] = await conn.query(
      `SELECT i.participant_id AS compte_id FROM inscriptions i WHERE i.session_id = ? AND ${ELIGIBLE}`, [id]
    );
    const beneficiaires = participants.map((p) => [p.compte_id, 'participant']);
    if (s.formateur_compte) beneficiaires.push([s.formateur_compte, 'formateur']);

    await conn.beginTransaction();
    let creees = 0;
    for (const [compteId, type] of beneficiaires) {
      const [[existe]] = await conn.query(
        'SELECT id FROM attestation WHERE compte_id = ? AND session_id = ? AND type = ?', [compteId, id, type]
      );
      if (existe) continue;
      const code = genererCode();
      await conn.query(
        'INSERT INTO attestation (code_unique, compte_id, session_id, type, qr_code) VALUES (?, ?, ?, ?, ?)',
        [code, compteId, id, type, urlVerification(code)]
      );
      creees++;
    }
    await conn.commit();

    let message = `${creees} attestation(s) générée(s).`;
    if (!creees) {
      message = beneficiaires.length
        ? 'Toutes les attestations de cette session existent déjà.'
        : 'Aucun bénéficiaire : aucune inscription confirmée et payée, et pas de formateur.';
    }
    res.json({ creees, participants: participants.length, message });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// GET /api/admin/attestations?session_id= — attestations générées
router.get('/', async (req, res, next) => {
  try {
    const params = [];
    let where = '1=1';
    if (req.query.session_id) { where = 'a.session_id = ?'; params.push(Number(req.query.session_id) || 0); }
    const [rows] = await pool.query(
      `SELECT a.id, a.code_unique, a.type, a.date_generation, a.session_id,
              c.nom, c.prenom, c.email, f.titre AS formation_titre, s.date_session
       FROM attestation a
       JOIN compte c ON c.id = a.compte_id
       JOIN session_formation s ON s.id = a.session_id
       JOIN formation f ON f.id = s.formation_id
       WHERE ${where}
       ORDER BY s.date_session DESC, a.type DESC, c.nom`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// DELETE /api/admin/attestations/:id — révoquer (le code ne sera plus valide)
router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM attestation WHERE id = ?', [Number(req.params.id) || 0]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Attestation introuvable.' });
    res.json({ message: 'Attestation révoquée.' });
  } catch (err) { next(err); }
});

module.exports = router;
