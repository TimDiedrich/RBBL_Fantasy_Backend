const express = require('express')
const router = express.Router({ mergeParams: true });
const playerController = require('../controllers/playerController');

const authenticateToken = require('../middlewares/authenticate');

/**
 * @swagger
 * /fantasy-leagues/{leagueId}/players:
 *   get:
 *     tags: [Players]
 *     summary: List active fantasy players in a league
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: undrafted
 *         required: false
 *         schema: { type: boolean }
 *     responses:
 *       '200':
 *         description: Fantasy-player collection
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '403':
 *         description: Caller is not a league member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get('/', authenticateToken, playerController.getPlayers);

module.exports = router;