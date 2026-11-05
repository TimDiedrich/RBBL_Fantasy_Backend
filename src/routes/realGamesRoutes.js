const express = require('express');
const router = express.Router();

const { getAll, getRealGamesByWeek } = require('../controllers/realGamesController');
/**
 * @swagger
 * /real-games:
 *   get:
 *     tags: [Games]
 *     summary: List real games, optionally filtered by game week
 *     security: []
 *     parameters:
 *       - in: query
 *         name: week
 *         required: false
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       '200':
 *         description: Game collection and requested week metadata
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '400':
 *         description: Invalid week value
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get('/', (req, res, next) => {
	if (req.query.week === undefined) {
		return getAll(req, res, next);
	}
	return getRealGamesByWeek(req, res, next);
});

module.exports = router;