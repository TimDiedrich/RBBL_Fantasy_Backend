const express = require('express')
const router = express.Router({ mergeParams: true });
const playerController = require('../controllers/playerController');

const authenticateToken = require('../middlewares/authenticate');

router.get('/', authenticateToken, playerController.getPlayers);

module.exports = router;