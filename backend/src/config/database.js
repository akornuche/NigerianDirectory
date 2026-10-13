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

const isServerless = process.env.VERCEL === '1';

/**
 * Decide whether to use TLS.
 *
 * Managed providers such as Neon require TLS and reject plaintext
 * connections. Local development instances normally have no certificate, so
 * TLS is disabled for loopback hosts. Set DB_SSL explicitly to override.
 */
function resolveSsl() {
    const explicit = process.env.DB_SSL;

    if (explicit === 'true') {
        return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
    }
    if (explicit === 'false') {
        return false;
    }

    const host = process.env.DB_HOST || 'localhost';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';

    return isLocal ? false : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
}

/**
 * Build pool configuration.
 *
 * A single DATABASE_URL takes precedence when present, since managed
 * providers hand out connection strings. Otherwise discrete DB_* variables
 * are used.
 */
function buildPoolConfig() {
    const ssl = resolveSsl();

    // Each serverless invocation gets its own pool, so a large max would
    // multiply across concurrent instances and exhaust the provider's
    // connection limit.
    const max = Number(process.env.DB_POOL_MAX) || (isServerless ? 3 : 20);

    // Managed providers may suspend idle compute and need time to wake, so
    // the connect timeout must be generous enough to cover a cold start.
    const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 15000;

    const shared = {
        max,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis,
        ssl,
    };

    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL, ...shared };
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'nigerian_directory',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ...shared,
    };
}

// Create connection pool
const pool = new Pool(buildPoolConfig());

// Surface pool-level failures instead of letting them crash the process.
pool.on('error', (error) => {
    console.error('Unexpected database pool error:', error.message);
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
