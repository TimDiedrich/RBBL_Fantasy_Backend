const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');

const getStandings = asyncHandler(async(req, res) => {
    const { league_id } = req.query;
    const userId = req.user?.id;

    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    const leagueIdNum = parseInt(req.query.league_id, 10);
    if (isNaN(leagueIdNum)) {
        throw ApiError.badRequest('Valid numeric league_id query parameter is required.');
    }
    const teamQuery = `
        SELECT team_id, team_name, wins, losses, total_points, rank
        FROM league_standings
        WHERE league_id = $1
        ORDER BY rank ASC;
    `;

    const { rows } = await db.query(teamQuery, [league_id]);

    return res.status(200).json({ standings: rows });
});

module.exports = {
    getStandings
}