const express = require('express');
const router = express.Router();

const { getFantasyTeamRoster, addToRoster, saveRoster } = require('../controllers/rosterController');

const authenticateToken = require('../middlewares/authenticate'); // needed should probably be able to see other peoples rosters in the same league

/**
 * @swagger
 * /fantasy-teams/{teamId}/roster:
 *   get:
 *     tags: [Teams]
 *     summary: Get a team roster
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       '200':
 *         description: Roster entries for a team in the caller's league
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '403':
 *         description: Caller is not a member of the team's league
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *   post:
 *     tags: [Teams]
 *     summary: Add a player to the caller's team roster
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [player_id]
 *             properties:
 *               player_id: { type: integer, minimum: 1 }
 *     responses:
 *       '201':
 *         description: Player added
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '403':
 *         description: Caller does not own the team
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       '409':
 *         description: Player is already rostered in the league
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *   put:
 *     tags: [Teams]
 *     summary: Update starter selection for a team roster
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [roster_id, player_id, is_starter]
 *               properties:
 *                 roster_id: { type: integer }
 *                 player_id: { type: integer }
 *                 is_starter: { type: boolean }
 *     responses:
 *       '200':
 *         description: Updated roster
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '403':
 *         description: Caller does not own the team
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get('/:teamId/roster', authenticateToken, getFantasyTeamRoster);

router.post('/:teamId/roster', authenticateToken, addToRoster);

router.put('/:teamId/roster', authenticateToken, saveRoster);

module.exports = router;