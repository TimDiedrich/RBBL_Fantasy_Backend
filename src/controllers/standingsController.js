const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');
const sendData = require('../utils/sendData');

const getStandings = asyncHandler(async(req, res) => {
    const userId = req.user?.id;

    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    const leagueIdNum = parseInt(req.params.leagueId, 10);
    if (isNaN(leagueIdNum)) {
        throw ApiError.badRequest('Valid league ID is required.');
    }
    const teamQuery = `
        SELECT team_id, team_name, wins, losses, total_points, rank
        FROM league_standings
        WHERE league_id = $1
        ORDER BY rank ASC;
    `;

    const { rows } = await db.query(teamQuery, [leagueIdNum]);

    return sendData(res, 200, rows);
});

module.exports = {
    getStandings
}