// SOCKET is being handled in the service file
const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');
const sendData = require('../utils/sendData');
const { requireLeagueMember } = require('../services/authorizationService');

const getDraftOrder = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }

    const leagueId = parseInt(req.params.leagueId, 10);

    if(isNaN(leagueId)) {
        throw ApiError.badRequest('Invalid league ID.');
    }

    // 1. Authorization: Ensure requesting user belongs to this league
    await requireLeagueMember(leagueId, userId);

    const getQuery = `
    SELECT
        ord.league_id AS league_id,
        ord.fantasy_team_id AS fantasy_team_id,
        ft.team_name AS team_name,
        ord.draft_position AS draft_position
    FROM draft_order ord
    JOIN fantasy_teams ft ON ft.id = ord.fantasy_team_id
    WHERE ord.league_id = $1
    ORDER BY ord.draft_position ASC;
    `;

    const { rows } = await db.query(getQuery, [leagueId]);

    return sendData(res, 200, rows);
});



module.exports = { getDraftOrder };