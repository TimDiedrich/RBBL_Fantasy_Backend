class ApiError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message = 'Bad request', details) {
        return new ApiError(400, 'BAD_REQUEST', message, details);
    }

    static unauthorized(message = 'Authentication required.') {
        return new ApiError(401, 'UNAUTHENTICATED', message);
    }

    static forbidden(message = 'You are not allowed to perform this action.') {
        return new ApiError(403, 'FORBIDDEN', message);
    }

    static notFound(message = 'Resource not found.') {
        return new ApiError(404, 'NOT_FOUND', message);
    }

    static conflict(message = 'The request conflicts with the current resource state.') {
        return new ApiError(409, 'CONFLICT', message);
    }

    static tooManyRequests(message = 'Too many requests. Please try again later.') {
        return new ApiError(429, 'TOO_MANY_REQUESTS', message);
    }

    static internal(message = 'Internal server error.') {
        return new ApiError(500, 'INTERNAL_ERROR', message);
    }
}

module.exports = ApiError;