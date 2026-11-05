const express = require('express');
const router = express.Router();
const { getLeagueSettings } = require('../controllers/leagueAdminSettingsController');
const authenticateToken = require('../middlewares/authenticate');


/**
 * @swagger
 * /fantasy-leagues/{leagueId}/settings:
 *   get:
 *     tags: [Leagues]
 *     summary: Get league settings
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       '200':
 *         description: League scoring and roster settings
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '403':
 *         description: Caller is not a league member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get('/:leagueId/settings', authenticateToken, getLeagueSettings);

module.exports = router;