/**
 * Test Setup & Utilities
 */

const { pool } = require('../config/database');
const request = require('supertest');
const app = require('../app');

let redisAvailable = false;
let redis = null;

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
    try {
        const { redis: redisClient } = require('../config/redis');
        redis = redisClient;
        
        // Test Redis connection with timeout
        await Promise.race([
            redisClient.ping(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis timeout')), 5000)
            )
        ]);
        
        redisAvailable = true;
        return true;
    } catch (error) {
        console.warn('Redis not available, tests will continue with limited functionality');
        redisAvailable = false;
        // Create a mock redis for testing
        redis = {
            flushdb: jest.fn().mockResolvedValue('OK'),
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(0),
            expire: jest.fn().mockResolvedValue(0),
            incr: jest.fn().mockResolvedValue(1),
            decr: jest.fn().mockResolvedValue(0),
            scan: jest.fn().mockResolvedValue(['0', []]),
            ping: jest.fn().mockResolvedValue('PONG')
        };
        return false;
    }
}

/**
 * Clean database before/after tests
 */
async function cleanDatabase() {
    try {
        // Check if tables exist before deleting
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `;
        
        const result = await pool.query(tableExistsQuery);
        if (!result.rows[0].exists) {
            console.warn('Tables do not exist yet, skipping cleanup');
            return;
        }

        // Delete in reverse order of foreign key dependencies
        const tables = [
            'page_views',
            'enrichment_queue',
            'crawl_logs',
            'claims',
            'schools',
            'locations',
            'users'
        ];

        for (const table of tables) {
            try {
                await pool.query(`DELETE FROM ${table}`);
            } catch (error) {
                // Table might not exist, continue
                console.warn(`Could not delete from ${table}:`, error.message);
            }
        }
    } catch (error) {
        console.warn('Database cleanup error:', error.message);
    }
}

/**
 * Clean Redis before/after tests
 */
async function cleanRedis() {
    try {
        if (redis && typeof redis.flushdb === 'function') {
            await redis.flushdb();
        }
    } catch (error) {
        console.warn('Redis cleanup error:', error.message);
    }
}

/**
 * Setup test database
 */
async function setupTestDatabase() {
    try {
        // Initialize Redis first
        await initializeRedis();
        
        // Test database connection
        const testConnection = await pool.query('SELECT 1');
        if (!testConnection) {
            throw new Error('Cannot connect to database');
        }

        // Clean up
        await cleanDatabase();
        await cleanRedis();

        console.log('Test database setup complete');
    } catch (error) {
        console.error('Test database setup failed:', error.message);
        throw error;
    }
}

/**
 * Teardown test database
 */
async function teardownTestDatabase() {
    try {
        await cleanDatabase();
        await cleanRedis();
    } catch (error) {
        console.error('Test database teardown error:', error.message);
    }
}

/**
 * Create test user
 */
async function createTestUser(userData = {}) {
    const defaultData = {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'user'
    };

    const finalData = { ...defaultData, ...userData };

    const response = await request(app)
        .post('/api/auth/register')
        .send(finalData);

    if (response.status !== 201) {
        throw new Error(`Failed to create test user: ${response.status} - ${JSON.stringify(response.body)}`);
    }

    return response.body;
}

/**
 * Login test user
 */
async function loginTestUser(email = 'test@example.com', password = 'TestPassword123!') {
    const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

    if (response.status !== 200) {
        throw new Error(`Failed to login: ${response.status} - ${JSON.stringify(response.body)}`);
    }

    return response.body;
}

/**
 * Get authenticated request
 */
function getAuthenticatedRequest(token) {
    return request(app).set('Authorization', `Bearer ${token}`);
}

/**
 * Create test school
 */
async function createTestSchool(token, schoolData = {}) {
    const defaultData = {
        name: `Test School ${Date.now()}`,
        slug: `test-school-${Date.now()}`,
        type: 'private',
        state: 'Lagos',
        city: 'Lagos',
        area: 'Victoria Island',
        address: 'Test Address',
        gender: 'co-ed',
        day_school: true
    };

    const finalData = { ...defaultData, ...schoolData };

    const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${token}`)
        .send(finalData);

    if (response.status !== 201) {
        throw new Error(`Failed to create school: ${response.status} - ${JSON.stringify(response.body)}`);
    }

    return response.body;
}

/**
 * Create test claim
 */
async function createTestClaim(token, schoolId) {
    const response = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${token}`)
        .send({
            school_id: schoolId,
            verification_method: 'email'
        });

    if (response.status !== 201) {
        throw new Error(`Failed to create claim: ${response.status} - ${JSON.stringify(response.body)}`);
    }

    return response.body;
}

module.exports = {
    app,
    request,
    setupTestDatabase,
    teardownTestDatabase,
    cleanDatabase,
    cleanRedis,
    createTestUser,
    loginTestUser,
    getAuthenticatedRequest,
    createTestSchool,
    createTestClaim,
    getRedis: () => redis,
    isRedisAvailable: () => redisAvailable
};
