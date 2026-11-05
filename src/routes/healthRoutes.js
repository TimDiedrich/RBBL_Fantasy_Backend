const express = require('express');
const router = express.Router();

const { status } = require('../controllers/healthController');

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check API and database health
 *     security: []
 *     responses:
 *       '200':
 *         description: API and database are healthy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/HealthResponse' }
 *       '503':
 *         description: API is running but a dependency is unhealthy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/HealthResponse' }
 */
router.get('/', status);

module.exports = router;