const ApiError = require('./ApiError');

const handlePostgresError = (err) => {
    switch (err.code) {

        // Unique contraint violation
        case '23505': {
            if (err.constraint?.includes('league_name')){
                return ApiError.badRequest('A league with this name already exists.');
            }
            if (err.constraint?.includes('invite_code')) {
                return ApiError.badRequest('Invite code collision. Please try again');
            }
            return ApiError.badRequest('A record with this unique value already exists');
        }

        case '23503':
            return ApiError.badRequest('Referenced entity (e.q., user, team, or league) does not exist');
        
        case '22P02':
            return ApiError.badRequest('Invalid parameter format passed to database.');

        case '23502':
            return ApiError.badRequest('Missing required database field.');

        default: return null; //Not a mapped Postgres error
    }
};

module.exports = handlePostgresError;