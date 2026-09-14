const { Pool } = require('pg');

// Validate required environment variables
function validateDatabaseEnv() {
    const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
        const message = `❌ Missing required database environment variables: ${missing.join(', ')}\n` +
            `Set these variables in your .env file or deployment environment.\n` +
            `See .env.example for configuration instructions.`;
        
        // In Vercel serverless, log warning but don't exit
        if (process.env.VERCEL === '1') {
            console.warn(message);
            console.warn('Note: Database will be unavailable until connection succeeds');
        } else {
            console.error(message);
            process.exit(1);
        }
    }
}

// Only validate in production or when explicitly required
if (process.env.NODE_ENV === 'production' || process.env.STRICT_ENV_VALIDATION === 'true') {
    validateDatabaseEnv();
}

// Create connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nigerian_directory',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20, // Maximum number of connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection can't be established
});

// Test connection
async function testConnection() {
    const client = await pool.connect();
    try {
        await client.query('SELECT NOW()');
        return true;
    } finally {
        client.release();
    }
}

// Helper function for transactions
async function withTransaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Query helper with logging in development
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    
    return result;
}

module.exports = {
    pool,
    query,
    testConnection,
    withTransaction
};
