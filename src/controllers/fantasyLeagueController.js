const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');
const { generateDraftOrder } = require('../services/draftService');

const crypto = require('crypto');

const path = require('path');
const fs = require('fs/promises');

// TODO extract to utils file?
const generateInviteCode = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const createLeague = asyncHandler(async(req, res) => {
    const { name, numOfTeams } = req.body;
    const userId = req.user?.id || req.body.userId;
    const cleanLeagueName = name?.trim() || '';

    const numTeams = parseInt(numOfTeams, 10);
    if(isNaN(numTeams)) {
        throw ApiError.badRequest('Invalid number of teams.');
    }

    if(!cleanLeagueName || !userId){
        return res.status(400).json({ error: 'League name and user ID are required.'})
    }

    const leagueRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if(!leagueRegex.test(cleanLeagueName)) {
        return res.status(400).json({
            error: 'League name must be 3-30 characters long and contain only letters, numbers, or underscores.'
        });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const inviteCode = generateInviteCode();

        const insertQuery = `
        INSERT INTO fantasy_leagues (league_name, commissioner_id, max_number_teams, invite_code)
        VALUES ($1, $2, $3, $4)
        RETURNING id, league_name, commissioner_id, max_number_teams, invite_code, draft_status, created_at;
        `;

        const { rows } = await client.query(insertQuery, [cleanLeagueName, userId, numTeams, inviteCode]);
        const newLeague = rows[0];

        const insertSettingsQuery = `
            INSERT INTO league_settings (league_id)
            VALUES ($1);
        `;
        await client.query(insertSettingsQuery, [newLeague.id]);

        const insertLeagueMembership = `
            INSERT INTO league_members (league_id, user_id, "role")
            VALUES ($1, $2, $3);
        `;
        await client.query(insertLeagueMembership, [newLeague.id, userId, 'COMMISSIONER']);

        const copyPlayerDateQuery = `
        INSERT INTO fantasy_players (
            league_id, original_player_id, shirt_number, player_name, image_url, dob, nationality, position, sport_class, team_id
            )
            SELECT $1, id, shirt_number, player_name, image_url, dob, nationality, position, sport_class, team_id
            FROM players
            WHERE is_active = TRUE;
        `;
        const { playerRows } = await client.query(copyPlayerDateQuery, [newLeague.id]);

        const filePath = path.join(__dirname, '../config/SQL/seeds/07_edit_female_players.sql')
        const adjust_gender_query = await fs.readFile(filePath, 'utf8');

        await client.query(adjust_gender_query);

        await client.query('COMMIT');

        res.status(201).json(newLeague);

    } catch (error){
        await client.query('ROLLBACK');
        throw error;
    } finally { 
        client.release();
    }
});

const getLeagues = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    // For simple get queries not try needed
    const getQuery = `
    SELECT id, league_name, commissioner_id, max_number_teams, invite_code, draft_status, draft_date, created_at FROM fantasy_leagues
    WHERE commissioner_id = $1;
    `;

    const { rows } = await db.query(getQuery, [userId]);

    res.status(200).json({
        leagues: rows
    });
});

const getLeagueById = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }

    const leagueId = parseInt(req.params.id, 10);

    if (isNaN(leagueId)) {
        throw ApiError.badRequest('Invalid league ID.');
    }

    const getQuery = `
            SELECT
                fl.id AS id,
                fl.league_name AS league_name,
                fl.commissioner_id AS commissioner_id,
                fl.max_number_teams AS max_number_teams,
                u.username AS commissioner_username,
                fl.invite_code AS invite_code,
                fl.draft_status AS draft_status,
                fl.draft_date AS draft_date,
                fl.created_at AS created_at,
                json_build_object(
                    'max_lineup_points', COALESCE(ls.max_lineup_points, 14.5),
                    'max_roster_size', COALESCE(ls.max_roster_size, 12),
                    'points_per_real_point', COALESCE(ls.points_per_real_point, 1.0),
                    'points_per_rebound', COALESCE(ls.points_per_rebound, 1.2),
                    'points_per_assist', COALESCE(ls.points_per_assist, 1.5),
                    'points_per_steal', COALESCE(ls.points_per_steal, 3.0),
                    'points_per_block', COALESCE(ls.points_per_block, 3.0),
                    'points_per_turnover', COALESCE(ls.points_per_turnover, -2.0)
                ) AS settings
            FROM fantasy_leagues fl
            JOIN users u ON fl.commissioner_id = u.id
            LEFT JOIN league_settings ls ON fl.id = ls.league_id
            WHERE fl.id = $1;
        `;

        const { rows } = await db.query(getQuery, [leagueId]);

        if (rows.length === 0) {
            throw ApiError.notFound('League not found.');
        }

        return res.status(200).json(rows[0]);
});

