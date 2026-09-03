const express = require('express');
const os = require('os');
const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../config/db');

// Helper: Check Database Connection with a timeout
const checkDatabase = async () => {
    const start = Date.now();
    try {
        await db.query('SELECT 1');
        return {
            status: 'healthy', 
            latency_ms: Date.now() - start
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
};

const status = asyncHandler(async(req, res) => {
    const startTime = Date.now();

    const [dbHealth] = await Promise.all([
        checkDatabase()
    ]);

    const memoryUsage = process.memoryUsage();
    const systemMemory = {
        free_mb: Math.round(os.freemem() / 1024 / 1024),
        total_mb: Math.round(os.totalmem() / 1024 / 1024)
    };

    // Determine overall health status
    const isHealthy = dbHealth.status === 'healthy';
    const overallStatus = isHealthy ? 'ok' : 'degraded';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    execution_time_ms: Date.now() - startTime,
    system: {
      memory: {
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        system_free_mb: systemMemory.free_mb
      },
      cpu_load: os.loadavg() // Returns [1min, 5min, 15min] load averages
    },
    services: {
      database: dbHealth
    }
  });
});

module.exports = {
    status
}