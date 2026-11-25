/**
 * The daily news digest: only published days are public, input is
 * validated, and the admin review screen can publish, edit and drop stories.
 */
const mockQueries = [];
const mockClient = {
    query: jest.fn(async (sql, params) => {
        mockQueries.push({ sql, params });
        if (/^DELETE FROM news_items/.test(sql)) return { rows: params[1] === '9' ? [{ rank: 2 }] : [] };
        if (/^SELECT id FROM news_items/.test(sql)) return { rows: [{ id: 10 }, { id: 11 }] };
        return { rows: [] };
    }),
};
jest.mock('../config/database', () => ({
    query: jest.fn(async (sql, params) => {
        mockQueries.push({ sql, params });
        if (/FROM news_days WHERE day = \$1 AND status = 'published'/.test(sql)) {
            return { rows: params[0] === '2026-09-01' ? [{ day: new Date('2026-09-01'), lead: 'Lead', published_at: null }] : [] };
        }
        if (/SELECT rank, headline/.test(sql)) return { rows: [{ rank: 1, headline: 'H', summary: 'S', category: 'politics', states: [], sources: [] }] };
        if (/AS older/.test(sql)) return { rows: [{ older: null, newer: new Date('2026-09-02') }] };
        if (/COUNT\(\*\)::int AS n FROM news_items/.test(sql)) return { rows: [{ n: params[0] === '2026-09-03' ? 0 : 5 }] };
        if (/^UPDATE news_days d SET status = 'published'/.test(sql)) return { rows: params[0].slice(0, 1).map((d) => ({ day: new Date(d) })) };
        if (/^UPDATE news_days/.test(sql)) return { rows: [{ day: new Date(params[0]), status: 'published' }] };
        if (/^UPDATE news_items/.test(sql)) return { rows: [{ id: 1 }] };
        if (/^DELETE FROM news_days/.test(sql)) return { rows: params[0].map((d) => ({ day: new Date(d) })) };
        return { rows: [] };
    }),
    pool: { query: jest.fn(async () => ({ rows: [] })) },
    testConnection: jest.fn(),
    withTransaction: jest.fn(async (cb) => cb(mockClient)),
}));
jest.mock('../middleware/auth', () => {
    const actual = jest.requireActual('../middleware/auth');
    return { ...actual, authenticate: (req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); } };
});

const request = require('supertest');
const app = require('../app');

beforeEach(() => { mockQueries.length = 0; });

describe('public news', () => {
    test('a published day returns its stories and neighbours', async () => {
        const res = await request(app).get('/api/news/day/2026-09-01');
        expect(res.status).toBe(200);
        expect(res.body.day).toBe('2026-09-01');
        expect(res.body.items).toHaveLength(1);
        expect(res.body.newer).toBe('2026-09-02');
        expect(mockQueries[0].sql).toContain("status = 'published'");
    });

    test('a draft or missing day is not found', async () => {
        const res = await request(app).get('/api/news/day/2026-09-05');
        expect(res.status).toBe(404);
    });

    test('malformed dates and months are rejected', async () => {
        expect((await request(app).get('/api/news/day/2026-9-1')).status).toBe(400);
        expect((await request(app).get('/api/news/month/2026-9')).status).toBe(400);
    });

    test('the month archive reads only published days', async () => {
        const res = await request(app).get('/api/news/months?limit=2');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ months: [], next: null });
        expect(mockQueries[0].sql).toContain("status = 'published'");
    });
});

describe('admin review', () => {
    test('publishing records the reviewer', async () => {
        const res = await request(app).patch('/api/admin/news/2026-09-01').send({ status: 'published' });
        expect(res.status).toBe(200);
        const update = mockQueries.find((q) => /^UPDATE news_days/.test(q.sql));
        expect(update.sql).toContain('reviewed_by');
        expect(update.params).toContain(1);
    });

    test('an empty day cannot be published', async () => {
        const res = await request(app).patch('/api/admin/news/2026-09-03').send({ status: 'published' });
        expect(res.status).toBe(400);
    });

    test('an unknown status or category is rejected', async () => {
        expect((await request(app).patch('/api/admin/news/2026-09-01').send({ status: 'live' })).status).toBe(400);
        expect((await request(app).patch('/api/admin/news/2026-09-01/items/1').send({ category: 'gossip' })).status).toBe(400);
    });

    test('dropping a story renumbers the ones below it, lowest first', async () => {
        const res = await request(app).delete('/api/admin/news/2026-09-01/items/9');
        expect(res.status).toBe(200);
        const moves = mockQueries.filter((q) => /SET rank = rank - 1/.test(q.sql)).map((q) => q.params[0]);
        expect(moves).toEqual([10, 11]);
    });

    test('dropping an unknown story is not found', async () => {
        expect((await request(app).delete('/api/admin/news/2026-09-01/items/99')).status).toBe(404);
    });
});

describe('bulk review actions', () => {
    test('publishing several days records the reviewer and reports what changed', async () => {
        const res = await request(app).post('/api/admin/news/bulk').send({ action: 'publish', days: ['2026-09-01', '2026-09-02'] });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ action: 'publish', requested: 2, changed: 1, days: ['2026-09-01'] });
        const q = mockQueries.find((x) => /^UPDATE news_days d SET status = 'published'/.test(x.sql));
        expect(q.sql).toContain('EXISTS (SELECT 1 FROM news_items');
        expect(q.params[1]).toBe(1);
    });

    test('deleting removes the selected days', async () => {
        const res = await request(app).post('/api/admin/news/bulk').send({ action: 'delete', days: ['2026-09-03'] });
        expect(res.body.days).toEqual(['2026-09-03']);
    });

    test('unknown actions and malformed days are rejected', async () => {
        expect((await request(app).post('/api/admin/news/bulk').send({ action: 'archive', days: ['2026-09-01'] })).status).toBe(400);
        expect((await request(app).post('/api/admin/news/bulk').send({ action: 'publish', days: ['1 Sept'] })).status).toBe(400);
        expect((await request(app).post('/api/admin/news/bulk').send({ action: 'publish', days: [] })).status).toBe(400);
    });
});
