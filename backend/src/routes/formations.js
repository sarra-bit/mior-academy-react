const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/formations?q=&departement=&categorie=
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.q) {
      where.push('(f.titre LIKE ? OR f.description LIKE ?)');
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    if (req.query.departement) {
      where.push('f.departement = ?');
      params.push(req.query.departement);
    }
    if (req.query.categorie) {
      where.push('f.categorie = ?');
      params.push(req.query.categorie);
    }

    const [rows] = await pool.query(
      `SELECT f.id, f.titre, f.description, f.duree, f.prix, f.departement, f.categorie,
              f.type_paiement, f.montant_avance, f.nb_places,
              (SELECT COUNT(*) FROM session_formation s
                 WHERE s.formation_id = f.id AND s.date_session >= CURDATE() AND s.statut = 'Planifiée') AS sessions_a_venir
       FROM formation f
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY f.departement, f.categorie, f.titre`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/formations/categories -> départements et leurs catégories (pour les filtres)
router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT departement, categorie, COUNT(*) AS total
       FROM formation
       WHERE departement IS NOT NULL AND departement <> ''
       GROUP BY departement, categorie
       ORDER BY departement, categorie`
    );
    const departements = {};
    for (const r of rows) {
      departements[r.departement] ??= { nom: r.departement, total: 0, categories: [] };
      departements[r.departement].total += r.total;
      if (r.categorie) departements[r.departement].categories.push({ nom: r.categorie, total: r.total });
    }
    res.json(Object.values(departements));
  } catch (err) {
    next(err);
  }
});

// GET /api/formations/:id -> détail + formateurs + sessions à venir + documents
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[formation]] = await pool.query('SELECT * FROM formation WHERE id = ?', [id]);
    if (!formation) return res.status(404).json({ message: 'Formation introuvable.' });

    const [formateurs] = await pool.query(
      `SELECT fo.id, c.nom, c.prenom, fo.specialite
       FROM formateur_formation ff
       JOIN formateur fo ON fo.id = ff.formateur_id
       JOIN compte c ON c.id = fo.compte_id
       WHERE ff.formation_id = ?`,
      [id]
    );

    const [sessions] = await pool.query(
      `SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.salle, s.statut,
              s.nb_places, s.nb_places_restantes, c.nom AS formateur_nom, c.prenom AS formateur_prenom
       FROM session_formation s
       LEFT JOIN formateur fo ON fo.id = s.formateur_id
       LEFT JOIN compte c ON c.id = fo.compte_id
       WHERE s.formation_id = ? AND s.date_session >= CURDATE() AND s.statut = 'Planifiée'
       ORDER BY s.date_session, s.heure_debut`,
      [id]
    );

    const [documents] = await pool.query(
      'SELECT id, titre, lien FROM documents_formation WHERE formation_id = ?',
      [id]
    );

    res.json({ ...formation, formateurs, sessions, documents });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
