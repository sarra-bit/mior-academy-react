const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { participantsSession } = require('../services/presences');

const router = express.Router();
router.use(requireAuth, requireRole('formateur'));

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const STATUTS_PRESENCE = ['present', 'absent', 'retard', 'excuse'];
const SEUIL_ABSENCES = 3;

// Récupère l'id "formateur" du compte connecté
router.use(async (req, res, next) => {
  try {
    const [[fo]] = await pool.query('SELECT id, specialite FROM formateur WHERE compte_id = ?', [req.user.id]);
    if (!fo) return res.status(403).json({ message: 'Aucun profil formateur pour ce compte.' });
    req.formateur = fo;
    next();
  } catch (err) { next(err); }
});

// Session du formateur connecté (ou null)
async function maSession(req, id) {
  const [[s]] = await pool.query(
    `SELECT s.*, f.titre, f.departement,
            (s.date_session = CURDATE() AND CURTIME() >= s.heure_debut) AS appel_ouvert,
            (s.date_session > CURDATE() OR (s.date_session = CURDATE() AND CURTIME() < s.heure_debut)) AS a_venir
     FROM session_formation s JOIN formation f ON f.id = s.formation_id
     WHERE s.id = ? AND s.formateur_id = ?`,
    [id, req.formateur.id]
  );
  return s || null;
}

// ---------------------------------------------------------------------
// Formations et sessions
// ---------------------------------------------------------------------

// GET /api/formateur/formations
router.get('/formations', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.id, f.titre, f.departement, f.categorie, f.duree, f.description,
              (SELECT COUNT(*) FROM session_formation s WHERE s.formation_id = f.id AND s.formateur_id = ?) AS mes_sessions
       FROM formateur_formation ff JOIN formation f ON f.id = ff.formation_id
       WHERE ff.formateur_id = ? ORDER BY f.departement, f.titre`,
      [req.formateur.id, req.formateur.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/formateur/sessions?periode=avenir|passees
router.get('/sessions', async (req, res, next) => {
  try {
    const passees = req.query.periode === 'passees';
    const [rows] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, s.statut, s.nb_places, s.nb_places_restantes,
              f.titre, f.departement,
              (s.date_session = CURDATE() AND CURTIME() >= s.heure_debut) AS appel_ouvert,
              (SELECT COUNT(*) FROM inscriptions i WHERE i.session_id = s.id AND i.statut_inscription = 'confirmee') AS nb_confirmes,
              (SELECT COUNT(*) FROM groupes g WHERE g.session_id = s.id) AS nb_groupes,
              (SELECT COUNT(*) FROM presences p WHERE p.session_id = s.id) AS nb_presences
       FROM session_formation s JOIN formation f ON f.id = s.formation_id
       WHERE s.formateur_id = ? AND s.date_session ${passees ? '<' : '>='} CURDATE()
       ORDER BY s.date_session ${passees ? 'DESC' : 'ASC'}, s.heure_debut`,
      [req.formateur.id]
    );
    res.json(rows.map((r) => ({ ...r, appel_ouvert: Boolean(r.appel_ouvert) })));
  } catch (err) { next(err); }
});

