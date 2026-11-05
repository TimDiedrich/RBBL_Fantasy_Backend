const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const requireLeagueMember = async (leagueId, userId, queryable = db) => {
    const result = await queryable.query(
        `SELECT 1 FROM league_members WHERE league_id = $1 AND user_id = $2;`,
        [leagueId, userId]
    );

    if (result.rowCount === 0) {
        throw ApiError.forbidden('You are not a member of this league.');
    }
};

const requireLeagueCommissioner = async (leagueId, userId, queryable = db) => {
    const result = await queryable.query(
        `SELECT commissioner_id FROM fantasy_leagues WHERE id = $1;`,
        [leagueId]
    );

    if (result.rows.length === 0) {
        throw ApiError.notFound('League not found.');
    }

    if (Number(result.rows[0].commissioner_id) !== Number(userId)) {
        throw ApiError.forbidden('Only the commissioner can perform this action.');
    }
};

const requireTeamOwner = async (teamId, userId, queryable = db) => {
    const result = await queryable.query(
        `SELECT id, league_id, user_id FROM fantasy_teams WHERE id = $1;`,
        [teamId]
    );

    if (result.rows.length === 0) {
        throw ApiError.notFound('Fantasy team not found.');
    }

    const team = result.rows[0];
    if (Number(team.user_id) !== Number(userId)) {
        throw ApiError.forbidden('You do not own this fantasy team.');
    }

    return team;
};

const requireTeamLeagueMember = async (teamId, userId, queryable = db) => {
    const result = await queryable.query(
        `SELECT league_id FROM fantasy_teams WHERE id = $1;`,
        [teamId]
    );

    if (result.rows.length === 0) {
        throw ApiError.notFound('Fantasy team not found.');
    }

    await requireLeagueMember(result.rows[0].league_id, userId, queryable);
};

module.exports = {
    requireLeagueMember,
    requireLeagueCommissioner,
    requireTeamOwner,
    requireTeamLeagueMember
};