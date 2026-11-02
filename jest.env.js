const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '.env.test'),
    override: true
});

console.log('[Jest Env] Loaded environment from .env.test. Target DB URL:', process.env.DATABASE_URL);