const express = require('express');
const router = express.Router();

const { getStandings } = require('../controllers/standingsController');
const authenticateToken = require('../middlewares/authenticate');

router.get('/league_standing', authenticateToken, getStandings);

module.exports = router;