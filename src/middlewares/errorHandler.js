const ApiError = require('../utils/ApiError');
const handlePostgresError = require('../utils/handlePostgresError');

const errorHandler = (err, req, res, next) => {

    const pgError = handlePostgresError(err);
    if (pgError) {
        err = pgError;
    }
    
    let statusCode = err.statusCode || 500; // default 500 internal error
    let message = err.message || 'Internal server error';

    if (statusCode === 500) {
        console.error('UNHANDLED ERROR TO DEBUG:', err);
    }

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        error: message,

        ...(process.env.NODE_ENV === 'development' && {stack: err.stack }), // Hide stack traces in production
    });
};

module.exports = errorHandler;