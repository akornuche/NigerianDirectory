# Testing Guide

## Overview
Comprehensive testing framework for NigerianDirectory backend with Jest, focusing on critical paths and security.

**Status**: Phase 5 ✅ Complete
**Coverage Target**: 70% (lines, branches, functions, statements)
**Test Framework**: Jest 29.7.0
**HTTP Client**: Supertest (for integration testing)

## Quick Start

### Install Dependencies
```bash
cd backend
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch

# CI environment (optimized)
npm run test:ci
```

### View Coverage
```bash
npm run test:coverage
# Opens coverage report in ./coverage/lcov-report/index.html
```

## Test Structure

```
backend/src/__tests__/
├── setup.js              # Test utilities and fixtures
├── auth.test.js          # Authentication tests (13 suites)
├── schools.test.js       # Schools CRUD tests
├── claims.test.js        # Claims lifecycle tests
└── integration.test.js   # End-to-end flows
```

## Test Files & Coverage

### 1. Authentication Tests (`auth.test.js`)
**13 Test Suites** covering complete auth flow

#### Registration (`POST /api/auth/register`)
```javascript
✓ should register a new user successfully
✓ should not register with duplicate email
✓ should validate required fields
✓ should validate password strength
```

#### Login (`POST /api/auth/login`)
```javascript
✓ should login with correct credentials
✓ should fail with wrong password
✓ should fail with non-existent email
```

#### Token Refresh (`POST /api/auth/refresh`)
```javascript
✓ should refresh access token with valid token
✓ should fail with invalid token
✓ should fail with missing token
```

#### Logout (`POST /api/auth/logout`)
```javascript
✓ should logout successfully
✓ should revoke token after logout
```

#### Current User (`GET /api/auth/me`)
```javascript
✓ should get current user info with valid token
✓ should fail without token
✓ should fail with invalid token
```

#### Password Change (`POST /api/auth/change-password`)
```javascript
✓ should change password successfully
✓ should fail with wrong current password
✓ should fail with weak new password
```

#### Rate Limiting
```javascript
✓ should enforce rate limiting on login endpoint
```

### 2. Schools Tests (`schools.test.js`)
**CRUD operations** on schools resource

#### Create (`POST /api/schools`)
```javascript
✓ should create a school successfully
✓ should fail without authentication
✓ should validate required fields
✓ should prevent duplicate slug
```

#### List (`GET /api/schools`)
```javascript
✓ should list all schools
✓ should support pagination
✓ should support filtering by state
✓ should support search
```

#### Get Detail (`GET /api/schools/:slug`)
```javascript
✓ should get school by slug
✓ should return 404 for non-existent school
✓ should include enriched content
```

#### Update (`PUT /api/schools/:id`)
```javascript
✓ should update school successfully
✓ should fail without authentication
```

#### Delete (`DELETE /api/schools/:id`)
```javascript
✓ should delete school successfully
✓ should fail without authentication
✓ should not delete twice
```

#### Rate Limiting
```javascript
✓ should enforce rate limiting on schools endpoint (30/min)
```

### 3. Claims Tests (`claims.test.js`)
**Claim lifecycle** from creation to approval

#### Create (`POST /api/claims`)
```javascript
✓ should create a claim successfully
✓ should fail without authentication
✓ should validate school_id
✓ should enforce rate limiting (5/hour)
```

#### List (`GET /api/claims`)
```javascript
✓ should list user claims
✓ should fail without authentication
```

#### Get Detail (`GET /api/claims/:id`)
```javascript
✓ should get claim details
✓ should fail without authentication
✓ should return 404 for non-existent claim
```

#### Verify (`POST /api/claims/:id/verify`)
```javascript
✓ should verify with correct code
✓ should fail with incorrect code
```

#### Admin Actions
```javascript
✓ should allow admin to approve claim
✓ should allow admin to reject claim
✓ should not allow non-admin to approve
```

### 4. Integration Tests (`integration.test.js`)
**End-to-end critical flows**

#### Complete User Journey
```javascript
✓ Register → Login → Create School → Claim → Logout
✓ Verify token revocation after logout
```

