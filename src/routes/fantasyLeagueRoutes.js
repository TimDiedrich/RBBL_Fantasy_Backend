const express = require('express');
const router = express.Router();
const { createLeague, getLeagues, getLeagueById, updateLeagueById, joinLeagueByCode, getMemberships, getAllMembers } = require('../controllers/fantasyLeagueController');
const authenticateToken = require('../middlewares/authenticate');

/**
 * @swagger
 * /fantasy-leagues/memberships:
 *   get:
 *     tags: [Leagues]
 *     summary: List the caller's league memberships
 *     responses:
 *       '200':
 *         description: Membership collection
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '401':
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.get('/memberships', authenticateToken, getMemberships);

/**
 * @swagger
 * /fantasy-leagues/memberships:
 *   post:
 *     tags: [Leagues]
 *     summary: Join a league using an invite code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invite_code]
 *             properties:
 *               invite_code: { type: string }
 *     responses:
 *       '200':
 *         description: Joined league
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '401':
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       '404':
 *         description: Invite code not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       '409':
 *         description: Already a member or league capacity reached
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post('/memberships', authenticateToken, joinLeagueByCode);

/**
 * @swagger
 * /fantasy-leagues/{leagueId}/members:
 *   get:
 *     tags: [Leagues]
 *     summary: List members of a league
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       '200':
 *         description: League member collection
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
 */
router.get('/:leagueId/members', authenticateToken, getAllMembers);

/**
 * @swagger
 * /fantasy-leagues:
 *   post:
 *     tags: [Leagues]
 *     summary: Create a league
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, numOfTeams]
 *             properties:
 *               name: { type: string, minLength: 3, maxLength: 30 }
 *               numOfTeams: { type: integer, minimum: 2 }
 *     responses:
 *       '201':
 *         description: League created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '400':
 *         description: Invalid league fields
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       '401':
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *   get:
 *     tags: [Leagues]
 *     summary: List leagues commissioned by the caller
 *     responses:
 *       '200':
 *         description: Commissioned league collection
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '401':
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 */
router.post('/', authenticateToken, createLeague);

router.get('/', authenticateToken, getLeagues);

/**
 * @swagger
 * /fantasy-leagues/{leagueId}:
 *   patch:
 *     tags: [Leagues]
 *     summary: Update league settings
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               league_name: { type: string }
 *               draft_status:
 *                 type: string
 *                 enum: [PREDRAFT, SCHEDULED, DRAFTING, POSTDRAFT, COMPLETED]
 *               draft_date: { type: string, format: date-time }
 *               needs_new_invite_code: { type: boolean }
 *     responses:
 *       '200':
 *         description: Updated league
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessEnvelope' }
 *       '401':
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *       '403':
 *         description: Caller is not the commissioner
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *   get:
 *     tags: [Leagues]
 *     summary: Get league details
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       '200':
 *         description: League details and settings
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
 */
router.patch('/:leagueId', authenticateToken, updateLeagueById);

// need to be last
router.get('/:leagueId', authenticateToken, getLeagueById);

module.exports = router;