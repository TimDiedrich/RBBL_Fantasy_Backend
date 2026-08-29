const playerService = require('../services/playerService');
const asyncHandler = require('../middlewares/asyncHandler');
// const ApiError = require('../utils/ApiError');

const getPlayers = asyncHandler(async(req, res) => {
    const { team, position } = req.query;
    const players = await playerService.fetchPlayers({ team, position });
    res.json(players);
});

module.exports = {
    getPlayers,
}