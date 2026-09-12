/**
 * Token Service - Manages JWT tokens and token blacklist
 * 
 * Features:
 * - Generate access tokens (short-lived, ~15 minutes)
 * - Generate refresh tokens (long-lived, ~7 days)
 * - Token refresh endpoint for getting new access tokens
 * - Redis-backed token blacklist for logout
 * - Token rotation and expiration tracking
 */

const jwt = require('jsonwebtoken');
const { redis } = require('../config/redis');

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

/**
 * Add token to blacklist (for logout)
 * @param {string} token - JWT token to blacklist
 * @returns {Promise<void>}
 */
async function blacklistToken(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            throw new Error('Cannot decode token');
        }

        // Calculate TTL: time until token expires
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;

        if (ttl > 0) {
            // Store token hash in Redis with TTL equal to token expiration
            const tokenHash = require('crypto')
                .createHash('sha256')
                .update(token)
                .digest('hex');

            await redis.setex(
                `blacklist:${tokenHash}`,
                ttl,
                'revoked'
            );
        }
    } catch (error) {
        console.error('Error blacklisting token:', error.message);
        // Don't throw - blacklist failures shouldn't break logout
    }
}

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} True if token is blacklisted
 */
async function isTokenBlacklisted(token) {
    try {
        const tokenHash = require('crypto')
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const isBlacklisted = await redis.get(`blacklist:${tokenHash}`);
        return isBlacklisted !== null;
    } catch (error) {
        console.error('Error checking blacklist:', error.message);
        // On Redis error, assume not blacklisted to avoid blocking auth
        return false;
    }
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
        // Verify refresh token
        const decoded = verifyToken(refreshToken, 'refresh');

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

        // Blacklist both tokens
        if (accessToken) {
            await blacklistToken(accessToken);
            results.accessTokenRevoked = true;
        }

        if (refreshToken) {
            await blacklistToken(refreshToken);
            results.refreshTokenRevoked = true;
        }

        return results;
    } catch (error) {
        console.error('Error during logout:', error.message);
        // Continue even if blacklist fails
        return {
            accessTokenRevoked: !!accessToken,
            refreshTokenRevoked: !!refreshToken,
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
    getTokenExpiration,
    getTokenTTL,
    refreshAccessToken,
    logout,
    validateTokenStructure
};
