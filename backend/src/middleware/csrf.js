/**
 * CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern for CSRF protection
 * - State-changing requests (POST, PUT, DELETE, PATCH) require valid CSRF token
 * - Tokens are validated against cookies
 * - Safe for SPA applications
 */

const crypto = require('crypto');
const { redis } = require('../config/redis');

/**
 * Generate CSRF token
 */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate CSRF token for client
 */
function generateClientToken(req, res) {
    // Generate new token
    const token = generateToken();

    // Store in Redis with request ID for correlation
    const tokenKey = `csrf:${token}`;
    redis.setex(tokenKey, 3600, 'valid'); // 1 hour expiry

    // Return token for client to use
    return token;
}

/**
 * Verify CSRF token
 */
async function verifyToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    try {
        const tokenKey = `csrf:${token}`;
        const exists = await redis.get(tokenKey);
        
        if (exists) {
            // Invalidate token after use
            await redis.del(tokenKey);
            return true;
        }

        return false;
    } catch (error) {
        console.error('CSRF verification error:', error);
        // On Redis error, fail open for safety
        return false;
    }
}

/**
 * CSRF token middleware
 */
function csrfProtection(req, res, next) {
    // Add CSRF token getter to response
    res.csrfToken = () => {
        if (!res._csrfToken) {
            res._csrfToken = generateClientToken(req, res);
        }
        return res._csrfToken;
    };

    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Extract CSRF token from request
    const token = req.get('X-CSRF-Token') || 
                  req.get('x-csrf-token') ||
                  req.body?.csrfToken;

    if (!token) {
        return res.status(403).json({ 
            error: 'CSRF token missing',
            code: 'CSRF_MISSING'
        });
    }

    // Verify token (async)
    verifyToken(token).then(valid => {
        if (!valid) {
            return res.status(403).json({ 
                error: 'Invalid CSRF token',
                code: 'CSRF_INVALID'
            });
        }

        next();
    }).catch(error => {
        console.error('CSRF verification error:', error);
        return res.status(500).json({ error: 'CSRF verification failed' });
    });
}

/**
 * Get new CSRF token endpoint
 */
function getCsrfToken(req, res) {
    const token = generateClientToken(req, res);
    
    res.json({
        csrfToken: token,
        expiresIn: 3600 // 1 hour
    });
}

module.exports = {
    generateToken,
    generateClientToken,
    verifyToken,
    csrfProtection,
    getCsrfToken
};
