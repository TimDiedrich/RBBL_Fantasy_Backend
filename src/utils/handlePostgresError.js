const ApiError = require('./ApiError');

const handlePostgresError = (err) => {
    switch (err.code) {

        // Unique contraint violation
        case '23505': {
            if (err.constraint?.includes('league_name')){
                return ApiError.conflict('A league with this name already exists.');
            }
            if (err.constraint?.includes('invite_code')) {
                return ApiError.conflict('Invite code collision. Please try again.');
            }
            return ApiError.conflict('A record with this unique value already exists.');
        }

        case '23503':
            return ApiError.badRequest('A referenced resource does not exist.');
        
        case '22P02':
            return ApiError.badRequest('A request value has an invalid format.');

        case '23502':
            return ApiError.badRequest('A required request value is missing.');

        default: return null; //Not a mapped Postgres error
    }
};

module.exports = handlePostgresError;