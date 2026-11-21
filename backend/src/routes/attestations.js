const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { trouverAttestation, envoyerPdf } = require('../services/attestations');

const router = express.Router();

// GET /api/attestations/verifier/:code — PUBLIC (lien du QR code)
// Ne renvoie que ce qui est déjà imprimé sur l'attestation.
router.get('/verifier/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,100}$/.test(code)) return res.status(404).json({ valide: false, message: 'Attestation introuvable.' });
    const a = await trouverAttestation('a.code_unique = ?', [code]);
    if (!a) return res.status(404).json({ valide: false, message: 'Attestation introuvable.' });
    res.json({
      valide: true,
      code_unique: a.code_unique,
      type: a.type,
      beneficiaire: `${a.beneficiaire_prenom || ''} ${a.beneficiaire_nom || ''}`.trim(),
      formation: a.formation_titre,
      departement: a.departement,
      date_session: a.date_session,
      heure_debut: a.heure_debut,
      heure_fin: a.heure_fin,
      formateur: a.formateur_nom ? `${a.formateur_prenom} ${a.formateur_nom}` : null,
      date_generation: a.date_generation,
    });
  } catch (err) { next(err); }
});

router.use(requireAuth);

// GET /api/attestations/mes — attestations du compte connecté
router.get('/mes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.code_unique, a.type, a.date_generation,
              f.titre AS formation_titre, f.departement, s.date_session, s.heure_debut, s.heure_fin, s.salle
       FROM attestation a
       JOIN session_formation s ON s.id = a.session_id
       JOIN formation f ON f.id = s.formation_id
       WHERE a.compte_id = ?
       ORDER BY s.date_session DESC, a.id DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/attestations/:id/pdf — le bénéficiaire ou un admin
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const a = await trouverAttestation('a.id = ?', [Number(req.params.id) || 0]);
    if (!a || (a.compte_id !== req.user.id && req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Attestation introuvable.' });
    }
    await envoyerPdf(a, res);
  } catch (err) { next(err); }
});

module.exports = router;
