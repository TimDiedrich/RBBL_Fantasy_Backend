const bcrypt = require('bcrypt'); // check if there a better options
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { checkPasswordStrength } = require('../utils/passwordChecker');
const db = require('../config/db');
const asyncHandler = require('../middlewares/asyncHandler');
const ApiError = require('../utils/ApiError');

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const cleanUsername = username?.trim() || '';
    const cleanEmail = email?.toLowerCase().trim() || '';

    if (!cleanUsername || !cleanEmail || !password){
        throw ApiError.badRequest('Server Error: Username, email, and password are required.')
    }

    if (!validator.isEmail(cleanEmail)) {
        throw ApiError.badRequest('Please provide a valid email address.');
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if(!usernameRegex.test(cleanUsername)) {
        throw ApiError.badRequest('Username must be 3-30 characters long and contain only letters, numbers, or underscores.');
    }


    if(password.length < 8){
        throw ApiError.badRequest('Password must be at least 8 characters long.')
    }

    const passwordCheck = checkPasswordStrength(password);

    if(!passwordCheck.isValid) {
        throw ApiError.badRequest(passwordCheck.warning);
    }

    try {
        const saltRounds = 12;
        const pwHash = await bcrypt.hash(password, saltRounds);

        const insertQuery = `
        INSERT INTO users (username, email, pw_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email, created_at;
        `;

        const { rows } = await db.query(insertQuery, [cleanUsername, cleanEmail, pwHash]);
        const newUser = rows[0];

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('FATAL ERROR: JWT_SECRET environment variable is missing!');
            return res.status(500).json({ error: 'Internal server configuration error.' });
        }

        const token = jwt.sign(
            { userId: newUser.id, username:newUser.username },
            jwtSecret,
            { expiresIn: '7d' } // What time for expiration should I use
        );

        res.status(201).json({
            message: 'User registered successfully!',
            user: newUser,
            token,
        });

    } catch (error) {
        if(error.code === '23505'){
            return res.status(400).json({ error: 'Username or email already exists.' });
        }
        console.error('Registration Error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});


const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const cleanUsername = username?.trim() ||'';
    const rawPassword = password || '';

    if (!cleanUsername || !rawPassword){
        ApiError.badRequest('Server Error: Username and password are required');
    }

    const getQuery = `
        SELECT id, username, email, pw_hash FROM users
        WHERE username = $1;
    `;

    const { rows } = await db.query(getQuery, [cleanUsername]);
    const foundUser = rows[0];

    if(!foundUser){
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(rawPassword, foundUser.pw_hash)
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('[Security Error] JWT_SECRET is missing');
        return res.status(500).json({ error: 'Internal server configuration error.' });
    }

    const token = jwt.sign(
        {userId: foundUser.id, username: foundUser.username },
        jwtSecret,
        { expiresIn: '7d' }
    );

    return res.status(200).json({
        token,
        user: {
            id: foundUser.id,
            username: foundUser.username,
            email: foundUser.email
        }
    });
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if(!userId) {
        throw ApiError.unauthorized('User ID is required.');
    }
    const getQuery = `
        SELECT id, username, email, created_at FROM users
        WHERE id = $1;
    `;

    const { rows } = await db.query(getQuery, [userId]);

    return res.status(200).json(rows[0]);
});

module.exports = {
    registerUser,
    loginUser,
    getCurrentUser,
};