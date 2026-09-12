const jwt = require('jsonwebtoken');
const User = require('../models/User');
const tokenService = require('../services/tokenService');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user (legacy - use tokenService instead)
 * @deprecated Use tokenService.generateAccessToken instead
 */
function generateToken(user) {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
    }
    return jwt.sign(
        {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        if (!JWT_SECRET) {
            throw new Error('JWT_SECRET not configured');
        }
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw error;
    }
}

/**
 * Authentication middleware - requires valid token
 * Checks if token is blacklisted (for logout)
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        
        // Check if token is blacklisted
        const isBlacklisted = await tokenService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(401).json({ error: 'Token has been revoked' });
        }

        // Verify token signature and expiration
        const decoded = verifyToken(token);
        
        // Get fresh user data
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Optional authentication - attaches user if token is valid, continues otherwise
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            // Check blacklist
            const isBlacklisted = await tokenService.isTokenBlacklisted(token);
            if (!isBlacklisted) {
                const decoded = verifyToken(token);
                const user = await User.findById(decoded.id);
                req.user = user || null;
                req.token = token;
            } else {
                req.user = null;
            }
        } else {
            req.user = null;
        }
        
        next();
    } catch (error) {
        // Token invalid, continue without user
        req.user = null;
        next();
    }
}

/**
 * Admin authorization middleware - requires admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
}

/**
 * School owner authorization - requires school-owner or admin role
 */
function requireSchoolOwner(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'school-owner') {
        return res.status(403).json({ error: 'School owner access required' });
    }
    
    next();
}

/**
 * Check if user owns the school
 */
async function checkSchoolOwnership(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admins can access any school
    if (req.user.role === 'admin') {
        return next();
    }
    
    const schoolId = req.params.id || req.params.schoolId;
    if (!schoolId) {
        return res.status(400).json({ error: 'School ID required' });
    }
    
    const School = require('../models/School');
    const school = await School.findById(schoolId);
    
    if (!school) {
        return res.status(404).json({ error: 'School not found' });
    }
    
    if (school.claimed_by_user_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not own this school' });
    }
    
    req.school = school;
    next();
}

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    optionalAuth,
    requireAdmin,
    requireSchoolOwner,
    checkSchoolOwnership
};
