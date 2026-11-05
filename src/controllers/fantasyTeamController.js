const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');
const sendData = require('../utils/sendData');

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
    const insertQuery = `
        INSERT INTO fantasy_teams (league_id, user_id, team_name)
        VALUES ($1, $2, $3)
        RETURNING id, league_id, user_id, team_name, created_at;
    `;

    const { rows } = await db.query(insertQuery, [league_id, userId, cleanTeamName]);
    const newTeam = rows[0];

    sendData(res, 201, newTeam);
});

const getTeams = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        ApiError.unauthorized('User ID is required.');
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