const express = require('express');
const router = express.Router();

const { getAll, getRealGamesByWeek } = require('../controllers/realGamesController');
// const authenticateToken = require('../middlewares/authenticate'); needed?
router.get('/all', getAll);

router.get('/:week', getRealGamesByWeek);

module.exports = router;