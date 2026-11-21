/**
 * Only records verified against an independent source are public. These
 * tests pin that every public read filters on verification_status, that
 * admin reads can opt out, and that merged/renamed/moved records report
 * their canonical location so the frontend can 301.
 */

jest.mock('../config/database', () => ({
    query: jest.fn(),
    pool: { query: jest.fn(async () => ({ rows: [] })) },
    testConnection: jest.fn(),
    withTransaction: jest.fn()
}));

const request = require('supertest');
const database = require('../config/database');
const School = require('../models/School');

const GATE = "verification_status = 'verified'";

beforeEach(() => {
    database.query.mockReset();
    database.query.mockResolvedValue({ rows: [{ count: '0' }] });
});

const sqlOfCall = (n = 0) => database.query.mock.calls[n][0];

describe('public School reads filter on verification', () => {
    const cases = [
        ['findBySlug', () => School.findBySlug('x')],
        ['list', () => School.list({})],
        ['getByState', () => School.getByState('lagos')],
        ['getByArea', () => School.getByArea('lagos', 'ikeja')],
        ['getNearby', () => School.getNearby(1, 'Lagos', 'Ikeja')],
        ['getFeatured', () => School.getFeatured()],
        ['getStats', () => School.getStats()],
        ['searchForAI', () => School.searchForAI({ state: 'Lagos' })],
        ['naturalLanguageSearch', () => School.naturalLanguageSearch('boarding')],
        ['getFeaturedForAI', () => School.getFeaturedForAI()],
        ['searchByLocation', () => School.searchByLocation('Lagos')],
        ['getAIStats', () => School.getAIStats()],
        ['getSchoolsByRegion', () => School.getSchoolsByRegion('southwest')],
    ];

    test.each(cases)('%s', async (_name, call) => {
        database.query.mockResolvedValue({ rows: [{ count: '0', total_schools: 0 }] });
        await call().catch(() => {});
        const sql = database.query.mock.calls.map((c) => c[0]).join('\n');
        expect(sql).toContain(GATE);
    });

    test('admin reads can include unpublished records', async () => {
        await School.findBySlug('x', { includeUnpublished: true });
        await School.getStats({ includeUnpublished: true });
        await School.list({ includeUnpublished: true });
        for (const [sql] of database.query.mock.calls) {
            expect(sql).not.toContain(GATE);
        }
    });
});

describe('slug aliases', () => {
    test('resolve only to a published replacement', async () => {
        database.query.mockResolvedValueOnce({ rows: [{ slug: 'new-slug' }] });
        await expect(School.resolveSlugAlias('old-slug')).resolves.toBe('new-slug');
        expect(sqlOfCall()).toContain('slug_aliases');
        expect(sqlOfCall()).toContain(GATE);
    });

    test('unknown alias resolves to null', async () => {
        database.query.mockResolvedValueOnce({ rows: [] });
        await expect(School.resolveSlugAlias('nope')).resolves.toBeNull();
    });
});

describe('detail routes report where a record moved', () => {
    const app = require('../app');

    const published = {
        id: 9, slug: 'kept-school', name: 'Kept School', state: 'Ondo',
        area: 'Akure South', city: 'Akure', institution_category: 'school',
    };

    function route(sqlToRows) {
        database.query.mockImplementation(async (sql, params = []) => {
            for (const [pattern, rows] of sqlToRows) {
                if (pattern.test(sql)) return { rows: typeof rows === 'function' ? rows(params) : rows };
            }
            return { rows: [] };
        });
    }

    test('a merged slug points at the record that replaced it', async () => {
        route([
            [/FROM slug_aliases/, [{ slug: 'kept-school' }]],
            [/SELECT \* FROM schools WHERE slug/, (p) => (p[0] === 'kept-school' ? [published] : [])],
        ]);
        const res = await request(app).get('/api/schools/lagos/ikeja/old-duplicate');
        expect(res.status).toBe(404);
        expect(res.body.movedTo).toEqual({
            slug: 'kept-school', institution_category: 'school', state: 'ondo', locality: 'akure-south',
        });
    });

    test('a record requested under the wrong state points at its real path', async () => {
        route([[/SELECT \* FROM schools WHERE slug/, [published]]]);
        const res = await request(app).get('/api/schools/ekiti/ado-ekiti/kept-school');
        expect(res.status).toBe(404);
        expect(res.body.movedTo.state).toBe('ondo');
    });

    test('universities point at their city path', async () => {
        route([[/SELECT \* FROM schools WHERE slug/, [{ ...published, institution_category: 'university' }]]]);
        const res = await request(app).get('/api/schools/lagos/x/kept-school');
        expect(res.body.movedTo.locality).toBe('akure');
    });

    test('an unknown slug is a plain 404', async () => {
        route([]);
        const res = await request(app).get('/api/schools/lagos/ikeja/never-existed');
        expect(res.status).toBe(404);
        expect(res.body.movedTo).toBeUndefined();
    });
});
