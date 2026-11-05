const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');
const sendData = require('../utils/sendData');
const { requireLeagueMember } = require('../services/authorizationService');

const getLeagueSettings = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }

    const leagueId = parseInt(req.params.leagueId, 10);

    if (isNaN(leagueId)) {
        throw ApiError.badRequest('Invalid league ID.');
    }
    await requireLeagueMember(leagueId, userId);

    const getQuery = `
    SELECT
        league_id,
        max_lineup_points,
        max_roster_size,
        points_per_real_point,
        points_per_rebound,
        points_per_assist,
        points_per_steal,
        points_per_block,
        points_per_turnover,
        double_double_bonus,
        triple_double_bonus,
        three_point_made
    FROM league_settings
    WHERE league_id = $1;
    `;

    const { rows } = await db.query(getQuery, [leagueId]);

    return sendData(res, 200, rows[0]);
})

module.exports = {
    getLeagueSettings
}