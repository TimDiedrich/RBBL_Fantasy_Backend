const request = require('supertest');
const { app } = require('../app');
const swaggerSpec = require('../swaggerSpec');

describe('OpenAPI documentation', () => {
    it('generates the documented versioned API paths', () => {
        expect(swaggerSpec.openapi).toBe('3.0.3');
        expect(swaggerSpec.paths['/auth/register'].post).toBeDefined();
        expect(swaggerSpec.paths['/fantasy-leagues/{leagueId}/members'].get).toBeDefined();
        expect(swaggerSpec.paths['/fantasy-teams/{teamId}/roster'].put).toBeDefined();
        expect(swaggerSpec.paths['/health'].get).toBeDefined();
    });

    it('serves the generated specification and Swagger UI', async () => {
        const specificationResponse = await request(app).get('/api/v1/openapi.json');
        expect(specificationResponse.status).toBe(200);
        expect(specificationResponse.body.info.title).toBe('RBBL Fantasy Backend API');

        const uiResponse = await request(app).get('/api/v1/docs/');
        expect(uiResponse.status).toBe(200);
        expect(uiResponse.text).toContain('Swagger UI');
    });
});