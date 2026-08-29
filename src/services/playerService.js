const db = require('../config/db');

const fetchPlayers = async({ team, position }) => {
    let queryText = `SELECT * FROM fantasy_players;`
    const params = [];

    if (team) {
        params.push(team);
        queryText += `AND team_id = $${params.length}`;
    }

    if(position) {
        params.push(position);
        queryText += `AND position = $${params.length}`;
    }

    const { rows } = await db.query(queryText, params);
    return rows;
};

module.exports = {
    fetchPlayers,
}