const express = require('express');
const pool = require('../../db');

const router = express.Router();

// GET /api/admin/inscriptions?statut=&q=
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (['en_attente', 'confirmee', 'refusee'].includes(req.query.statut)) {
      where.push('i.statut_inscription = ?');
      params.push(req.query.statut);
    }
    if (req.query.q) {
      where.push('(c.nom LIKE ? OR c.prenom LIKE ? OR c.email LIKE ? OR f.titre LIKE ? OR i.reference_paiement LIKE ?)');
      params.push(...Array(5).fill(`%${req.query.q}%`));
    }
    const [rows] = await pool.query(
      `SELECT i.*, c.nom, c.prenom, c.email,
              s.date_session, s.heure_debut, s.salle, s.nb_places_restantes,
              f.titre, f.prix
       FROM inscriptions i
       JOIN compte c ON c.id = i.participant_id
       JOIN session_formation s ON s.id = i.session_id
       JOIN formation f ON f.id = s.formation_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY FIELD(i.statut_inscription, 'en_attente', 'confirmee', 'refusee'), i.date_inscription DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Change le statut d'une inscription en gardant nb_places_restantes cohérent
async function changerStatut(id, nouveau, extra = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[insc]] = await conn.query('SELECT * FROM inscriptions WHERE id = ? FOR UPDATE', [id]);
    if (!insc) { await conn.rollback(); return { status: 404, message: 'Inscription introuvable.' }; }
    const [[session]] = await conn.query('SELECT nb_places_restantes FROM session_formation WHERE id = ? FOR UPDATE', [insc.session_id]);

    const etaitConfirmee = insc.statut_inscription === 'confirmee';
    const seraConfirmee = nouveau === 'confirmee';
    if (!etaitConfirmee && seraConfirmee && session.nb_places_restantes <= 0) {
      await conn.rollback();
      return { status: 409, message: 'Plus de places disponibles dans cette session.' };
    }
    if (nouveau === null) {
      await conn.query('DELETE FROM inscriptions WHERE id = ?', [id]);
    } else {
      await conn.query('UPDATE inscriptions SET ? WHERE id = ?', [{ statut_inscription: nouveau, ...extra }, id]);
    }
    const delta = (etaitConfirmee ? 1 : 0) - (seraConfirmee ? 1 : 0);
    if (delta) {
      await conn.query('UPDATE session_formation SET nb_places_restantes = nb_places_restantes + ? WHERE id = ?', [delta, insc.session_id]);
    }
    await conn.commit();
    return { status: 200 };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

// POST /api/admin/inscriptions/:id/valider
router.post('/:id/valider', async (req, res, next) => {
  try {
    const r = await changerStatut(Number(req.params.id), 'confirmee');
    if (r.status !== 200) return res.status(r.status).json({ message: r.message });
    res.json({ message: 'Inscription confirmée.' });
  } catch (err) { next(err); }
});

// POST /api/admin/inscriptions/:id/refuser
router.post('/:id/refuser', async (req, res, next) => {
  try {
    const r = await changerStatut(Number(req.params.id), 'refusee', { statut_paiement: 'refuse' });
    if (r.status !== 200) return res.status(r.status).json({ message: r.message });
    res.json({ message: 'Inscription refusée.' });
  } catch (err) { next(err); }
});

// PATCH /api/admin/inscriptions/:id/paiement  { statut_paiement, montant_paye }  (ex. espèces reçues au centre)
router.patch('/:id/paiement', async (req, res, next) => {
  try {
    const statut = req.body?.statut_paiement;
    if (!['en_attente', 'avance_payee', 'paye', 'refuse'].includes(statut)) {
      return res.status(400).json({ message: 'Statut de paiement invalide.' });
    }
    const montant = Number(req.body?.montant_paye);
    if (!(montant >= 0)) return res.status(400).json({ message: 'Montant invalide.' });
    const [r] = await pool.query('UPDATE inscriptions SET statut_paiement = ?, montant_paye = ? WHERE id = ?',
      [statut, montant, Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Inscription introuvable.' });
    res.json({ message: 'Paiement mis à jour.' });
  } catch (err) { next(err); }
});

// DELETE /api/admin/inscriptions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const r = await changerStatut(Number(req.params.id), null);
    if (r.status !== 200) return res.status(r.status).json({ message: r.message });
    res.json({ message: 'Inscription supprimée.' });
  } catch (err) { next(err); }
});

module.exports = router;
