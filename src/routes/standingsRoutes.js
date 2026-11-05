const express = require('express');
const router = express.Router();

const { getStandings } = require('../controllers/standingsController');
const authenticateToken = require('../middlewares/authenticate');

/**
 * @swagger
 * /fantasy-leagues/{leagueId}/standings:
 *   get:
 *     tags: [Leagues]
 *     summary: Get league standings
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       '200':
 *         description: Standings collection
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '403':
 *         description: Caller is not a league member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get('/:leagueId/standings', authenticateToken, getStandings);

module.exports = router;