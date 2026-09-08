const express = require('express')
const router = express.Router();
const playerController = require('../controllers/playerController');

const authenticateToken = require('../middlewares/authenticate');

// GET /api/players
router.get('/', authenticateToken, playerController.getPlayers);

module.exports = router;