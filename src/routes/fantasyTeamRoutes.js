const express = require('express');
const router = express.Router();

const { createTeam, getTeams } = require('../controllers/fantasyTeamController');
const authenticateToken = require('../middlewares/authenticate');

router.post('/create', authenticateToken, createTeam);

router.get('/all', authenticateToken, getTeams)

module.exports = router;