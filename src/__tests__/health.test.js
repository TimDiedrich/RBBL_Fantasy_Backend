const request = require('supertest');
const { app } = require('../app');

describe('Health Check Endpoint', () => {
    
    it('should return a successful health status', async () => {
        const response = await request(app).get('/api/v1/health');

        // Expect either 200 (if DB is up) or handle it
        expect([200, 503]).toContain(response.status);
        
        // Check structure of response
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime_seconds');
        expect(response.body).toHaveProperty('execution_time_ms');
        expect(response.body).toHaveProperty('system');
        expect(response.body.system).toHaveProperty('memory');
        expect(response.body.system).toHaveProperty('cpu_load');
        expect(response.body).toHaveProperty('services');
        expect(response.body.services).toHaveProperty('database');
    });


    it('should return 404 for unknown routes', async () => {
        const response = await request(app).get('/api/v1/non-existent-route');

        expect(response.status).toBe(404);
        expect(response.body.error).toEqual({
            code: 'NOT_FOUND',
            message: 'Route not found.'
        });
    });
});