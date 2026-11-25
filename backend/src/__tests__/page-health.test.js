/**
 * Admin Page Health: every record is assessed with the public site's
 * indexability rule, and the report filters, searches and sorts across all
 * records before paging.
 */
const long = (n) => Array.from({ length: n }, (_, i) => `Fact ${i} about this institution is recorded here.`).join(' ');
const mockRows = [
    { id: 1, name: 'Alpha University', slug: 'alpha', state: 'Lagos', city: 'Ikeja', institution_category: 'university',
      enriched_history: long(8), enriched_academics: long(8), meta_title: 'T', meta_description: 'D',
      hero_image_url: 'x.jpg', website: 'https://a.edu.ng', updated_at: '2026-11-01' },
    { id: 2, name: 'Beta College', slug: 'beta', state: 'Abia', area: 'Aba', institution_category: 'school',
      enriched_history: 'Short.', enriched_academics: 'Short.', meta_title: '', meta_description: '',
      hero_image_url: null, website: null, updated_at: '2026-10-01' },
    { id: 3, name: 'Gamma University', slug: 'gamma', state: 'Kano', city: 'Kano', institution_category: 'university',
      enriched_history: long(8), enriched_academics: long(8), meta_title: 'T', meta_description: 'D',
      hero_image_url: null, website: null, updated_at: '2026-09-01' },
];
jest.mock('../config/database', () => ({
    query: jest.fn(async () => ({ rows: mockRows })),
    pool: { query: jest.fn(async () => ({ rows: [] })) },
    testConnection: jest.fn(),
    withTransaction: jest.fn(),
}));
jest.mock('../middleware/auth', () => {
    const actual = jest.requireActual('../middleware/auth');
    return { ...actual, authenticate: (req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); } };
});

const request = require('supertest');
const app = require('../app');

describe('GET /api/admin/page-health', () => {
    test('flags records the public site would not index', async () => {
        const res = await request(app).get('/api/admin/page-health?issue=not_indexable');
        expect(res.status).toBe(200);
        expect(res.body.schools.map((r) => r.id)).toEqual([2]);
        expect(res.body.summary).toMatchObject({ total: 3, indexable: 2, not_indexable: 1, universities: 2, schools: 1 });
    });

    test('filters by category and sorts by name descending', async () => {
        const res = await request(app).get('/api/admin/page-health?category=university&sort=name&dir=desc');
        expect(res.body.schools.map((r) => r.name)).toEqual(['Gamma University', 'Alpha University']);
        expect(res.body.summary.total).toBe(2);
    });

    test('searches by name and reports missing photos', async () => {
        const res = await request(app).get('/api/admin/page-health?issue=missing_photo&q=gamma');
        expect(res.body.schools.map((r) => r.id)).toEqual([3]);
    });

    test('lowest score first by default, and no section text in the response', async () => {
        const res = await request(app).get('/api/admin/page-health');
        expect(res.body.schools[0].id).toBe(2);
        expect(res.body.schools[0]).not.toHaveProperty('enriched_history');
    });
});
