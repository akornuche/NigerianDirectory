/**
 * Integration Tests - End-to-End Critical Flows
 */

const {
    setupTestDatabase,
    teardownTestDatabase,
    loginTestUser,
    createTestSchool,
    request,
    app
} = require('./setup');

describe('Integration Tests - Critical Flows', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    describe('Complete User Journey', () => {
        test('should complete full registration → login → create → claim flow', async () => {
            // 1. Register new user
            const registerRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Journey User',
                    email: 'journey@example.com',
                    password: 'JourneyPass123!'
                });

            expect(registerRes.status).toBe(201);
            const userId = registerRes.body.user.id;
            const accessToken = registerRes.body.accessToken;

            // 2. Verify user can access protected endpoint
            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(meRes.status).toBe(200);
            expect(meRes.body.user.id).toBe(userId);

            // 3. Create a school
            const schoolRes = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Journey School',
                    slug: 'journey-school',
                    type: 'private',
                    state: 'Lagos',
                    city: 'Lagos',
                    area: 'Area',
                    address: 'Address',
                    gender: 'co-ed',
                    day_school: true
                });

            expect(schoolRes.status).toBe(201);
            const schoolId = schoolRes.body.id;

            // 4. Retrieve the school
            const getSchoolRes = await request(app)
                .get(`/api/schools/${schoolRes.body.slug}`);

            expect(getSchoolRes.status).toBe(200);
            expect(getSchoolRes.body.id).toBe(schoolId);

            // 5. Create a claim for the school
            const claimRes = await request(app)
                .post('/api/claims')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    school_id: schoolId,
                    verification_method: 'email'
                });

            expect(claimRes.status).toBe(201);
            expect(claimRes.body.status).toBe('pending');

            // 6. Logout
            const logoutRes = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    refreshToken: registerRes.body.refreshToken
                });

            expect(logoutRes.status).toBe(200);

            // 7. Verify token is revoked after logout
            const afterLogoutRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(afterLogoutRes.status).toBe(401);
        });
    });

    describe('Token Refresh Flow', () => {
        test('should successfully refresh token and continue working', async () => {
            // Login
            const loginRes = await loginTestUser('test@example.com', 'password123');
            const originalAccessToken = loginRes.accessToken;
            const refreshToken = loginRes.refreshToken;

            // Use original token
            let meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${originalAccessToken}`);

            expect(meRes.status).toBe(200);

            // Refresh token
            const refreshRes = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken });

            expect(refreshRes.status).toBe(200);
            const newAccessToken = refreshRes.body.accessToken;

            // Use new token
            meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${newAccessToken}`);

            expect(meRes.status).toBe(200);
        });
    });

    describe('CSRF Protection', () => {
        test('should reject POST without CSRF token', async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            const accessToken = loginRes.accessToken;

            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Test School',
                    slug: 'test-school',
                    type: 'private',
                    state: 'Lagos',
                    city: 'Lagos',
                    area: 'Area',
                    address: 'Address'
                });

            expect(response.status).toBe(403);
            expect(response.body.code).toBe('CSRF_MISSING');
        });

        test('should accept POST with valid CSRF token', async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            const accessToken = loginRes.accessToken;

            // Get CSRF token
            const csrfRes = await request(app)
                .get('/api/csrf-token');

            expect(csrfRes.status).toBe(200);
            const csrfToken = csrfRes.body.csrfToken;

            // Make POST with token
            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: 'CSRF Test School',
                    slug: 'csrf-test-school',
                    type: 'private',
                    state: 'Lagos',
                    city: 'Lagos',
                    area: 'Area',
                    address: 'Address',
                    gender: 'co-ed',
                    day_school: true
                });

            expect(response.status).toBe(201);
        });
    });

    describe('Input Sanitization', () => {
        let accessToken;

        beforeAll(async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            accessToken = loginRes.accessToken;
        });

        test('should sanitize XSS attempts in input', async () => {
            const csrfRes = await request(app).get('/api/csrf-token');
            const csrfToken = csrfRes.body.csrfToken;

            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('X-CSRF-Token', csrfToken)
                .send({
                    name: '<script>alert("xss")</script>',
                    slug: 'xss-test',
                    type: 'private',
                    state: 'Lagos',
                    city: 'Lagos',
                    area: 'Area',
                    address: 'Address',
                    gender: 'co-ed',
                    day_school: true
                });

            expect(response.status).toBe(201);
            // Name should be escaped
            expect(response.body.name).not.toContain('<script>');
        });
    });

    describe('Error Handling', () => {
        test('should return proper error for validation failure', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'weak'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('should not expose sensitive error details', async () => {
            const response = await request(app)
                .get('/api/schools/invalid-slug');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            // Should not expose database details
            expect(JSON.stringify(response.body)).not.toContain('SQL');
        });
    });

    describe('Search & Filtering', () => {
        beforeAll(async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            const accessToken = loginRes.accessToken;

            // Create test schools
            for (let i = 0; i < 5; i++) {
                await createTestSchool(accessToken, {
                    name: `Search School ${i}`,
                    slug: `search-school-${i}`,
                    state: i % 2 === 0 ? 'Lagos' : 'Abuja'
                });
            }
        });

        test('should search schools by name', async () => {
            const response = await request(app)
                .get('/api/schools?search=Search');

            expect(response.status).toBe(200);
            expect(response.body.total).toBeGreaterThan(0);
        });

        test('should filter schools by state', async () => {
            const response = await request(app)
                .get('/api/schools?state=Lagos');

            expect(response.status).toBe(200);
            const lagosCourt = response.body.data.every(s => s.state === 'Lagos');
            expect(lagosCourt).toBe(true);
        });

        test('should support pagination', async () => {
            const page1 = await request(app)
                .get('/api/schools?limit=2&page=1');

            expect(page1.status).toBe(200);
            expect(page1.body.data.length).toBeLessThanOrEqual(2);

            const page2 = await request(app)
                .get('/api/schools?limit=2&page=2');

            expect(page2.status).toBe(200);
        });
    });
});
