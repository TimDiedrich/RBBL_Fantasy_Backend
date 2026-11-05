const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');
const sendData = require('../utils/sendData');
const { requireLeagueMember } = require('../services/authorizationService');

const createTeam = asyncHandler(async(req, res) => {
    const { league_id, team_name } = req.body;
    const cleanTeamName = team_name?.trim() || '';
    const userId = req.user?.id;
    if (!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    if (!cleanTeamName || !league_id) {
        throw ApiError.badRequest('Teamname and leauge id required.');
    }

    const teamNameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if(!teamNameRegex.test(cleanTeamName)) {
        throw ApiError.badRequest('Team name must be 3-30 characters long and contain only letters, numbers, or underscores.');
    }
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const leagueResult = await client.query(
            'SELECT max_number_teams FROM fantasy_leagues WHERE id = $1 FOR UPDATE',
            [league_id]
        );

        if (leagueResult.rows.length === 0) {
            throw ApiError.notFound('League not found.');
        }

        await requireLeagueMember(league_id, userId, client);

        const teamCountResult = await client.query(
            'SELECT COUNT(*) FROM fantasy_teams WHERE league_id = $1',
            [league_id]
        );

        if (parseInt(teamCountResult.rows[0].count, 10) >= leagueResult.rows[0].max_number_teams) {
            throw ApiError.conflict('This league has reached its maximum team capacity.');
        }

        const insertQuery = `
        INSERT INTO fantasy_teams (league_id, user_id, team_name)
        VALUES ($1, $2, $3)
        RETURNING id, league_id, user_id, team_name, created_at;
        `;

        const { rows } = await client.query(insertQuery, [league_id, userId, cleanTeamName]);
        await client.query('COMMIT');

        return sendData(res, 201, rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

const getTeams = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    const getQuery = `
        SELECT id, league_id, user_id, team_name, created_at FROM fantasy_teams
        WHERE user_id = $1;
    `;

    const { rows } = await db.query(getQuery, [userId]);
    sendData(res, 200, rows);

});

module.exports = {
    createTeam,
    getTeams
}