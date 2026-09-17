const express = require('express');
const router = express.Router();
const { getDraftOrder } = require('../controllers/draftController');
const authenticateToken = require('../middlewares/authenticate');

router.get('/:id', authenticateToken, getDraftOrder);

module.exports = router;