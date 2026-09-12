const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');
const tokenService = require('../services/tokenService');
const { registerValidation, loginValidation } = require('../middleware/validators');
const rateLimit = require('express-rate-limit');

// Stricter rate limiting for auth endpoints - get from parent app
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts' }
});

const refreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many refresh attempts' }
});

// ============================================
// POST /api/auth/register - Register new user
// ============================================
router.post('/register', registerValidation, authLimiter, async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create user
        const user = await User.create({ name, email, password });

        // Generate token pair
        const tokens = tokenService.generateTokenPair(user);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: user.id,
                uuid: user.uuid,
                name: user.name,
                email: user.email,
                role: user.role
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/auth/login - Login user
// ============================================
router.post('/login', loginValidation, authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValidPassword = await User.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token pair
        const tokens = tokenService.generateTokenPair(user);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                uuid: user.uuid,
                name: user.name,
                email: user.email,
                role: user.role
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/auth/refresh - Refresh access token
// ============================================
router.post('/refresh', refreshLimiter, async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = tokenService.verifyToken(refreshToken, 'refresh');

        // Get user
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new token pair
        const tokens = tokenService.generateTokenPair(user);

        res.json({
            message: 'Token refreshed successfully',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Refresh token expired',
                code: 'REFRESH_TOKEN_EXPIRED'
            });
        }
        if (error.message.includes('revoked')) {
            return res.status(401).json({ 
                error: 'Refresh token has been revoked',
                code: 'TOKEN_REVOKED'
            });
        }
        next(error);
    }
});

// ============================================
// POST /api/auth/logout - Logout user (revoke tokens)
// ============================================
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const accessToken = req.token;

        // Revoke both tokens
        const result = await tokenService.logout(accessToken, refreshToken);

        res.json({
            message: 'Logout successful',
            ...result
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/auth/me - Get current user
// ============================================
router.get('/me', authenticate, async (req, res) => {
    const tokenInfo = tokenService.validateTokenStructure(req.token);

    res.json({
        user: {
            id: req.user.id,
            uuid: req.user.uuid,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            email_verified: req.user.email_verified,
            created_at: req.user.created_at
        },
        token: {
            expiresIn: tokenInfo.expiresIn,
            expiresAt: tokenInfo.expiresAt
        }
    });
});

// ============================================
// PATCH /api/auth/me - Update current user
// ============================================
router.patch('/me', authenticate, async (req, res, next) => {
    try {
        const { name, email } = req.body;
        
        // Check if email is taken (if changing email)
        if (email && email !== req.user.email) {
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ error: 'Email already in use' });
            }
        }

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;

        const user = await User.update(req.user.id, updates);
        
        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                uuid: user.uuid,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/auth/change-password - Change password
// ============================================
router.post('/change-password', authenticate, authLimiter, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        // Get user with password hash
        const user = await User.findByEmail(req.user.email);
        
        // Verify current password
        const isValidPassword = await User.verifyPassword(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        await User.updatePassword(req.user.id, newPassword);

        // Revoke all tokens - user must log in again with new password
        await tokenService.blacklistToken(req.token);

        res.json({ 
            message: 'Password changed successfully. Please log in again.',
            code: 'PASSWORD_CHANGED'
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/auth/my-schools - Get user's claimed schools
// ============================================
router.get('/my-schools', authenticate, async (req, res, next) => {
    try {
        const schools = await User.getClaimedSchools(req.user.id);
        res.json(schools);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/auth/token-info - Get current token info (debug endpoint)
// ============================================
router.get('/token-info', authenticate, (req, res) => {
    const tokenInfo = tokenService.validateTokenStructure(req.token);

    res.json({
        token: tokenInfo,
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});

module.exports = router;
