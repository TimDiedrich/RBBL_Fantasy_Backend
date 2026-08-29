const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController');
const { registerLimiter, loginLimiter } = require('../middlewares/rateLimiter')
const authenticateToken = require('../middlewares/authenticate');

// GET /api/users
//router.get('/', userController.getUser);

// SET /api/users/
router.post('/register', registerLimiter, userController.registerUser);

router.post('/login', loginLimiter, userController.loginUser);

router.get('/current', authenticateToken, userController.getCurrentUser);

module.exports = router;