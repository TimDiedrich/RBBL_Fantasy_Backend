const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '.env.test'),
    override: false
});

console.log('[Jest Env] Test environment loaded.');