// PATCH /api/formateur/sessions/:id/annuler -> une session planifiée à venir passe "Annulée"
// (l'ancien site la supprimait, ce qui effaçait aussi les inscriptions : on la garde, annulée)
router.patch('/sessions/:id/annuler', async (req, res, next) => {
  try {
    const s = await maSession(req, Number(req.params.id));
    if (!s) return res.status(404).json({ message: 'Session introuvable.' });
    if (s.statut !== 'Planifiée' || !s.a_venir) {
      return res.status(400).json({ message: 'Seule une session planifiée qui n’a pas commencé peut être annulée.' });
    }
    await pool.query("UPDATE session_formation SET statut = 'Annulée' WHERE id = ?", [s.id]);
    res.json({ message: 'Session annulée. L’administration en est informée via la liste des sessions.' });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------
// Présences (appel)
// ---------------------------------------------------------------------

// GET /api/formateur/sessions/:id/presences
router.get('/sessions/:id/presences', async (req, res, next) => {
  try {
    const s = await maSession(req, Number(req.params.id));
    if (!s) return res.status(404).json({ message: 'Session introuvable.' });
    res.json({
      session: { ...s, appel_ouvert: Boolean(s.appel_ouvert), a_venir: Boolean(s.a_venir) },
      participants: await participantsSession(s.id),
    });
  } catch (err) { next(err); }
});

// PUT /api/formateur/sessions/:id/presences  { presences: [{ participant_id, statut_presence, remarque }] }
router.put('/sessions/:id/presences', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const s = await maSession(req, Number(req.params.id));
    if (!s) return res.status(404).json({ message: 'Session introuvable.' });
    if (!s.appel_ouvert) {
      return res.status(403).json({ message: "L'appel n'est possible que le jour de la session, à partir de l'heure de début." });
    }
    if (s.statut === 'Annulée') return res.status(400).json({ message: 'Cette session est annulée.' });

    const autorises = new Map((await participantsSession(s.id)).map((p) => [p.id, p]));
    const lignes = (req.body?.presences || [])
      .map((p) => ({
        participant_id: Number(p.participant_id),
        statut: String(p.statut_presence || ''),
        remarque: String(p.remarque || '').trim().slice(0, 500) || null,
      }))
      .filter((p) => autorises.has(p.participant_id) && STATUTS_PRESENCE.includes(p.statut));
    if (!lignes.length) return res.status(400).json({ message: 'Aucune présence valide à enregistrer.' });

    await conn.beginTransaction();
    for (const l of lignes) {
      await conn.query(
        `INSERT INTO presences (session_id, groupe_id, participant_id, statut_presence, remarque)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE statut_presence = VALUES(statut_presence), remarque = VALUES(remarque), date_saisie = NOW()`,
        [s.id, autorises.get(l.participant_id).groupe_id || null, l.participant_id, l.statut, l.remarque]
      );
    }

    // Alerte si le participant est absent à ses 3 dernières sessions (règle de l'ancien site)
    let alertes = 0;
    for (const l of lignes.filter((x) => x.statut === 'absent')) {
      const [last] = await conn.query(
        `SELECT p.statut_presence FROM presences p JOIN session_formation se ON se.id = p.session_id
         WHERE p.participant_id = ? ORDER BY se.date_session DESC, se.heure_debut DESC LIMIT ?`,
        [l.participant_id, SEUIL_ABSENCES]
      );
      if (last.length === SEUIL_ABSENCES && last.every((r) => r.statut_presence === 'absent')) {
        const message = `Absent à ${SEUIL_ABSENCES} sessions consécutives (dernière : ${s.titre} du ${s.date_session}).`;
        const [deja] = await conn.query('SELECT id FROM alertes_absence WHERE participant_id = ? AND message = ?', [l.participant_id, message]);
        if (!deja.length) {
          await conn.query('INSERT INTO alertes_absence (participant_id, message) VALUES (?, ?)', [l.participant_id, message]);
          alertes++;
        }
      }
    }
    await conn.commit();
    res.json({
      message: `${lignes.length} présence(s) enregistrée(s).` + (alertes ? ` ${alertes} alerte(s) d’absence envoyée(s).` : ''),
      alertes,
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------
// Disponibilités
// ---------------------------------------------------------------------

function lireDispo(b) {
  const d = {
    jour: String(b.jour || ''),
    heure_debut: String(b.heure_debut || '').slice(0, 5),
    heure_fin: String(b.heure_fin || '').slice(0, 5),
    statut: b.statut === 'Indisponible' ? 'Indisponible' : 'Disponible',
  };
  if (!JOURS.includes(d.jour)) return { erreur: 'Jour invalide.' };
  if (!/^\d{2}:\d{2}$/.test(d.heure_debut) || !/^\d{2}:\d{2}$/.test(d.heure_fin)) return { erreur: 'Les heures de début et de fin sont obligatoires.' };
  if (d.heure_fin <= d.heure_debut) return { erreur: "L'heure de fin doit être après l'heure de début." };
  return { d };
}

async function chevauchement(formateurId, d, excludeId = 0) {
  const [rows] = await pool.query(
    `SELECT id FROM disponibilite_formateur
     WHERE formateur_id = ? AND jour = ? AND id <> ? AND ? < heure_fin AND ? > heure_debut`,
    [formateurId, d.jour, excludeId, d.heure_debut, d.heure_fin]
  );
  return rows.length > 0;
}

// GET /api/formateur/disponibilites
router.get('/disponibilites', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, jour, heure_debut, heure_fin, statut FROM disponibilite_formateur
       WHERE formateur_id = ?
       ORDER BY FIELD(jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'), heure_debut`,
      [req.formateur.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/formateur/disponibilites
router.post('/disponibilites', async (req, res, next) => {
  try {
    const { d, erreur } = lireDispo(req.body || {});
    if (erreur) return res.status(400).json({ message: erreur });
    if (await chevauchement(req.formateur.id, d)) return res.status(409).json({ message: 'Une disponibilité existe déjà sur ce créneau.' });
    const [r] = await pool.query('INSERT INTO disponibilite_formateur SET ?', [{ ...d, formateur_id: req.formateur.id }]);
    res.status(201).json({ id: r.insertId, message: 'Disponibilité ajoutée.' });
  } catch (err) { next(err); }
});

// PUT /api/formateur/disponibilites/:id
router.put('/disponibilites/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { d, erreur } = lireDispo(req.body || {});
    if (erreur) return res.status(400).json({ message: erreur });
    if (await chevauchement(req.formateur.id, d, id)) return res.status(409).json({ message: 'Une disponibilité existe déjà sur ce créneau.' });
    const [r] = await pool.query('UPDATE disponibilite_formateur SET ? WHERE id = ? AND formateur_id = ?', [d, id, req.formateur.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Disponibilité introuvable.' });
    res.json({ message: 'Disponibilité modifiée.' });
  } catch (err) { next(err); }
});

// DELETE /api/formateur/disponibilites/:id
router.delete('/disponibilites/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM disponibilite_formateur WHERE id = ? AND formateur_id = ?', [Number(req.params.id), req.formateur.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Disponibilité introuvable.' });
    res.json({ message: 'Disponibilité supprimée.' });
  } catch (err) { next(err); }
});

module.exports = router;
