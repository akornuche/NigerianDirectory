/**
 * Authentication Tests
 * Critical path: Registration → Login → Access Protected Endpoint
 */

const {
    setupTestDatabase,
    teardownTestDatabase,
    createTestUser,
    loginTestUser,
    request,
    app
} = require('./setup');

describe('Authentication', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    describe('POST /api/auth/register', () => {
        test('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'SecurePassword123!'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.email).toBe('john@example.com');
            expect(response.body.user.role).toBe('user');
        });

        test('should not register with duplicate email', async () => {
            // Create first user
            await createTestUser({ email: 'duplicate@example.com' });

            // Try to register with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Another User',
                    email: 'duplicate@example.com',
                    password: 'Password123!'
                });

            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('error');
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com'
                    // missing name and password
                });

            expect(response.status).toBe(400);
        });

        test('should validate password strength', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'weak'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await createTestUser({
                email: 'login@example.com',
                password: 'password123'
            });
        });

        test('should login successfully with correct credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.email).toBe('login@example.com');
        });

        test('should fail login with wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
        });

        test('should fail login with non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/auth/refresh', () => {
        let refreshToken;

        beforeEach(async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            refreshToken = loginRes.refreshToken;
        });

        test('should refresh access token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
        });

        test('should fail refresh with invalid token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' });

            expect(response.status).toBe(401);
        });

        test('should fail refresh with missing token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({});

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/auth/logout', () => {
        let accessToken, refreshToken;

        beforeEach(async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            accessToken = loginRes.accessToken;
            refreshToken = loginRes.refreshToken;
        });

        test('should logout successfully', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ refreshToken });

            expect(response.status).toBe(200);
            expect(response.body.accessTokenRevoked).toBe(true);
        });

        test('should not allow using token after logout', async () => {
            // First logout
            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ refreshToken });

            // Try to use revoked token
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/auth/me', () => {
        let accessToken;

        beforeEach(async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            accessToken = loginRes.accessToken;
        });

        test('should get current user info with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.email).toBe('test@example.com');
            expect(response.body).toHaveProperty('token');
        });

        test('should fail without token', async () => {
            const response = await request(app)
                .get('/api/auth/me');

            expect(response.status).toBe(401);
        });

        test('should fail with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/auth/change-password', () => {
        let accessToken;

        beforeEach(async () => {
            const loginRes = await loginTestUser('test@example.com', 'password123');
            accessToken = loginRes.accessToken;
        });

        test('should change password successfully', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'NewPassword456!'
                });

            expect(response.status).toBe(200);
        });

        test('should fail with wrong current password', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: 'wrongpassword',
                    newPassword: 'NewPassword456!'
                });

            expect(response.status).toBe(401);
        });

        test('should fail with weak new password', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: 'password123',
                    newPassword: 'weak'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Rate Limiting', () => {
        test('should enforce rate limiting on login endpoint', async () => {
            // Make 6 requests (limit is 5 per 15 min)
            const requests = [];
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/auth/login')
                        .send({
                            email: 'test@example.com',
                            password: 'wrong'
                        })
                );
            }

            const responses = await Promise.all(requests);

            // Last request should be rate limited
            const lastResponse = responses[responses.length - 1];
            expect(lastResponse.status).toBe(429);
        });
    });
});
