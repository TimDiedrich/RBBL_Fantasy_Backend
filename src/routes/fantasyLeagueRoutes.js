const express = require('express');
const router = express.Router();
const { createLeague, getLeagues, getLeagueById, updateLeagueById, joinLeagueByCode, getMemberships, getAllMembers } = require('../controllers/fantasyLeagueController');
const authenticateToken = require('../middlewares/authenticate');

router.get('/get_memberships', authenticateToken, getMemberships);

router.get('/get_all_members', authenticateToken, getAllMembers);

router.post('/create', authenticateToken, createLeague);

router.get('/all', authenticateToken, getLeagues);

router.put('/:id', authenticateToken, updateLeagueById);

router.post('/join', authenticateToken, joinLeagueByCode);

// need to be last
router.get('/:id', authenticateToken, getLeagueById);

module.exports = router;