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

    const getQuery = `
    SELECT
        do.league_id AS league_id,
        do.fantasy_team_id AS fantasy_team_id,
        ft.team_name AS team_name,
        do.draft_position AS draft_position,
    FROM draft_order do
    JOIN fantasy_teams ft ON ft.id = do.fantasy_team_id
    WHERE do.league_id = $1;
    `;

    const { rows } = await db.query(getQuery, [leagueId]);

    return res.status(200).json(rows[0]);
})