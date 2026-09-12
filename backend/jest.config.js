module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/server.js',
        '!src/app.js',
        '!src/__tests__/**/*.js',
        // Exclude files that require external dependencies for testing
        '!src/routes/admin.js',  // Requires app + auth
        '!src/routes/crawl.js',  // Requires app + crawler
        '!src/routes/views.js'   // Requires app
    ],
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/__tests__/**/*-service.test.js',
        '**/?(*.)+(spec|test).js'
    ],
    testPathIgnorePatterns: [
        '.*\\.skip$',
        '.*\\.disabled$'
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        },
        './src/services/': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        './src/utils/': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        './src/middleware/': {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testTimeout: 30000,
    verbose: false,
    forceExit: true,
    detectOpenHandles: false,
    bail: false,
    maxWorkers: 1
};
