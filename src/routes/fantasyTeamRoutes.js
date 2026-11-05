const express = require('express');
const router = express.Router();

const { createTeam, getTeams } = require('../controllers/fantasyTeamController');
const authenticateToken = require('../middlewares/authenticate');

/**
 * @swagger
 * /fantasy-teams:
 *   post:
 *     tags: [Teams]
 *     summary: Create the caller's team in a league
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [league_id, team_name]
 *             properties:
 *               league_id: { type: integer, minimum: 1 }
 *               team_name: { type: string, minLength: 3, maxLength: 30 }
 *     responses:
 *       '201':
 *         description: Team created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '401':
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       '403':
 *         description: Caller is not a league member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       '409':
 *         description: Team capacity reached or caller already has a team
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *   get:
 *     tags: [Teams]
 *     summary: List the caller's teams
 *     responses:
 *       '200':
 *         description: Team collection
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '401':
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post('/', authenticateToken, createTeam);

router.get('/', authenticateToken, getTeams)

module.exports = router;