const ApiError = require('./ApiError');

const requirePositiveInteger = (value, fieldName) => {
    const parsedValue = Number(value);
    if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
        throw ApiError.badRequest(`Valid ${fieldName} is required.`);
    }
    return parsedValue;
};

const acknowledgeSuccess = (acknowledge, data) => {
    const response = { ok: true, data };
    if (typeof acknowledge === 'function') {
        acknowledge(response);
    }
    return response;
};

const sendSocketError = (socket, acknowledge, error) => {
    const socketError = {
        code: error.isOperational && error.code ? error.code : 'INTERNAL_ERROR',
        message: error.isOperational ? error.message : 'Draft action could not be completed.'
    };

    if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: socketError });
    }
    socket.emit('draft:error', socketError);
};

module.exports = {
    requirePositiveInteger,
    acknowledgeSuccess,
    sendSocketError
};