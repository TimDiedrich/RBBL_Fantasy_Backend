const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');

const getPlayers = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    const leagueIdNum = parseInt(req.query.fantasy_league_id, 10);
    if(isNaN(leagueIdNum)) {
        throw ApiError.badRequest('Valid query parameter fantasy_league_id is required.');
    }

    const getQuery = `
    SELECT
            id,
            league_id,
            original_player_id,
            shirt_number,
            player_name,
            image_url,
            dob,
            nationality,
            position,
            sport_class,
            gender,
            bonus,
            team_id,
            is_active,
            is_drafted,
            drafted_by_team_id
        FROM fantasy_players
        WHERE league_id = $1
        AND is_active = TRUE
        ORDER BY player_name ASC;
    `;
    const { rows } = await db.query(getQuery, [leagueIdNum]);
    return res.status(200).json(rows);
});

module.exports = {
    getPlayers,
}