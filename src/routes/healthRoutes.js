const express = require('express');
const router = express.Router();

const { status } = require('../controllers/healthController');

router.get('/status', status);

module.exports = router;