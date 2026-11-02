const express = require('express');
const router = express.Router();

const { createTeam, getTeams } = require('../controllers/fantasyTeamController');
const authenticateToken = require('../middlewares/authenticate');

router.post('/', authenticateToken, createTeam);

router.get('/', authenticateToken, getTeams)

module.exports = router;