const updateLeagueById = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if (!userId){
        throw ApiError.unauthorized('User ID is required.');
    }

    const leagueId = parseInt(req.params.id, 10);
    if (isNaN(leagueId)) {
        throw ApiError.badRequest('Invalid league ID.');
    }

    const { league_name, draft_status, draft_date, needs_new_invite_code } = req.body;
    const newInviteCode = needs_new_invite_code ? generateInviteCode() : null;

    const client = await db.connect();

    try { 
        await client.query('BEGIN');

        const leagueCheck = await client.query(
            'SELECT commissioner_id FROM fantasy_leagues WHERE id = $1',
            [leagueId]
        );

        if (leagueCheck.rows.length === 0) {
            throw ApiError.notFound('League not found.');
        }

        if (leagueCheck.rows[0].commissioner_id !== userId) {
            throw ApiError.forbidden('Only the commissioner can update league settings.');
        }

        const currentStatus = leagueCheck.rows[0].draft_status;

        if (league_name || draft_status || draft_date || needs_new_invite_code) {
            await client.query(
                `
                UPDATE fantasy_leagues
                SET league_name = COALESCE($1, league_name),
                    draft_status = COALESCE($2, draft_status),
                    draft_date = COALESCE($3, draft_date),
                    invite_code = COALESCE($4, invite_code)
                WHERE id = $5`,
                [
                    league_name?.trim() || null,
                    draft_status || null,
                    draft_date || null,
                    newInviteCode,
                    leagueId
                ]
            );
        }

        const isSchedulingDraft = (draft_status === "SCHEDULED" && draft_date);

        if(isSchedulingDraft) {
            await generateDraftOrder(client, leagueId, draft_date, true);
        }

        // return new values
        const updatedQuery = `
            SELECT 
                fl.id,
                fl.league_name,
                fl.commissioner_id,
                fl.max_number_teams,
                fl.invite_code,
                fl.draft_status,
                fl.draft_date,
                fl.created_at,
                json_build_object(
                    'max_lineup_points', ls.max_lineup_points,
                    'max_roster_size', ls.max_roster_size
                ) AS settings
            FROM fantasy_leagues fl
            LEFT JOIN league_settings ls ON fl.id = ls.league_id
            WHERE fl.id = $1;
        `;

        const { rows } = await client.query(updatedQuery, [leagueId]);

        await client.query('COMMIT');

        return res.status(200).json(rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating league:', error);
        throw error
    } finally {
        client.release();
    }
});

const joinLeagueByCode = asyncHandler(async (req, res) => {
    const { invite_code } = req.body;
    const userId = req.user.id;
    if (!userId){
        throw ApiError.unauthorized('User ID is required.');
    }

    if (!invite_code || typeof invite_code !== 'string') {
        throw ApiError.badRequest('A valid invite code is required.');
    }

    const leagueResult = await db.query(
        `SELECT id, league_name, commissioner_id, max_number_teams, invite_code, draft_status, draft_date, created_at FROM fantasy_leagues
        WHERE invite_code = $1`,
        [invite_code.trim().toUpperCase()]
    );

    if (leagueResult.rows.length === 0) {
        throw ApiError.notFound('Invalid invite code. League not found.');
    }

    if (leagueResult.rows.length > 1) {
        throw ApiError.conflict('Multiple leagues with the same invite code. Please ask you admin to create a new code.');
    }

    const league = leagueResult.rows[0];

    const memberCheck = await db.query('SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2',
        [league.id, userId]
    );

    if (memberCheck.rows.length > 0 ) {
        throw ApiError.conflict('You are already a member of this league.');
    }

    const capacityCheck = await db.query(
        `SELECT COUNT(*) FROM league_members
        WHERE league_id = $1`,
        [league.id]
    );

    if (parseInt(capacityCheck.rows[0].count, 10) >= league.max_number_teams) {
        throw ApiError.badRequest ('This league has reached its maximum team capacity');
    }

    await db.query(
        `INSERT INTO league_members (league_id, user_id, role)
        VALUES ($1, $2, $3)`,
        [league.id, userId, 'MEMBER']
    );

    return res.status(200).json({
        message: 'Succesfully joined league!', 
        league: league
    });
});

const getMemberships = asyncHandler( async(req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }

    const getQuery = `
    SELECT 
        lm.id AS id,
        lm.league_id AS league_id,
        lm.user_id AS user_id,
        lm.role AS role,
        lm.joined_at AS joined_at,
        l.league_name AS league_name,
        ft.team_name AS fantasy_team_name
    FROM league_members lm
    JOIN fantasy_leagues l
        ON lm.league_id = l.id
    LEFT JOIN fantasy_teams ft
        ON lm.league_id = ft.league_id
        AND lm.user_id = ft.user_id
    WHERE lm.user_id = $1;
    `;

    const { rows } = await db.query(getQuery, [userId]);

    res.status(200).json(rows);
});

const getAllMembers = asyncHandler(async(req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    
    const leagueId = parseInt(req.query.league_id, 10);
    if (isNaN(leagueId)) {
        throw ApiError.badRequest('Invalid league ID.');
    }

    // 1. Authorization Check: Ensure the requesting user belongs to the requested league
    const membershipCheckQuery = `
        SELECT 1 FROM league_members 
        WHERE league_id = $1 AND user_id = $2;
    `;
    const { rowCount } = await db.query(membershipCheckQuery, [leagueId, userId]);
    
    if (rowCount === 0) {
        throw ApiError.forbidden('You are not a member of this league.');
    }
    
    const getQuery = `
    SELECT 
        lm.id AS id,
        lm.league_id AS league_id,
        lm.user_id AS user_id,
        lm.role AS role,
        lm.joined_at AS joined_at,
        l.league_name AS league_name,
        ft.team_name AS fantasy_team_name
    FROM league_members lm
    JOIN fantasy_leagues l
        ON lm.league_id = l.id
    LEFT JOIN fantasy_teams ft
        ON lm.league_id = ft.league_id
        AND lm.user_id = ft.user_id
    WHERE lm.league_id = $1;
    `;

    const { rows } = await db.query(getQuery, [leagueId]);

    res.status(200).json(rows);
});


module.exports = {
    createLeague,
    getLeagues,
    getLeagueById,
    updateLeagueById,
    joinLeagueByCode,
    getMemberships,
    getAllMembers
};