const express = require('express');
const router = express.Router();
const { getDraftOrder } = require('../controllers/draftController');
const authenticateToken = require('../middlewares/authenticate');

/**
 * @swagger
 * /fantasy-leagues/{leagueId}/draft-order:
 *   get:
 *     tags: [Leagues]
 *     summary: Get the league draft order
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       '200':
 *         description: Draft-order collection
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '403':
 *         description: Caller is not a league member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get('/:leagueId/draft-order', authenticateToken, getDraftOrder);

module.exports = router;