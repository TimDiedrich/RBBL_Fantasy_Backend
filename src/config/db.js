const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Helper function to get the correct connection config based on the current environment
const getPoolConfig = () => {
    // If DATABASE_URL is set (like in .env.test or production), use it
    if (process.env.DATABASE_URL) {
        return { 
            connectionString: process.env.DATABASE_URL,
            ssl: isProduction ?  { rejectUnauthorized: false }: false,
            max: 20, // Max number of clients on pool
            idleTimeoutMillis: 30000, // Close idle clients after 30s
            connectionTimoutMillis: 2000, // Return error after 2s if connection cannot be established
        };
    }

    // Otherwise, fall back to individual environment variables
    return {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        ssl: isProduction ?  { rejectUnauthorized: false }: false,
        max: 20, // Max number of clients on pool
        idleTimeoutMillis: 30000, // Close idle clients after 30s
        connectionTimeoutMillis: 2000, // Return error after 2s if connection cannot be established

    };
};

const pool = new Pool(getPoolConfig())


pool.query('SELECT NOW()', (err, res) => {
    if(err) {
        console.error('Database connection failure', err.stack);
    } else {
        console.log('Connected to PostgreSQL successfully at:', res.rows[0].now);
    }
});

// Error listener to prevent idle client crashes from killing app
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    
    // Single client connection to be held for transactions
    connect: () => pool.connect(),
    end: () => pool.end(),
}