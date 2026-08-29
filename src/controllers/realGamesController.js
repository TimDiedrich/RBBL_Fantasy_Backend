const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getWeekDateRange } = require('../utils/dateHelpers');

const getAll = asyncHandler(async(req, res) => {
    const getQuery = `
        SELECT
            m.id,
            home_team.name AS home_team_name,
            away_team.name AS away_team_name,
            
            COALESCE(m.home_score, 0) AS home_score,
            COALESCE(m.away_score, 0) AS away_score,

            (CASE
                WHEN m.game_date > NOW() THEN 'SCHEDULED'
                WHEN m.game_date <= NOW() AND m.game_date + INTERVAL '2 hours' >= NOW() THEN 'LIVE'
                ELSE 'FINISHED'
            END)::match_status AS status
        FROM real_games m
        JOIN teams home_team ON m.home_team_id = home_team.team_id
        JOIN teams away_team ON m.away_team_id = away_team.team_id
        ORDER BY m.game_date ASC;
    `;

    const { rows } = await db.query(getQuery, []);

    return res.status(200).json({ 
        week_number: 0,
        matches: rows
    });
});


const getRealGamesByWeek = asyncHandler(async(req, res) => {

    const week = parseInt(req.params.week, 10);
    if (isNaN(week)) {
        throw ApiError.badRequest('Invalid week.');
    }

    const getQuery = `
        SELECT
            m.id,
            home_team.name AS home_team_name,
            away_team.name AS away_team_name,
            
            COALESCE(m.home_score, 0) AS home_score,
            COALESCE(m.away_score, 0) AS away_score,

            home_team.logo_url AS home_logo_url,
            away_team.logo_url AS away_logo_url,

            m.game_date AS game_date,

            (CASE
                WHEN m.game_date > NOW() THEN 'SCHEDULED'
                WHEN m.game_date <= NOW() AND m.game_date + INTERVAL '2 hours' >= NOW() THEN 'LIVE'
                ELSE 'FINISHED'
            END)::match_status AS status
        FROM real_games m
        JOIN teams home_team ON m.home_team_id = home_team.team_id
        JOIN teams away_team ON m.away_team_id = away_team.team_id
        JOIN game_weeks gw 
        ON m.game_date >= gw.start_date 
        AND m.game_date < gw.end_date
        WHERE gw.week_number = $1
        ORDER BY m.game_date ASC;
    `;

    const { rows } = await db.query(getQuery, [week]);

    return res.status(200).json({ 
        week_number: week,
        matches: rows
    });
});

module.exports = {
    getAll,
    getRealGamesByWeek
}