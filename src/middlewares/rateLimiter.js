const rateLimit = require('express-rate-limit');

const registerLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes window
    max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 registrations per IP adress
    standardHeaders: true,
    legacyHeaders: false, 
    message: {
        error: 'Too many account creation attempts from this IP. Please try again after 15 minutes.'
    }
});

const loginLimiter = rateLimit({
    windowMs: 15*60*1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts. Please try again later.'
    }
});

module.exports = {
    registerLimiter, 
    loginLimiter
}