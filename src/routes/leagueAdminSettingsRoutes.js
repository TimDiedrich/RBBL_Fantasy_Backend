const express = require('express');
const router = express.Router();
const { getLeagueSettings } = require('../controllers/leagueAdminSettingsController');
const authenticateToken = require('../middlewares/authenticate');


router.get('/:id', authenticateToken, getLeagueSettings);

module.exports = router;