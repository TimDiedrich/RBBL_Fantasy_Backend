// SOCKET is being handled in the service file
const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');

const getDraftOrder = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }

    const leagueId = parseInt(req.params.id, 10);

    if(isNaN(leagueId)) {
        throw ApiError.badRequest('Invalid league ID.');
    }

    // 1. Authorization: Ensure requesting user belongs to this league
    const memberCheckQuery = `
        SELECT 1 FROM league_members 
        WHERE league_id = $1 AND user_id = $2;
    `;
    const { rowCount } = await db.query(memberCheckQuery, [leagueId, userId]);
    if (rowCount === 0) {
        throw ApiError.forbidden('You are not a member of this league.');
    }

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

    return res.status(200).json(rows);
});



module.exports = { getDraftOrder };