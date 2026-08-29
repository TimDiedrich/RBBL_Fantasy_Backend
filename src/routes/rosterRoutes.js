const express = require('express');
const router = express.Router();

const { getFantasyTeamRoster, addToRoster, getUndraftedPlayers, saveRoster } = require('../controllers/rosterController');

const authenticateToken = require('../middlewares/authenticate'); // needed should probably be able to see other peoples rosters in the same league

router.get('/team', authenticateToken, getFantasyTeamRoster); // just get all?

router.post('/add_player', authenticateToken, addToRoster);

router.get('/undrafted', authenticateToken, getUndraftedPlayers);

router.put('/save', authenticateToken, saveRoster);

module.exports = router;