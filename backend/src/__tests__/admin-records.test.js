/**
 * Admin verification queue and listing editor: validation, edit history and
 * the source-URL requirement for verifying a record. Also the cron digest's
 * shared-secret check.
 */
const mockRecord = { id: 7, name: 'Old Name', website: null, established_year: 1990, verification_status: 'unverified',
    verification_source_name: null, verification_source_url: null, verification_notes: null, content_sources: [] };
const mockCalls = [];
const mockClient = {
    query: jest.fn(async (sql, params) => {
        mockCalls.push({ sql, params });
        if (/^SELECT \* FROM schools/.test(sql)) return { rows: params[0] === 7 ? [{ ...mockRecord }] : [] };
        if (/^UPDATE schools/.test(sql)) return { rows: [{ ...mockRecord, updated: true }] };
        return { rows: [] };
    }),
};
jest.mock('../config/database', () => ({
    query: jest.fn(async (sql) => (/COUNT\(\*\)::int AS n FROM claims/.test(sql) ? { rows: [{ n: 0 }] } : { rows: [] })),
    pool: { query: jest.fn(async () => ({ rows: [] })) },
    testConnection: jest.fn(),
    withTransaction: jest.fn(async (cb) => cb(mockClient)),
}));
jest.mock('../middleware/auth', () => {
    const actual = jest.requireActual('../middleware/auth');
    return { ...actual, authenticate: (req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); } };
});
jest.mock('../services/emailService', () => ({ send: jest.fn(async () => ({})) }));

const request = require('supertest');
const app = require('../app');

beforeEach(() => { mockCalls.length = 0; mockClient.query.mockClear(); });

const revisions = () => mockCalls.filter((c) => /INSERT INTO record_revisions/.test(c.sql));

test('edit stores only changed fields and writes a revision', async () => {
    const res = await request(app).patch('/api/admin/records/7').set('Authorization', 'Bearer t')
        .send({ updates: { name: 'New Name', established_year: 1990 }, note: 'Spelling' });
    expect(res.status).toBe(200);
    expect(res.body.changed).toEqual(['name']);
    const rev = revisions();
    expect(rev).toHaveLength(1);
    expect(JSON.parse(rev[0].params[2])).toEqual({ name: { from: 'Old Name', to: 'New Name' } });
});

test('edit rejects fields that are not editable and bad values', async () => {
    let res = await request(app).patch('/api/admin/records/7').set('Authorization', 'Bearer t').send({ updates: { slug: 'x' } });
    expect(res.status).toBe(400);
    res = await request(app).patch('/api/admin/records/7').set('Authorization', 'Bearer t').send({ updates: { website: 'not a url' } });
    expect(res.status).toBe(422);
    res = await request(app).patch('/api/admin/records/7').set('Authorization', 'Bearer t').send({ updates: { gender: 'mixed' } });
    expect(res.status).toBe(422);
    expect(revisions()).toHaveLength(0);
});

test('verifying requires a source URL; rejecting requires a reason', async () => {
    let res = await request(app).post('/api/admin/records/7/verify').set('Authorization', 'Bearer t').send({ status: 'verified' });
    expect(res.status).toBe(422);
    res = await request(app).post('/api/admin/records/7/verify').set('Authorization', 'Bearer t').send({ status: 'rejected' });
    expect(res.status).toBe(422);
    res = await request(app).post('/api/admin/records/7/verify').set('Authorization', 'Bearer t')
        .send({ status: 'verified', source_name: 'Wikipedia', source_url: 'https://en.wikipedia.org/wiki/X' });
    expect(res.status).toBe(200);
    expect(revisions()).toHaveLength(1);
    expect(revisions()[0].params[2]).toBe('verify');
});

test('unknown record returns 404', async () => {
    const res = await request(app).patch('/api/admin/records/8').set('Authorization', 'Bearer t').send({ updates: { name: 'X' } });
    expect(res.status).toBe(404);
});

test('cron digest refuses requests without the shared secret', async () => {
    process.env.CRON_SECRET = 's3cret';
    let res = await request(app).get('/api/cron/daily-digest');
    expect(res.status).toBe(401);
    res = await request(app).get('/api/cron/daily-digest').set('Authorization', 'Bearer wrong!');
    expect(res.status).toBe(401);
    process.env.ADMIN_EMAIL = 'owner@example.com';
    res = await request(app).get('/api/cron/daily-digest').set('Authorization', 'Bearer s3cret');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: false, reason: 'nothing new' });
});
