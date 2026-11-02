const express = require('express');
const router = express.Router();
const { getDraftOrder } = require('../controllers/draftController');
const authenticateToken = require('../middlewares/authenticate');

router.get('/:leagueId/draft-order', authenticateToken, getDraftOrder);

module.exports = router;