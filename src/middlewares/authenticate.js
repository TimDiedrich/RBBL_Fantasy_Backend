const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(ApiError.unauthorized('Access token is required.'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = { id: decoded.userId, username: decoded.username };

        next();
    } catch {
        return next(ApiError.unauthorized('Access token is invalid or expired.'));
    }
};

module.exports = authenticateToken;