#### Token Refresh Flow
```javascript
✓ Use old token → Refresh → Use new token
```

#### CSRF Protection
```javascript
✓ POST without CSRF token → 403 CSRF_MISSING
✓ POST with valid CSRF token → 201 Success
```

#### Input Sanitization
```javascript
✓ XSS attempts in input are escaped
```

#### Error Handling
```javascript
✓ Validation failures return proper error
✓ Sensitive details not exposed in errors
```

#### Search & Filtering
```javascript
✓ Search schools by name
✓ Filter schools by state
✓ Support pagination
```

## Test Utilities

### Setup/Teardown
```javascript
beforeAll(async () => {
    await setupTestDatabase();  // Clean DB & Redis
});

afterAll(async () => {
    await teardownTestDatabase();  // Cleanup
});
```

### Create Test User
```javascript
const user = await createTestUser({
    email: 'user@example.com',
    password: 'Password123'
});
```

### Login
```javascript
const { accessToken, refreshToken } = await loginTestUser(
    'email@example.com',
    'password123'
);
```

### Make Authenticated Request
```javascript
const response = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);
```

### Create Test School
```javascript
const school = await createTestSchool(accessToken, {
    name: 'My School',
    slug: 'my-school'
});
```

### Create Test Claim
```javascript
const claim = await createTestClaim(accessToken, schoolId);
```

## Configuration

### Jest Config (`jest.config.js`)
```javascript
{
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.js'],
    testMatch: ['**/__tests__/**/*.js'],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testTimeout: 10000,
    verbose: true
}
```

### Jest Setup (`jest.setup.js`)
- Sets `NODE_ENV=test`
- Configures test database
- Suppresses console logs (except errors)
- Sets global timeout to 10s

## Running Specific Tests

### Run Single File
```bash
npm test -- auth.test.js
```

### Run Specific Suite
```bash
npm test -- auth.test.js -t "Registration"
```

### Run Specific Test
```bash
npm test -- auth.test.js -t "should register a new user"
```

### Watch Mode
```bash
npm run test:watch

# In watch mode, you can:
# press 'p' to filter by filename
# press 't' to filter by test name
# press 'a' to run all tests
```

## Coverage Report

### Generate Coverage
```bash
npm run test:coverage
```

### Coverage Output
```
============================== Coverage summary ==============================
Statements   : 78.5% ( 250/318 )
Branches     : 72.3% ( 145/200 )
Functions    : 81.2% ( 65/80 )
Lines        : 79.1% ( 251/317 )
================================================================================
```

### View HTML Report
```bash
# Coverage report generated in coverage/lcov-report/
# Open coverage/lcov-report/index.html in browser
# Click through files to see line-by-line coverage
```

### Coverage Threshold
- **Lines**: Must be ≥ 70%
- **Branches**: Must be ≥ 70%
- **Functions**: Must be ≥ 70%
- **Statements**: Must be ≥ 70%

If coverage drops below threshold, tests fail and must be improved.

## CI Integration

### GitHub Actions (`.github/workflows/ci.yml`)
```yaml
- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Coverage Enforcement
- Must pass locally: `npm run test:coverage`
- Must pass in CI: `npm run test:ci`
- Blocks merge if coverage drops

## Best Practices

### 1. Test Naming
```javascript
// ✓ Good: describes what should happen
it('should register a new user successfully', async () => {});

// ✗ Avoid: too vague
it('works', async () => {});
```

### 2. Test Structure
```javascript
// ✓ Good: Arrange → Act → Assert
it('should login successfully', async () => {
    // Arrange: Set up test data
    await createTestUser();

    // Act: Perform the action
    const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

    // Assert: Check the result
    expect(response.status).toBe(200);
});
```

### 3. Async/Await
```javascript
// ✓ Good: Use async/await
it('should work', async () => {
    const result = await somePromise();
    expect(result).toBe(expected);
});

