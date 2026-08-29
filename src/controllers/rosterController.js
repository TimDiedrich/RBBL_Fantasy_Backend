const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');

const addToRoster = asyncHandler(async(req, res) => {
    const {fantasy_team_id, player_id} = req.body;
    const userId = req.user?.id;

    if (!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }

    const teamIdNum = parseInt(fantasy_team_id, 10);
    const playerIdNum = parseInt(player_id, 10);

    if (isNaN(teamIdNum) || isNaN(playerIdNum)) {
        throw ApiError.badRequest('Valid fantasy_team_id and player_id are required.');
    }

    const teamCheckQuery =`
        SELECT id, league_id FROM fantasy_teams
        WHERE id = $1 AND user_id = $2;
    `;
    const teamResult = await db.query(teamCheckQuery, [fantasy_team_id, userId]);

    if (teamResult.rows.length === 0) {
        throw ApiError.forbidden('You do not own this fantasy team or it does not exist.');
    }

    const { league_id } = teamResult.rows[0];

    const playerCheckQuery = `
        SELECT r.id 
        FROM rosters r
        JOIN fantasy_teams ft ON r.fantasy_team_id = ft.id
        WHERE r.player_id = $1 AND ft.league_id = $2;
    `;
    const playerCheck = await db.query(playerCheckQuery, [playerIdNum, league_id]);

    if (playerCheck.rows.length > 0) {
        throw ApiError.conflict('This player has already been drafted by a team in this league.');
    }


    const insertQuery = `
    INSERT INTO rosters (fantasy_team_id, player_id)
    VALUES ($1, $2)
    RETURNING id, fantasy_team_id, player_id, is_starter;
    `;

    const { rows } = await db.query(insertQuery, [fantasy_team_id, player_id]);

    res.status(201).json({
        message: 'Player added to roster!',
        roster: rows[0]
    });
});

const getFantasyTeamRoster = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }

    const teamIdNum = parseInt(req.query.fantasy_team_id, 10);
    if (isNaN(teamIdNum)) {
        throw ApiError.badRequest('Valid query parameter fantasy_team_id is required.');
    }

    const getQuery = `
        SELECT 
            p.id AS id,
            p.league_id AS league_id,
            p.original_player_id AS original_player_id,
            p.shirt_number AS shirt_number,
            p.player_name AS player_name,
            p.image_url AS image_url,
            p.dob AS dob,
            p.nationality AS nationality,
            p.position AS position,
            p.sport_class AS sport_class,
            p.gender AS gender,
            p.bonus AS bonus,
            p.team_id AS real_team_id,
            r.is_starter AS is_starter,
            r.id as roster_id
        FROM rosters r
        JOIN fantasy_players p ON r.player_id = p.id
        WHERE r.fantasy_team_id = $1
        ORDER BY r.is_starter DESC, p.player_name ASC;
    `;

    const { rows } = await db.query(getQuery, [teamIdNum]);
    return res.status(200).json({ roster: rows });
});

const getUndraftedPlayers = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    const leagueIdNum = parseInt(req.query.fantasy_league_id, 10);
    if (isNaN(leagueIdNum)) {
        throw ApiError.badRequest('Valid query parameter fantasy_league_id is required.');
    }
    const getQuery = `
        SELECT 
            p.id AS id,
            p.league_id AS league_id,
            p.original_player_id AS original_player_id,
            p.shirt_number AS shirt_number,
            p.player_name AS player_name,
            p.image_url AS image_url,
            p.dob AS dob,
            p.nationality AS nationality,
            p.position AS position,
            p.sport_class AS sport_class,
            p.gender AS gender,
            p.bonus AS bonus,
            p.team_id AS team_id,
            p.is_active AS is_active
        FROM fantasy_players p
        WHERE p.league_id = $1
        AND p.is_active = TRUE
        AND NOT EXISTS (
        SELECT 1 FROM rosters r
        JOIN fantasy_teams ft ON r.fantasy_team_id = ft.id
        WHERE r.player_id = p.id
        AND ft.league_id = $1
        )
        ORDER BY p.player_name ASC;
    `;

    const { rows } = await db.query(getQuery, [leagueIdNum]);
    return res.status(200).json({ players: rows });

});

const saveRoster = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    
    const rosterList = req.body;
    if (!Array.isArray(rosterList) || rosterList.length === 0) {
        throw ApiError.badRequest('Roster list cannot be empty.');
    }

    const teamIdNum = parseInt(rosterList[0].fantasy_team_id, 10);
    if (isNaN(teamIdNum)) {
        throw ApiError.badRequest('Invalid fantasy team ID.');
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const teamOwnerCheck = await client.query(
            `SELECT user_id FROM fantasy_teams WHERE id = $1;`, [teamIdNum]
        );

        if(teamOwnerCheck.rows.length === 0 || teamOwnerCheck.rows[0].user_id !== userId) {
            throw ApiError.forbidden('You do not have permission to modify this team.');
        }

        const ids = [];
        const isStarters = [];
        const playerIds = [];

        for (const player of rosterList) {
            ids.push(player.id);
            isStarters.push(Boolean(player.is_starter));
            playerIds.push(player.player_id);
        }

        const starterPlayerIds = rosterList.filter(p => p.is_starter).map(p => p.player_id);
        if(starterPlayerIds.length > 5) {
            throw ApiError.badRequest('Cannot have more than 5 players in your starting lineup');
        }
        if(starterPlayerIds.length > 0){
            const classficationQuery = `
                SELECT COALESCE(SUM(sport_class), 0.0) AS total_class
                FROM fantasy_players
                WHERE id = ANY($1::int[]);
            `;

            const {rows: sumRows} = await client.query(classficationQuery, [starterPlayerIds]);
            const lineupSum = parseFloat(sumRows[0].total_class);

            if(lineupSum > 14.5) {
                throw ApiError.badRequest(`Starting Lineup total class (${lineupSum}) cannot exceed 14.5 points.`);
            }
        }

        const bulkUpdateQuery = `
            UPDATE rosters AS r
            SET is_starter = u.is_starter
            FROM (
                SELECT 
                    UNNEST($1::int[]) AS id,
                    UNNEST($2::boolean[]) AS is_starter,
                    UNNEST($3::int[]) AS player_id
            ) AS u
            WHERE r.id = u.id 
              AND r.fantasy_team_id = $4 
              AND r.player_id = u.player_id;
        `;

        await client.query(bulkUpdateQuery, [ids, isStarters, playerIds, teamIdNum]);

        const getQuery = `
        SELECT 
            p.id AS id,
            p.league_id AS league_id,
            p.original_player_id AS original_player_id,
            p.shirt_number AS shirt_number,
            p.player_name AS player_name,
            p.image_url AS image_url,
            p.dob AS dob,
            p.nationality AS nationality,
            p.position AS position,
            p.sport_class AS sport_class,
            p.gender AS gender,
            p.bonus AS bonus,
            p.team_id AS real_team_id,
            r.is_starter AS is_starter,
            r.id as roster_id
        FROM rosters r
        JOIN fantasy_players p ON r.player_id = p.id
        WHERE r.fantasy_team_id = $1
        ORDER BY r.is_starter DESC, p.player_name ASC;
        `;

        const { rows } = await client.query(getQuery, [teamIdNum]);
        await client.query('COMMIT');
        return res.status(200).json({ roster: rows });
    } catch(error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
});

module.exports = {
    addToRoster,
    getFantasyTeamRoster,
    getUndraftedPlayers,
    saveRoster,

}