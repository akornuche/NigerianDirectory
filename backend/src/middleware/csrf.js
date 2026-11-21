/**
 * CSRF Protection Middleware
 *
 * CSRF exploits credentials the browser attaches on its own, which means
 * cookies. This API authenticates with an `Authorization: Bearer` header,
 * which a browser never adds to a cross-site request, and it sets no
 * cookies. So a token is required only for state-changing requests that
 * carry a Cookie header and no bearer token; that is the one shape of
 * request a forged cross-site submission could take.
 *
 * Tokens are stateless: `<issuedAt>.<nonce>.<hmac>`, signed with
 * CSRF_SECRET (or a key derived from JWT_SECRET). Verifying one needs no
 * shared store, so it works across serverless instances. An earlier version
 * kept tokens in Redis, which rejected every POST from the public forms
 * when Redis was absent.
 */

const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 3600;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function signingKey() {
    const base = process.env.CSRF_SECRET || process.env.JWT_SECRET;
    if (!base) {
        throw new Error('CSRF_SECRET or JWT_SECRET must be set');
    }
    // Derive a dedicated key so a CSRF token can never double as a JWT signature.
    return crypto.createHmac('sha256', base).update('csrf-token-key').digest();
}

function sign(payload) {
    return crypto.createHmac('sha256', signingKey()).update(payload).digest('hex');
}

/**
 * Create a signed CSRF token.
 * @param {number} [now] - Issue time in ms, for tests.
 */
function generateToken(now = Date.now()) {
    const issuedAt = Math.floor(now / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${issuedAt}.${nonce}`;
    return `${payload}.${sign(payload)}`;
}

/**
 * Kept for callers of the previous API. The request and response are unused.
 */
function generateClientToken() {
    return generateToken();
}

/**
 * Check a token's signature and age.
 * @param {string} token
 * @param {number} [now] - Current time in ms, for tests.
 * @returns {boolean}
 */
function verifyToken(token, now = Date.now()) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }

    const [issuedAtRaw, nonce, signature] = parts;
    const issuedAt = Number(issuedAtRaw);
    if (!Number.isInteger(issuedAt) || !/^[0-9a-f]{32}$/.test(nonce)) {
        return false;
    }

    const age = Math.floor(now / 1000) - issuedAt;
    if (age < 0 || age > TOKEN_TTL_SECONDS) {
        return false;
    }

    const expected = Buffer.from(sign(`${issuedAtRaw}.${nonce}`), 'hex');
    const given = Buffer.from(signature, 'hex');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * True when the request could have been forged by another site: it carries
 * cookies the browser attached on its own, and no bearer token.
 */
function needsCsrfCheck(req) {
    if (SAFE_METHODS.has(req.method)) {
        return false;
    }
    const authHeader = req.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
        return false;
    }
    return Boolean(req.get('cookie'));
}

function csrfProtection(req, res, next) {
    res.csrfToken = () => {
        if (!res._csrfToken) {
            res._csrfToken = generateToken();
        }
        return res._csrfToken;
    };

    if (!needsCsrfCheck(req)) {
        return next();
    }

    const token = req.get('x-csrf-token') || req.body?.csrfToken;

    if (!token) {
        return res.status(403).json({
            error: 'CSRF token missing',
            code: 'CSRF_MISSING'
        });
    }

    if (!verifyToken(token)) {
        return res.status(403).json({
            error: 'Invalid CSRF token',
            code: 'CSRF_INVALID'
        });
    }

    return next();
}

function getCsrfToken(req, res) {
    res.json({
        csrfToken: generateToken(),
        expiresIn: TOKEN_TTL_SECONDS
    });
}

module.exports = {
    generateToken,
    generateClientToken,
    verifyToken,
    needsCsrfCheck,
    csrfProtection,
    getCsrfToken,
    TOKEN_TTL_SECONDS
};
