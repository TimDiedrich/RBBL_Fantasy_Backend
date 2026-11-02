const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController');
const { registerLimiter, loginLimiter } = require('../middlewares/rateLimiter')
const authenticateToken = require('../middlewares/authenticate');

router.post('/auth/register', registerLimiter, userController.registerUser);

router.post('/auth/login', loginLimiter, userController.loginUser);

router.get('/users/me', authenticateToken, userController.getCurrentUser);

module.exports = router;