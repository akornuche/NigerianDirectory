/**
 * Claims API Tests
 * Critical path: Create → Verify → Approve claims
 */

const {
    setupTestDatabase,
    teardownTestDatabase,
    loginTestUser,
    createTestSchool,
    createTestClaim,
    request,
    app
} = require('./setup');

describe('Claims API', () => {
    let accessToken;
    let schoolId;

    beforeAll(async () => {
        await setupTestDatabase();
        const loginRes = await loginTestUser('test@example.com', 'password123');
        accessToken = loginRes.accessToken;

        const school = await createTestSchool(accessToken);
        schoolId = school.id;
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    describe('POST /api/claims', () => {
        test('should create a claim successfully', async () => {
            const response = await request(app)
                .post('/api/claims')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    school_id: schoolId,
                    verification_method: 'email'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.school_id).toBe(schoolId);
            expect(response.body.status).toBe('pending');
        });

        test('should fail without authentication', async () => {
            const response = await request(app)
                .post('/api/claims')
                .send({
                    school_id: schoolId,
                    verification_method: 'email'
                });

            expect(response.status).toBe(401);
        });

        test('should validate school_id', async () => {
            const response = await request(app)
                .post('/api/claims')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    school_id: 99999,
                    verification_method: 'email'
                });

            expect(response.status).toBe(400);
        });

        test('should enforce rate limiting on claims', async () => {
            const requests = [];
            // Make 6 requests (limit is 5 per hour)
            for (let i = 0; i < 6; i++) {
                requests.push(
                    request(app)
                        .post('/api/claims')
                        .set('Authorization', `Bearer ${accessToken}`)
                        .send({
                            school_id: schoolId,
                            verification_method: 'email'
                        })
                );
            }

            const responses = await Promise.all(requests);

            // Last request should be rate limited
            const lastResponse = responses[responses.length - 1];
            expect(lastResponse.status).toBe(429);
        });
    });

    describe('GET /api/claims', () => {
        let claimId;

        beforeEach(async () => {
            const claim = await createTestClaim(accessToken, schoolId);
            claimId = claim.id;
        });

        test('should list user claims', async () => {
            const response = await request(app)
                .get('/api/claims')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.claims)).toBe(true);
        });

        test('should fail without authentication', async () => {
            const response = await request(app)
                .get('/api/claims');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/claims/:id', () => {
        let claimId;

        beforeEach(async () => {
            const claim = await createTestClaim(accessToken, schoolId);
            claimId = claim.id;
        });

        test('should get claim details', async () => {
            const response = await request(app)
                .get(`/api/claims/${claimId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(claimId);
        });

        test('should fail without authentication', async () => {
            const response = await request(app)
                .get(`/api/claims/${claimId}`);

            expect(response.status).toBe(401);
        });

        test('should return 404 for non-existent claim', async () => {
            const response = await request(app)
                .get('/api/claims/99999')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/claims/:id/verify', () => {
        let claimId;

        beforeEach(async () => {
            const claim = await createTestClaim(accessToken, schoolId);
            claimId = claim.id;
        });

        test('should verify claim with correct code', async () => {
            // First get verification code
            const getRes = await request(app)
                .get(`/api/claims/${claimId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            const verificationCode = getRes.body.verification_code;

            const response = await request(app)
                .post(`/api/claims/${claimId}/verify`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: verificationCode });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('verified');
        });

        test('should fail with incorrect code', async () => {
            const response = await request(app)
                .post(`/api/claims/${claimId}/verify`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ code: 'wrong-code' });

            expect(response.status).toBe(400);
        });
    });

    describe('Admin Claims Management', () => {
        let adminToken;
        let claimId;

        beforeAll(async () => {
            // Create admin user
            const adminRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Admin User',
                    email: 'admin@example.com',
                    password: 'AdminPass123!',
                    role: 'admin'
                });

            adminToken = adminRes.body.accessToken;

            // Create a claim
            const claim = await createTestClaim(accessToken, schoolId);
            claimId = claim.id;
        });

        test('should allow admin to approve claim', async () => {
            const response = await request(app)
                .post(`/api/admin/claims/${claimId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    notes: 'Approved after verification'
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('approved');
        });

        test('should allow admin to reject claim', async () => {
            const claim = await createTestClaim(accessToken, schoolId);

            const response = await request(app)
                .post(`/api/admin/claims/${claim.id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reason: 'Invalid documentation'
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('rejected');
        });

        test('should not allow non-admin to approve claims', async () => {
            const response = await request(app)
                .post(`/api/admin/claims/${claimId}/approve`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    notes: 'Unauthorized'
                });

            expect(response.status).toBe(403);
        });
    });
});
