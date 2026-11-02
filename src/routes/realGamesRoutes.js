const express = require('express');
const router = express.Router();

const { getAll, getRealGamesByWeek } = require('../controllers/realGamesController');
router.get('/', (req, res, next) => {
	if (req.query.week === undefined) {
		return getAll(req, res, next);
	}
	return getRealGamesByWeek(req, res, next);
});

module.exports = router;