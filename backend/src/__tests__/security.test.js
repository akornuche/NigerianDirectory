/**
 * Behaviour tests for CSRF, token revocation, authentication, the optional
 * Redis fallback, health checks and the page-view routes.
 *
 * The database is mocked, so these run without Postgres or Redis.
 */

jest.mock('../config/database', () => ({
    query: jest.fn(),
    pool: { query: jest.fn() },
    testConnection: jest.fn(),
    withTransaction: jest.fn()
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const database = require('../config/database');

const user = { id: 7, uuid: 'u-7', email: 'admin@test.com', role: 'admin' };

/**
 * Route queries by SQL text. `revoked` is the set of token hashes the
 * revoked_tokens table holds.
 */
function mockDatabase({ revoked = new Set(), failRevocationLookup = false, dbUp = true } = {}) {
    database.query.mockImplementation(async (sql, params = []) => {
        if (/CREATE TABLE IF NOT EXISTS revoked_tokens/.test(sql)) return { rows: [] };
        if (/INSERT INTO revoked_tokens/.test(sql)) {
            revoked.add(params[0]);
            return { rows: [], rowCount: 1 };
        }
        if (/DELETE FROM revoked_tokens/.test(sql)) return { rows: [], rowCount: 0 };
        if (/FROM revoked_tokens/.test(sql)) {
            if (failRevocationLookup) throw new Error('connection terminated');
            return { rows: revoked.has(params[0]) ? [{ '?column?': 1 }] : [] };
        }
        if (/FROM users/.test(sql)) return { rows: [{ ...user, name: 'Admin' }] };
        return { rows: [] };
    });
    database.pool.query.mockImplementation(async () => {
        if (!dbUp) throw new Error('ECONNREFUSED');
        return { rows: [{ '?column?': 1 }] };
    });
    return revoked;
}

describe('CSRF tokens', () => {
    const csrf = require('../middleware/csrf');

    test('accepts a freshly issued token', () => {
        expect(csrf.verifyToken(csrf.generateToken())).toBe(true);
    });

    test('rejects a token with a tampered signature', () => {
        const token = csrf.generateToken();
        const last = token.slice(-1) === '0' ? '1' : '0';
        expect(csrf.verifyToken(token.slice(0, -1) + last)).toBe(false);
    });

    test('rejects an expired token', () => {
        const issued = Date.now() - (csrf.TOKEN_TTL_SECONDS + 5) * 1000;
        expect(csrf.verifyToken(csrf.generateToken(issued))).toBe(false);
    });

    test('rejects malformed input', () => {
        for (const bad of [undefined, null, '', 'a.b', 'x.y.z', 123]) {
            expect(csrf.verifyToken(bad)).toBe(false);
        }
    });

    test('only cookie-bearing writes without a bearer token need a check', () => {
        const req = (method, headers) => ({ method, get: (h) => headers[h.toLowerCase()] });
        expect(csrf.needsCsrfCheck(req('GET', { cookie: 'a=b' }))).toBe(false);
        expect(csrf.needsCsrfCheck(req('POST', {}))).toBe(false);
        expect(csrf.needsCsrfCheck(req('POST', { cookie: 'a=b', authorization: 'Bearer x' }))).toBe(false);
        expect(csrf.needsCsrfCheck(req('POST', { cookie: 'a=b' }))).toBe(true);
    });
});

describe('In-memory Redis fallback', () => {
    const { MemoryRedis } = require('../config/redis');

    test('supports cache, hash and list commands', async () => {
        const r = new MemoryRedis();
        await r.setex('schools:a', 60, '1');
        await r.set('other', '2');
        expect(await r.get('schools:a')).toBe('1');
        expect(await r.keys('schools:*')).toEqual(['schools:a']);
        expect(await r.del('schools:a', 'missing')).toBe(1);

        await r.hset('jobs', 'j1', 'x');
        expect(await r.hget('jobs', 'j1')).toBe('x');
        expect(await r.hgetall('jobs')).toEqual({ j1: 'x' });

        await r.lpush('q', 'a');
        await r.lpush('q', 'b');
        expect(await r.llen('q')).toBe(2);
        expect(await r.lrem('q', 0, 'a')).toBe(1);
        expect(await r.ping()).toBe('PONG');
    });

    test('expires keys after their TTL', async () => {
        const r = new MemoryRedis();
        const now = Date.now();
        const spy = jest.spyOn(Date, 'now').mockReturnValue(now);
        await r.setex('k', 1, 'v');
        spy.mockReturnValue(now + 1500);
        expect(await r.get('k')).toBeNull();
        spy.mockRestore();
    });
});

describe('Token revocation', () => {
    const tokenService = require('../services/tokenService');

    beforeEach(() => jest.clearAllMocks());

    test('a revoked token is reported as revoked', async () => {
        mockDatabase();
        const { accessToken } = tokenService.generateTokenPair(user);
        expect(await tokenService.isTokenBlacklisted(accessToken)).toBe(false);
        expect(await tokenService.blacklistToken(accessToken)).toBe(true);
        expect(await tokenService.isTokenBlacklisted(accessToken)).toBe(true);
    });

    test('a failed lookup throws instead of reporting "not revoked"', async () => {
        mockDatabase({ failRevocationLookup: true });
        const { accessToken } = tokenService.generateTokenPair(user);
        await expect(tokenService.isTokenBlacklisted(accessToken)).rejects.toThrow();
    });

    test('logout reports what was actually revoked', async () => {
        mockDatabase();
        const { accessToken, refreshToken } = tokenService.generateTokenPair(user);
        const result = await tokenService.logout(accessToken, refreshToken);
        expect(result).toEqual({ accessTokenRevoked: true, refreshTokenRevoked: true });
    });
});

describe('HTTP behaviour', () => {
    const app = require('../app');
    const tokenService = require('../services/tokenService');

    beforeEach(() => jest.clearAllMocks());

    const bearer = (token) => ({ Authorization: `Bearer ${token}` });

    test('an access token authenticates', async () => {
        mockDatabase();
        const { accessToken } = tokenService.generateTokenPair(user);
        const res = await request(app).get('/api/views/stats').set(bearer(accessToken));
        expect(res.status).not.toBe(401);
    });

    test('a refresh token is not accepted as an access token', async () => {
        mockDatabase();
        const { refreshToken } = tokenService.generateTokenPair(user);
        const res = await request(app).get('/api/views/stats').set(bearer(refreshToken));
        expect(res.status).toBe(401);
    });

    test('a token signed with another secret is rejected', async () => {
        mockDatabase();
        const forged = jwt.sign({ type: 'access', id: 7, role: 'admin' }, 'x'.repeat(40), {
            issuer: 'nigerian-directory', audience: 'nigerian-directory-api'
        });
        const res = await request(app).get('/api/views/stats').set(bearer(forged));
        expect(res.status).toBe(401);
    });

    test('a revoked access token is rejected', async () => {
        const revoked = mockDatabase();
        const { accessToken } = tokenService.generateTokenPair(user);
        revoked.add(tokenService.hashToken(accessToken));
        const res = await request(app).get('/api/views/stats').set(bearer(accessToken));
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/revoked/);
    });

    test('authentication fails closed when revocation cannot be checked', async () => {
        mockDatabase({ failRevocationLookup: true });
        const { accessToken } = tokenService.generateTokenPair(user);
        const res = await request(app).get('/api/views/stats').set(bearer(accessToken));
        expect(res.status).toBe(503);
    });

    test('a refresh token revoked at logout cannot mint new tokens', async () => {
        const revoked = mockDatabase();
        const { refreshToken } = tokenService.generateTokenPair(user);
        revoked.add(tokenService.hashToken(refreshToken));
        const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('TOKEN_REVOKED');
    });

    test('refreshing retires the old refresh token', async () => {
        const revoked = mockDatabase();
        const { refreshToken } = tokenService.generateTokenPair(user);
        const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
        expect(first.status).toBe(200);
        expect(revoked.has(tokenService.hashToken(refreshToken))).toBe(true);
        const replay = await request(app).post('/api/auth/refresh').send({ refreshToken });
        expect(replay.status).toBe(401);
    });

    test('view analytics require authentication', async () => {
        mockDatabase();
        for (const path of ['/api/views/stats', '/api/views/top', '/api/views/school/1', '/api/views/school/1/daily']) {
            const res = await request(app).get(path);
            expect(res.status).toBe(401);
        }
    });

    test('recording a view validates its input', async () => {
        mockDatabase();
        expect((await request(app).post('/api/views').send({})).status).toBe(400);
        expect((await request(app).post('/api/views').send({ school_id: 'abc' })).status).toBe(400);
        expect((await request(app).post('/api/views').send({ school_id: 1, page_type: 'x' })).status).toBe(400);
    });

    test('public forms work without a CSRF token when no cookies are sent', async () => {
        mockDatabase();
        const res = await request(app).post('/api/contact').send({});
        expect(res.status).not.toBe(403); // reaches validation instead
    });

    test('cookie-bearing writes without a CSRF token are refused', async () => {
        mockDatabase();
        const res = await request(app).post('/api/contact').set('Cookie', 'session=abc').send({});
        expect(res.status).toBe(403);
    });

    test('cookie-bearing writes with a valid CSRF token pass the check', async () => {
        mockDatabase();
        const { body } = await request(app).get('/api/csrf-token');
        const res = await request(app)
            .post('/api/contact')
            .set('Cookie', 'session=abc')
            .set('X-CSRF-Token', body.csrfToken)
            .send({});
        expect(res.status).not.toBe(403);
    });

    test('health depends on the database, not on Redis', async () => {
        mockDatabase({ dbUp: true });
        const up = await request(app).get('/health');
        expect(up.status).toBe(200);

        mockDatabase({ dbUp: false });
        const down = await request(app).get('/health');
        expect(down.status).toBe(503);
        expect(down.body.services.database).toBe('failed');
    });
});

describe('Request logging', () => {
    test('an empty response body does not turn into a 500', async () => {
        const express = require('express');
        const { requestLoggingMiddleware } = require('../utils/logger');
        const mini = express();
        mini.use(requestLoggingMiddleware);
        mini.get('/empty', (req, res) => res.send());
        mini.get('/null-json', (req, res) => res.json(undefined));
        expect((await request(mini).get('/empty')).status).toBe(200);
        expect((await request(mini).get('/null-json')).status).toBe(200);
    });
});
