const swaggerSpec = require('../src/swaggerSpec');

const validateOpenApi = async () => {
    const parserModule = await import('@apidevtools/swagger-parser');
    const SwaggerParser = parserModule.default || parserModule;

    await SwaggerParser.validate(swaggerSpec);
    console.log('OpenAPI document is valid.');
};

validateOpenApi().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});