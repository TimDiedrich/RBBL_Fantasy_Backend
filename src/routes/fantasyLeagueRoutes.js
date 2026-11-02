const express = require('express');
const router = express.Router();
const { createLeague, getLeagues, getLeagueById, updateLeagueById, joinLeagueByCode, getMemberships, getAllMembers } = require('../controllers/fantasyLeagueController');
const authenticateToken = require('../middlewares/authenticate');

router.get('/memberships', authenticateToken, getMemberships);

router.post('/memberships', authenticateToken, joinLeagueByCode);

router.get('/:leagueId/members', authenticateToken, getAllMembers);

router.post('/', authenticateToken, createLeague);

router.get('/', authenticateToken, getLeagues);

router.patch('/:leagueId', authenticateToken, updateLeagueById);

// need to be last
router.get('/:leagueId', authenticateToken, getLeagueById);

module.exports = router;