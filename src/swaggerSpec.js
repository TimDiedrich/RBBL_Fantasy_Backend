const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const routeGlob = path.relative(
    process.cwd(),
    path.join(__dirname, 'routes', '*.js')
).split(path.sep).join('/');

module.exports = swaggerJSDoc({
    failOnErrors: true,
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'RBBL Fantasy Backend API',
            version: '1.0.0',
            description: 'HTTP API contract for the RBBL Fantasy Backend.'
        },
        servers: [
            { url: '/api/v1' }
        ],
        tags: [
            { name: 'Auth' },
            { name: 'Users' },
            { name: 'Leagues' },
            { name: 'Teams' },
            { name: 'Players' },
            { name: 'Games' },
            { name: 'Health' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                ApiErrorResponse: {
                    type: 'object',
                    required: ['error'],
                    properties: {
                        error: {
                            type: 'object',
                            required: ['code', 'message'],
                            properties: {
                                code: { type: 'string', example: 'BAD_REQUEST' },
                                message: { type: 'string', example: 'The request is invalid.' },
                                details: { type: 'object', nullable: true, additionalProperties: true }
                            }
                        }
                    }
                },
                SuccessEnvelope: {
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: {
                            description: 'The endpoint result.',
                            oneOf: [
                                { type: 'object', additionalProperties: true },
                                { type: 'array', items: { type: 'object', additionalProperties: true } }
                            ]
                        },
                        meta: { type: 'object', additionalProperties: true }
                    }
                },
                HealthResponse: {
                    type: 'object',
                    required: ['status', 'timestamp', 'services'],
                    properties: {
                        status: { type: 'string', enum: ['ok', 'degraded'] },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime_seconds: { type: 'integer' },
                        execution_time_ms: { type: 'integer' },
                        system: { type: 'object', additionalProperties: true },
                        services: { type: 'object', additionalProperties: true }
                    }
                }
            }
        }
    },
    apis: [routeGlob]
});