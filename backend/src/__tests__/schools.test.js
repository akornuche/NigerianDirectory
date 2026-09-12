/**
 * Schools API Tests
 * Critical path: Create → Read → Update → Delete schools
 */

const {
    setupTestDatabase,
    teardownTestDatabase,
    loginTestUser,
    createTestSchool,
    request,
    app
} = require('./setup');

describe('Schools API', () => {
    let accessToken;

    beforeAll(async () => {
        await setupTestDatabase();
        const loginRes = await loginTestUser('test@example.com', 'password123');
        accessToken = loginRes.accessToken;
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    describe('POST /api/schools', () => {
        test('should create a school successfully', async () => {
            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Test School',
                    slug: 'test-school',
                    type: 'private',
                    state: 'Lagos',
                    city: 'Lagos',
                    area: 'Victoria Island',
                    address: 'Test Address',
                    gender: 'co-ed',
                    day_school: true
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('Test School');
            expect(response.body.slug).toBe('test-school');
        });

        test('should fail without authentication', async () => {
            const response = await request(app)
                .post('/api/schools')
                .send({
                    name: 'Test School',
                    slug: 'test-school'
                });

            expect(response.status).toBe(401);
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Test School'
                    // missing required fields
                });

            expect(response.status).toBe(400);
        });

        test('should prevent duplicate slug', async () => {
            // Create first school
            await createTestSchool(accessToken, {
                slug: 'unique-slug'
            });

            // Try to create with same slug
            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Another School',
                    slug: 'unique-slug',
                    type: 'public',
                    state: 'Lagos',
                    city: 'Lagos',
                    area: 'Area',
                    address: 'Address'
                });

            expect(response.status).toBe(409);
        });
    });

    describe('GET /api/schools', () => {
        beforeEach(async () => {
            // Create test schools
            for (let i = 0; i < 3; i++) {
                await createTestSchool(accessToken, {
                    name: `School ${i + 1}`,
                    slug: `school-${i + 1}`
                });
            }
        });

        test('should list all schools', async () => {
            const response = await request(app)
                .get('/api/schools');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('should support pagination', async () => {
            const response = await request(app)
                .get('/api/schools?page=1&limit=2');

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
        });

        test('should support filtering by state', async () => {
            const response = await request(app)
                .get('/api/schools?state=Lagos');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('should support search', async () => {
            const response = await request(app)
                .get('/api/schools?search=School');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('GET /api/schools/:slug', () => {
        let schoolSlug;

        beforeEach(async () => {
            const school = await createTestSchool(accessToken, {
                slug: 'detail-test-school'
            });
            schoolSlug = school.slug;
        });

        test('should get school by slug', async () => {
            const response = await request(app)
                .get(`/api/schools/${schoolSlug}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body.slug).toBe(schoolSlug);
        });

        test('should return 404 for non-existent school', async () => {
            const response = await request(app)
                .get('/api/schools/non-existent-school');

            expect(response.status).toBe(404);
        });

        test('should include enriched content', async () => {
            const response = await request(app)
                .get(`/api/schools/${schoolSlug}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('description');
            expect(response.body).toHaveProperty('website');
        });
    });

    describe('PUT /api/schools/:id', () => {
        let schoolId;

        beforeEach(async () => {
            const school = await createTestSchool(accessToken, {
                name: 'Original Name'
            });
            schoolId = school.id;
        });

        test('should update school successfully', async () => {
            const response = await request(app)
                .put(`/api/schools/${schoolId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Updated Name'
                });

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Updated Name');
        });

        test('should fail without authentication', async () => {
            const response = await request(app)
                .put(`/api/schools/${schoolId}`)
                .send({
                    name: 'Updated Name'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('DELETE /api/schools/:id', () => {
        let schoolId;

        beforeEach(async () => {
            const school = await createTestSchool(accessToken);
            schoolId = school.id;
        });

        test('should delete school successfully', async () => {
            const response = await request(app)
                .delete(`/api/schools/${schoolId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(200);
        });

        test('should fail without authentication', async () => {
            const response = await request(app)
                .delete(`/api/schools/${schoolId}`);

            expect(response.status).toBe(401);
        });

        test('should not be able to delete twice', async () => {
            // Delete once
            await request(app)
                .delete(`/api/schools/${schoolId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            // Try to delete again
            const response = await request(app)
                .delete(`/api/schools/${schoolId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('Rate Limiting', () => {
        test('should enforce rate limiting on schools endpoint', async () => {
            const requests = [];
            // Make 31 requests (limit is 30 per minute)
            for (let i = 0; i < 31; i++) {
                requests.push(
                    request(app).get('/api/schools')
                );
            }

            const responses = await Promise.all(requests);

            // Last request should be rate limited
            const lastResponse = responses[responses.length - 1];
            expect(lastResponse.status).toBe(429);
        });
    });
});
