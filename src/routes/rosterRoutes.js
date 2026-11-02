const express = require('express');
const router = express.Router();

const { getFantasyTeamRoster, addToRoster, getUndraftedPlayers, saveRoster } = require('../controllers/rosterController');

const authenticateToken = require('../middlewares/authenticate'); // needed should probably be able to see other peoples rosters in the same league

router.get('/:teamId/roster', authenticateToken, getFantasyTeamRoster);

router.post('/:teamId/roster', authenticateToken, addToRoster);

router.put('/:teamId/roster', authenticateToken, saveRoster);

module.exports = router;