const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Toutes les routes /api/admin/* sont réservées à l'administrateur
const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.use('/formations', require('./formations'));
router.use('/formateurs', require('./formateurs'));
router.use('/comptes', require('./comptes'));
router.use('/sessions', require('./sessions'));
router.use('/groupes', require('./groupes'));
router.use('/inscriptions', require('./inscriptions'));
router.use('/attestations', require('./attestations'));
router.use('/presences', require('./presences'));

module.exports = router;
