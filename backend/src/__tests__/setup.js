/**
 * Test Setup & Utilities
 */

const { pool } = require('../config/database');
const { redis } = require('../config/redis');
const request = require('supertest');
const app = require('../app');

/**
 * Clean database before/after tests
 */
async function cleanDatabase() {
    try {
        await pool.query('DELETE FROM page_views');
        await pool.query('DELETE FROM enrichment_queue');
        await pool.query('DELETE FROM crawl_logs');
        await pool.query('DELETE FROM claims');
        await pool.query('DELETE FROM schools');
        await pool.query('DELETE FROM locations');
        await pool.query('DELETE FROM users');
    } catch (error) {
        console.error('Database cleanup error:', error);
    }
}

/**
 * Clean Redis before/after tests
 */
async function cleanRedis() {
    try {
        await redis.flushdb();
    } catch (error) {
        console.error('Redis cleanup error:', error);
    }
}

/**
 * Setup test database
 */
async function setupTestDatabase() {
    await cleanDatabase();
    await cleanRedis();
}

/**
 * Teardown test database
 */
async function teardownTestDatabase() {
    await cleanDatabase();
    await cleanRedis();
}

/**
 * Create test user
 */
async function createTestUser(userData = {}) {
    const defaultData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
    };

    const finalData = { ...defaultData, ...userData };

    const response = await request(app)
        .post('/api/auth/register')
        .send(finalData);

    return response.body;
}

/**
 * Login test user
 */
async function loginTestUser(email = 'test@example.com', password = 'password123') {
    const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

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
        name: 'Test School',
        slug: 'test-school',
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
    createTestClaim
};
