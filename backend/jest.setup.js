/**
 * Jest Setup File
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-minimum-32-chars';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = 'nigerian_directory_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = 5001; // Different port for tests

// Suppress console output in tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
    // error is not suppressed so we see actual errors
};

// Global timeout for all tests
jest.setTimeout(10000);
