const express = require('express');
const pool = require('../../db');

const router = express.Router();

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const STATUTS = ['Planifiée', 'En cours', 'Terminée', 'Annulée'];
const norm = (s) => String(s || '').trim().toLowerCase();

// Vérifie les règles de planification (reprises de l'ancien site).
// Renvoie un message d'erreur, ou '' si tout est bon.
async function verifierPlanning(d, excludeId = 0) {
  if (!d.formation_id || !d.formateur_id || !d.date_session || !d.heure_debut || !d.heure_fin || !d.salle) {
    return 'Tous les champs sont obligatoires.';
  }
  if (d.heure_fin <= d.heure_debut) return "L'heure de fin doit être après l'heure de début.";
  if (!(d.nb_places > 0)) return 'Le nombre de places doit être positif.';
  if (!STATUTS.includes(d.statut)) return 'Statut invalide.';

  const [[formation]] = await pool.query('SELECT id, departement FROM formation WHERE id = ?', [d.formation_id]);
  if (!formation) return 'Formation introuvable.';
  const [[formateur]] = await pool.query('SELECT id, specialite FROM formateur WHERE id = ?', [d.formateur_id]);
  if (!formateur) return 'Formateur introuvable.';
  if (norm(formateur.specialite) !== norm(formation.departement)) {
    return `La spécialité du formateur (${formateur.specialite}) ne correspond pas au département de la formation (${formation.departement}).`;
  }

  const jour = JOURS[new Date(`${d.date_session}T00:00:00Z`).getUTCDay()];
  const [dispo] = await pool.query(
    `SELECT id FROM disponibilite_formateur
     WHERE formateur_id = ? AND jour = ? AND statut = 'Disponible' AND ? >= heure_debut AND ? <= heure_fin`,
    [d.formateur_id, jour, d.heure_debut, d.heure_fin]
  );
  if (!dispo.length) return `Le formateur n'est pas disponible le ${jour.toLowerCase()} sur ce créneau.`;

  const [conflitFormateur] = await pool.query(
    `SELECT id FROM session_formation
     WHERE formateur_id = ? AND date_session = ? AND id <> ? AND statut <> 'Annulée'
       AND ? < heure_fin AND ? > heure_debut`,
    [d.formateur_id, d.date_session, excludeId, d.heure_debut, d.heure_fin]
  );
  if (conflitFormateur.length) return 'Le formateur a déjà une session sur ce créneau.';

  const [conflitSalle] = await pool.query(
    `SELECT id FROM session_formation
     WHERE salle = ? AND date_session = ? AND id <> ? AND statut <> 'Annulée'
       AND ? < heure_fin AND ? > heure_debut`,
    [d.salle, d.date_session, excludeId, d.heure_debut, d.heure_fin]
  );
  if (conflitSalle.length) return 'Cette salle est déjà occupée sur ce créneau.';
  return '';
}

function lireSession(b) {
  return {
    formation_id: Number(b.formation_id) || 0,
    formateur_id: Number(b.formateur_id) || 0,
    date_session: String(b.date_session || ''),
    heure_debut: String(b.heure_debut || '').slice(0, 5),
    heure_fin: String(b.heure_fin || '').slice(0, 5),
    salle: String(b.salle || '').trim(),
    statut: b.statut || 'Planifiée',
    nb_places: Number(b.nb_places) || 0,
  };
}

// GET /api/admin/sessions?periode=avenir|passees
router.get('/', async (req, res, next) => {
  try {
    const periode = req.query.periode === 'passees' ? '<' : '>=';
    const [rows] = await pool.query(
      `SELECT s.*, f.titre, f.departement,
              c.nom AS formateur_nom, c.prenom AS formateur_prenom,
              (SELECT COUNT(*) FROM inscriptions i WHERE i.session_id = s.id) AS nb_inscriptions,
              (SELECT COUNT(*) FROM inscriptions i WHERE i.session_id = s.id AND i.statut_inscription = 'en_attente') AS nb_en_attente,
              (SELECT COUNT(*) FROM groupes g WHERE g.session_id = s.id) AS nb_groupes
       FROM session_formation s
       JOIN formation f ON f.id = s.formation_id
       LEFT JOIN formateur fo ON fo.id = s.formateur_id
       LEFT JOIN compte c ON c.id = fo.compte_id
       WHERE s.date_session ${periode} CURDATE()
       ORDER BY s.date_session ${periode === '<' ? 'DESC' : 'ASC'}, s.heure_debut`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/admin/sessions/options -> formations, formateurs et leurs disponibilités (formulaire)
router.get('/options', async (req, res, next) => {
  try {
    const [formations] = await pool.query('SELECT id, titre, departement, nb_places FROM formation ORDER BY departement, titre');
    const [formateurs] = await pool.query(
      `SELECT fo.id, fo.specialite, c.nom, c.prenom
       FROM formateur fo JOIN compte c ON c.id = fo.compte_id
       WHERE c.statut = 1 ORDER BY c.nom`
    );
    const [dispos] = await pool.query(
      `SELECT formateur_id, jour, heure_debut, heure_fin FROM disponibilite_formateur
       WHERE statut = 'Disponible' ORDER BY FIELD(jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'), heure_debut`
    );
    res.json({
      formations,
      formateurs: formateurs.map((f) => ({ ...f, disponibilites: dispos.filter((d) => d.formateur_id === f.id) })),
    });
  } catch (err) { next(err); }
});

// POST /api/admin/sessions -> planifier
router.post('/', async (req, res, next) => {
  try {
    const d = lireSession(req.body || {});
    const erreur = await verifierPlanning(d);
    if (erreur) return res.status(400).json({ message: erreur });
    const [r] = await pool.query('INSERT INTO session_formation SET ?', [{ ...d, nb_places_restantes: d.nb_places }]);
    res.status(201).json({ id: r.insertId, message: 'Session planifiée.' });
  } catch (err) { next(err); }
});

// PUT /api/admin/sessions/:id -> modifier
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = lireSession(req.body || {});
    const [[{ confirmees, existe }]] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM inscriptions WHERE session_id = ? AND statut_inscription = 'confirmee') AS confirmees,
              (SELECT COUNT(*) FROM session_formation WHERE id = ?) AS existe`,
      [id, id]
    );
    if (!existe) return res.status(404).json({ message: 'Session introuvable.' });
    if (d.nb_places < confirmees) {
      return res.status(400).json({ message: `Impossible : ${confirmees} participant(s) sont déjà confirmés.` });
    }
    const erreur = await verifierPlanning(d, id);
    if (erreur) return res.status(400).json({ message: erreur });
    await pool.query('UPDATE session_formation SET ? WHERE id = ?', [{ ...d, nb_places_restantes: d.nb_places - confirmees }, id]);
    res.json({ message: 'Session modifiée.' });
  } catch (err) { next(err); }
});

// DELETE /api/admin/sessions/:id -> supprime aussi inscriptions, groupes, présences, attestations (clés étrangères)
router.delete('/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM session_formation WHERE id = ?', [Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Session introuvable.' });
    res.json({ message: 'Session supprimée.' });
  } catch (err) { next(err); }
});

module.exports = router;
