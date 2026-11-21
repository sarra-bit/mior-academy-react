const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('participant'));

// Modes acceptés. Le paiement par carte est une SIMULATION (projet pédagogique) :
// le formulaire de carte reste dans le navigateur, aucune donnée de carte n'arrive ici.
const MODES = {
  carte: 'Carte bancaire (simulation)',
  virement: 'Virement bancaire',
  especes: 'Espèces au centre',
  cheque: 'Chèque',
};

// GET /api/inscriptions/mes -> inscriptions du participant connecté
router.get('/mes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.session_id, i.date_inscription, i.statut_inscription, i.statut_paiement,
              i.mode_paiement, i.reference_paiement, i.montant_a_payer, i.montant_paye,
              s.date_session, s.heure_debut, s.heure_fin, s.salle, s.statut AS statut_session,
              f.id AS formation_id, f.titre, f.prix, f.departement, f.categorie,
              c.nom AS formateur_nom, c.prenom AS formateur_prenom
       FROM inscriptions i
       JOIN session_formation s ON s.id = i.session_id
       JOIN formation f ON f.id = s.formation_id
       LEFT JOIN formateur fo ON fo.id = s.formateur_id
       LEFT JOIN compte c ON c.id = fo.compte_id
       WHERE i.participant_id = ?
       ORDER BY s.date_session DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/inscriptions -> s'inscrire à une session et déclarer le paiement
router.post('/', async (req, res, next) => {
  const b = req.body || {};
  const sessionId = Number(b.session_id);
  const choix = b.choix_paiement === 'avance' ? 'avance' : 'totalite';
  const mode = String(b.mode_paiement || '');
  const payeur = {
    nom: String(b.nom_payeur || '').trim(),
    prenom: String(b.prenom_payeur || '').trim(),
    email: String(b.email_payeur || '').trim(),
    telephone: String(b.telephone_payeur || '').trim(),
  };
  // Carte simulée : la référence de transaction est générée ici, jamais fournie par le client
  const reference = mode === 'carte'
    ? `SIM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    : String(b.reference_paiement || '').trim();

  const errors = [];
  if (!sessionId) errors.push('Session manquante.');
  if (!payeur.nom || !payeur.prenom) errors.push('Le nom et le prénom du payeur sont obligatoires.');
  if (!/^\S+@\S+\.\S+$/.test(payeur.email)) errors.push("L'e-mail du payeur n'est pas valide.");
  if (!/^[0-9]{8}$/.test(payeur.telephone)) errors.push('Le téléphone du payeur doit contenir 8 chiffres.');
  if (!MODES[mode]) errors.push('Veuillez choisir un mode de paiement.');
  if ((mode === 'virement' || mode === 'cheque') && !reference) {
    errors.push(mode === 'virement' ? 'La référence du virement est obligatoire.' : 'Le numéro du chèque est obligatoire.');
  }
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // FOR UPDATE : verrouille la session pour éviter deux inscriptions sur la dernière place
    const [[session]] = await conn.query(
      `SELECT s.id, (s.date_session >= CURDATE()) AS a_venir, s.statut, s.nb_places_restantes,
              f.prix, f.type_paiement, f.montant_avance
       FROM session_formation s JOIN formation f ON f.id = s.formation_id
       WHERE s.id = ? FOR UPDATE`,
      [sessionId]
    );
    if (!session) {
      await conn.rollback();
      return res.status(404).json({ message: 'Session introuvable.' });
    }
    if (session.statut !== 'Planifiée' || !session.a_venir) {
      await conn.rollback();
      return res.status(400).json({ message: "Cette session n'est plus ouverte aux inscriptions." });
    }
    if (session.nb_places_restantes <= 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Plus de places disponibles pour cette session.' });
    }
    const [deja] = await conn.query(
      'SELECT id FROM inscriptions WHERE participant_id = ? AND session_id = ?',
      [req.user.id, sessionId]
    );
    if (deja.length) {
      await conn.rollback();
      return res.status(409).json({ message: 'Vous êtes déjà inscrit à cette session.' });
    }

    const prix = Number(session.prix);
    const avance = Number(session.montant_avance) || 0;
    const avanceOk = session.type_paiement === 'avance' && avance > 0 && avance < prix;
    if (choix === 'avance' && !avanceOk) {
      await conn.rollback();
      return res.status(400).json({ message: "Le paiement par avance n'est pas proposé pour cette formation." });
    }
    const montant = choix === 'avance' ? avance : prix;

    // Virement / chèque : le paiement est déclaré (référence fournie), l'admin le vérifiera.
    // Espèces : rien n'est encore payé, le participant paie au centre.
    const declare = mode !== 'especes';
    const statutPaiement = !declare ? 'en_attente' : choix === 'avance' ? 'avance_payee' : 'paye';

    const [result] = await conn.query(
      `INSERT INTO inscriptions
         (participant_id, session_id, statut_inscription, statut_paiement,
          nom_payeur, prenom_payeur, email_payeur, telephone_payeur,
          mode_paiement, reference_paiement, montant_a_payer, montant_paye)
       VALUES (?, ?, 'en_attente', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, sessionId, statutPaiement, payeur.nom, payeur.prenom, payeur.email, payeur.telephone,
        MODES[mode], reference || null, montant, declare ? montant : 0]
    );
    await conn.commit();
    res.status(201).json({
      id: result.insertId,
      reference: reference || null,
      message: 'Inscription enregistrée. Elle sera confirmée par l’administration.',
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// DELETE /api/inscriptions/:id -> annuler une inscription encore en attente
router.delete('/:id', async (req, res, next) => {
  try {
    const [[insc]] = await pool.query(
      'SELECT id, statut_inscription FROM inscriptions WHERE id = ? AND participant_id = ?',
      [Number(req.params.id), req.user.id]
    );
    if (!insc) return res.status(404).json({ message: 'Inscription introuvable.' });
    if (insc.statut_inscription !== 'en_attente') {
      return res.status(400).json({ message: "Seule une inscription en attente peut être annulée. Contactez l'administration." });
    }
    await pool.query('DELETE FROM inscriptions WHERE id = ?', [insc.id]);
    res.json({ message: 'Inscription annulée.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.MODES = MODES;
