/**
 * Token Service - Manages JWT tokens and token blacklist
 * 
 * Features:
 * - Generate access tokens (short-lived, ~15 minutes)
 * - Generate refresh tokens (long-lived, ~7 days)
 * - Token refresh endpoint for getting new access tokens
 * - Postgres-backed token revocation list for logout
 * - Token rotation and expiration tracking
 *
 * Revoked tokens are stored in Postgres rather than Redis. The serverless
 * deployment runs many short-lived instances and has no Redis, so a
 * revocation held in one instance's memory would not be seen by the others.
 * Every authenticated request already reads the users table, so one more
 * indexed lookup in the same database adds no new dependency.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';  // Short-lived
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // Long-lived

// Validate JWT_SECRET is set
if (!JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET is not set. Tokens cannot be generated.');
    process.exit(1);
}

/**
 * Generate access token (short-lived, used for API requests)
 * @param {Object} user - User object
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
    return jwt.sign(
        {
            type: 'access',
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { 
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
            issuer: 'nigerian-directory',
            audience: 'nigerian-directory-api'
        }
    );
}

/**
 * Generate refresh token (long-lived, used to get new access tokens)
 * @param {Object} user - User object
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(user) {
    return jwt.sign(
        {
            type: 'refresh',
            id: user.id,
            uuid: user.uuid,
            email: user.email
        },
        JWT_SECRET,
        { 
            expiresIn: REFRESH_TOKEN_EXPIRES_IN,
            issuer: 'nigerian-directory',
            audience: 'nigerian-directory-api'
        }
    );
}

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} { accessToken, refreshToken }
 */
function generateTokenPair(user) {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    };
}

/**
 * Verify token and return decoded payload
 * @param {string} token - JWT token to verify
 * @param {string} type - Token type ('access' or 'refresh')
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid, expired, or wrong type
 */
function verifyToken(token, type = 'access') {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'nigerian-directory',
            audience: 'nigerian-directory-api'
        });

        // Verify token type matches
        if (decoded.type !== type) {
            throw new Error(`Expected ${type} token, got ${decoded.type}`);
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            const err = new Error('Token expired');
            err.name = 'TokenExpiredError';
            err.expiredAt = error.expiredAt;
            throw err;
        }
        throw error;
    }
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// The table is created on first use so that an existing database which has
// not run the migration still gets working revocation instead of locking
// every user out. The promise is cached so this runs once per process.
let tableReady = null;

function ensureRevocationTable() {
    if (!tableReady) {
        tableReady = query(`
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token_hash CHAR(64) PRIMARY KEY,
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at
                ON revoked_tokens (expires_at);
        `).catch((error) => {
            tableReady = null; // Retry on the next call.
            throw error;
        });
    }
    return tableReady;
}

/**
 * Revoke a token until it would have expired anyway.
 * @param {string} token - JWT token to revoke
 * @returns {Promise<boolean>} True if the revocation was stored
 */
async function blacklistToken(token) {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
        return false;
    }

    // An expired token is already unusable; there is nothing to store.
    if (decoded.exp * 1000 <= Date.now()) {
        return true;
    }

    try {
        await ensureRevocationTable();
        await query(
            `INSERT INTO revoked_tokens (token_hash, expires_at)
             VALUES ($1, to_timestamp($2))
             ON CONFLICT (token_hash) DO NOTHING`,
            [hashToken(token), decoded.exp]
        );
        // Expired rows are useless; prune them opportunistically.
        await query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
        return true;
    } catch (error) {
        console.error('Error revoking token:', error.message);
        return false;
    }
}

/**
 * Check whether a token has been revoked.
 *
 * Errors propagate. Treating a failed lookup as "not revoked" would let a
 * logged-out token keep working whenever the check fails, so callers must
 * reject the request instead.
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} True if the token is revoked
 */
async function isTokenBlacklisted(token) {
    await ensureRevocationTable();
    const result = await query(
        'SELECT 1 FROM revoked_tokens WHERE token_hash = $1 AND expires_at > NOW()',
        [hashToken(token)]
    );
    return result.rows.length > 0;
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date} Token expiration date
 */
function getTokenExpiration(token) {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
        return null;
    }
    return new Date(decoded.exp * 1000);
}

/**
 * Get time until token expires (in seconds)
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiration
 */
function getTokenTTL(token) {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
        return null;
    }
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.exp - now);
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Valid refresh token
 * @param {Object} user - User object (from verified refresh token)
 * @returns {Object} New token pair
 */
async function refreshAccessToken(refreshToken, user) {
    try {
        // Verify refresh token (throws if invalid, expired or the wrong type)
        verifyToken(refreshToken, 'refresh');

        // Check if refresh token is blacklisted
        const isBlacklisted = await isTokenBlacklisted(refreshToken);
        if (isBlacklisted) {
            throw new Error('Refresh token has been revoked');
        }

        // Generate new token pair
        const newTokens = generateTokenPair(user);

        return newTokens;
    } catch (error) {
        const err = new Error('Failed to refresh token');
        err.originalError = error.message;
        throw err;
    }
}

/**
 * Logout user (revoke tokens)
 * @param {string} accessToken - User's access token
 * @param {string} refreshToken - User's refresh token
 * @returns {Promise<Object>} Result status
 */
async function logout(accessToken, refreshToken) {
    try {
        const results = {
            accessTokenRevoked: false,
            refreshTokenRevoked: false
        };

        if (accessToken) {
            results.accessTokenRevoked = await blacklistToken(accessToken);
        }

        if (refreshToken) {
            results.refreshTokenRevoked = await blacklistToken(refreshToken);
        }

        if ((accessToken && !results.accessTokenRevoked) ||
            (refreshToken && !results.refreshTokenRevoked)) {
            results.warning = 'Tokens may not be fully revoked';
        }

        return results;
    } catch (error) {
        console.error('Error during logout:', error.message);
        // Continue even if blacklist fails
        return {
            accessTokenRevoked: false,
            refreshTokenRevoked: false,
            warning: 'Tokens may not be fully revoked'
        };
    }
}

/**
 * Generate emergency tokens (for admin/support use only)
 * Used when user loses refresh token and needs to regain access
 * @param {Object} user - User object
 * @returns {Object} New token pair
 */
function generateEmergencyTokens(user) {
    // Log emergency token generation for audit trail
    console.warn(`⚠️  Emergency tokens generated for user ${user.email} (ID: ${user.id})`);
    
    return generateTokenPair(user);
}

/**
 * Validate token structure and timing
 * @param {string} token - JWT token
 * @returns {Object} Validation result
 */
function validateTokenStructure(token) {
    try {
        const decoded = jwt.decode(token);
        
        if (!decoded) {
            return {
                valid: false,
                error: 'Cannot decode token'
            };
        }

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        return {
            valid: true,
            type: decoded.type,
            expiresIn,
            isExpired: expiresIn <= 0,
            expiresAt: new Date(decoded.exp * 1000),
            user: {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            }
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    generateEmergencyTokens,
    verifyToken,
    blacklistToken,
    isTokenBlacklisted,
    hashToken,
    getTokenExpiration,
    getTokenTTL,
    refreshAccessToken,
    logout,
    validateTokenStructure
};
