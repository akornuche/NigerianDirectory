/**
 * Rate limiting: per-client keys behind a proxy, and the exemption for the
 * frontend's server-side requests. Each Jest test file has its own module
 * registry, so the environment set here applies to this file's app only.
 */

process.env.RATE_LIMIT_MAX = '3';
process.env.INTERNAL_API_KEY = 'internal-key-for-tests';
process.env.TRUST_PROXY = '1';

jest.mock('../config/database', () => ({
    query: jest.fn(async () => ({ rows: [] })),
    pool: { query: jest.fn(async () => ({ rows: [] })) },
    testConnection: jest.fn(),
    withTransaction: jest.fn()
}));

const request = require('supertest');
const app = require('../app');

// A request that the router answers without touching the database.
const hit = (headers = {}) => request(app).get('/api/no-such-route').set(headers);

describe('Global rate limit', () => {
    test('different clients behind the proxy get separate budgets', async () => {
        for (let i = 0; i < 3; i++) {
            expect((await hit({ 'X-Forwarded-For': '203.0.113.1' })).status).toBe(404);
        }
        expect((await hit({ 'X-Forwarded-For': '203.0.113.1' })).status).toBe(429);
        // Another visitor is unaffected by the first one's usage.
        expect((await hit({ 'X-Forwarded-For': '203.0.113.2' })).status).toBe(404);
    });

    test('server-side requests with the internal key are not limited', async () => {
        const headers = { 'X-Forwarded-For': '198.51.100.9', 'X-Internal-API-Key': 'internal-key-for-tests' };
        for (let i = 0; i < 6; i++) {
            expect((await hit(headers)).status).toBe(404);
        }
    });

    test('a wrong internal key gives no exemption', async () => {
        const headers = { 'X-Forwarded-For': '198.51.100.10', 'X-Internal-API-Key': 'guess' };
        for (let i = 0; i < 3; i++) await hit(headers);
        expect((await hit(headers)).status).toBe(429);
    });
});

describe('School.naturalLanguageSearch', () => {
    test('queries the database instead of calling its own argument', async () => {
        const database = require('../config/database');
        const School = require('../models/School');
        database.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Kings College' }] });

        const rows = await School.naturalLanguageSearch('boarding schools in lagos', 10);

        expect(rows).toEqual([{ id: 1, name: 'Kings College' }]);
        expect(database.query).toHaveBeenLastCalledWith(
            expect.stringContaining('plainto_tsquery'),
            ['boarding schools in lagos', 10]
        );
    });
});

describe('School.update value conversion', () => {
    const { toColumnValue } = require('../models/School');

    test('keeps null as SQL NULL instead of the text "null"', () => {
        expect(toColumnValue(null)).toBeNull();
        expect(toColumnValue(undefined)).toBeNull();
    });

    test('passes Dates through for pg to format', () => {
        const d = new Date();
        expect(toColumnValue(d)).toBe(d);
    });

    test('serialises objects and arrays for JSONB columns', () => {
        expect(toColumnValue(['lab'])).toBe('["lab"]');
        expect(toColumnValue({ a: 1 })).toBe('{"a":1}');
        expect(toColumnValue('text')).toBe('text');
        expect(toColumnValue(false)).toBe(false);
    });
});
