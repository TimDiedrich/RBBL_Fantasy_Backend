const db = require('./src/config/db');

beforeAll(async () => {
    // Optional: Run any global test setup or verify DB connection
    try {
        await db.query('SELECT 1');
        console.log('[Test Setup] Connected to test database successfully.');
    } catch (err) {
        console.error('[Test Setup] Failed to connect to test database:', err.message);
        process.exit(1);
    }
    });

    afterAll(async () => {
    // Close database pool connections after all tests finish to prevent Jest hanging
    await db.end();
});