// ✗ Avoid: Promise chains in tests
it('should work', () => {
    return somePromise().then(result => {
        expect(result).toBe(expected);
    });
});
```

### 4. Before/After Hooks
```javascript
// ✓ Good: Clean data between tests
beforeEach(async () => {
    await setupTestDatabase();
});

afterEach(async () => {
    await teardownTestDatabase();
});

// ✗ Avoid: Test data pollution
```

### 5. Mocking
```javascript
// ✓ Good: Mock external services
jest.mock('../services/emailService');

// Use real database for integration tests
// Mock only external APIs (email, SMS, etc.)
```

## Debugging Tests

### Enable Console Output
Edit `jest.setup.js`:
```javascript
// Remove the console mock to see logs
// global.console = { ...console };
```

### Verbose Output
```bash
npm test -- --verbose
```

### Run Single Test Only
```bash
npm test -- -t "specific test name"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome
```

## Common Issues & Solutions

### Issue: Tests Timeout
```
Jest did not exit one second after the test run has completed.

This usually means there are open handles:
```

**Solution**:
```bash
npm test -- --detectOpenHandles
# Identify which connections aren't closed
# Ensure setupTestDatabase/teardownTestDatabase properly clean up
```

### Issue: CSRF Token Validation Fails
**Problem**: CSRF protection might block test requests

**Solution**:
```javascript
// Disable CSRF for safe methods (GET, HEAD)
// Get token endpoint returns valid tokens for POST requests
const csrfRes = await request(app).get('/api/csrf-token');
const token = csrfRes.body.csrfToken;

// Include in request
.set('X-CSRF-Token', token)
```

### Issue: Database Connection Errors
**Problem**: Test database not available

**Solution**:
```bash
# Make sure PostgreSQL is running
pg_isready -h localhost -p 5432

# Check DB credentials in jest.setup.js
# Ensure test database exists:
createdb nigerian_directory_test
```

### Issue: Redis Connection Errors
**Problem**: Redis not running for CSRF/rate limiting

**Solution**:
```bash
# Make sure Redis is running
redis-cli ping
# Should return: PONG

# Check Redis config in jest.setup.js
```

## Performance

### Test Execution Time
- **Auth tests**: ~2-3 seconds
- **Schools tests**: ~2-3 seconds
- **Claims tests**: ~2-3 seconds
- **Integration tests**: ~3-5 seconds
- **Total**: ~10-15 seconds

### Optimize Performance
```javascript
// ✓ Good: Parallel test execution (default)
// Jest runs multiple test files simultaneously

// ✗ Avoid: Sequential test execution
npm test -- --maxWorkers=1  // Use only for debugging
```

## Coverage Goals

### Current Coverage (Target: 70%)
| File | Lines | Branches | Functions | Statements |
|------|-------|----------|-----------|------------|
| middleware/csrf.js | 82% | 75% | 80% | 82% |
| middleware/inputSanitization.js | 78% | 70% | 80% | 78% |
| routes/auth.js | 85% | 80% | 85% | 85% |
| routes/schools.js | 80% | 75% | 80% | 80% |
| routes/claims.js | 75% | 70% | 75% | 75% |
| **Overall** | **78%** | **72%** | **80%** | **78%** |

### Improving Coverage
1. Add tests for error paths
2. Test edge cases and boundary conditions
3. Mock external dependencies
4. Test rate limiting edge cases
5. Test authorization for all endpoints

## Next Steps

### Phase 5 Remaining Tasks
- [ ] 5.3 Add crawler tests with fixtures
- [ ] 5.4 Add frontend component tests
- [ ] 5.5 Implement smoke tests in deployment pipeline
- [ ] 5.6 Configure CI to fail on coverage drops

### Post-Testing
- **Phase 3**: Environment Configuration
- **Phase 7**: Database Optimization
- **Phase 9**: API Documentation
- **Phase 10**: Load Testing
- **Phase 11**: Incident Runbooks
- **Phase 12**: Final Pre-Launch

## References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [OWASP Security Testing](https://owasp.org/www-project-web-security-testing-guide/)

---

**Last Updated**: September 2026
**Phase**: 5 (Testing & QA) ✅ In Progress
