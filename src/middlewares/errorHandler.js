const ApiError = require('../utils/ApiError');
const handlePostgresError = require('../utils/handlePostgresError');

const errorHandler = (err, req, res, next) => {
    const pgError = handlePostgresError(err);
    if (pgError) {
        err = pgError;
    }

    if (err instanceof SyntaxError && err.status === 400 && Object.prototype.hasOwnProperty.call(err, 'body')) {
        err = ApiError.badRequest('Malformed JSON request body.');
    }

    const candidateStatus = err.statusCode || err.status;
    const statusCode = Number.isInteger(candidateStatus) && candidateStatus >= 400 && candidateStatus < 600
        ? candidateStatus
        : 500;
    const isPublicError = err.isOperational === true && statusCode < 500;
    const fallbackErrors = {
        400: { code: 'BAD_REQUEST', message: 'Invalid request.' },
        401: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
        403: { code: 'FORBIDDEN', message: 'You are not allowed to perform this action.' },
        404: { code: 'NOT_FOUND', message: 'Resource not found.' },
        409: { code: 'CONFLICT', message: 'The request conflicts with the current resource state.' },
        413: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' },
        429: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' }
    };
    const fallbackError = fallbackErrors[statusCode] || {
        code: 'REQUEST_ERROR',
        message: 'The request could not be processed.'
    };
    const error = {
        code: isPublicError ? err.code : statusCode < 500 ? fallbackError.code : 'INTERNAL_ERROR',
        message: isPublicError ? err.message : statusCode < 500 ? fallbackError.message : 'Internal server error.'
    };

    if (isPublicError && err.details !== undefined) {
        error.details = err.details;
    }

    if (statusCode >= 500) {
        console.error('Unhandled API error:', err);
    }

    return res.status(statusCode).json({ error });
};

module.exports = errorHandler;