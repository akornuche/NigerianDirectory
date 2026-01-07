const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validators');

// ============================================
// POST /api/auth/register - Register new user
// ============================================
router.post('/register', registerValidation, async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create user
        const user = await User.create({ name, email, password });

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: user.id,
                uuid: user.uuid,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/auth/login - Login user
// ============================================
router.post('/login', loginValidation, async (req, res, next) => {
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

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                uuid: user.uuid,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/auth/me - Get current user
// ============================================
router.get('/me', authenticate, async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            uuid: req.user.uuid,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            email_verified: req.user.email_verified,
            created_at: req.user.created_at
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
router.post('/change-password', authenticate, async (req, res, next) => {
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

        res.json({ message: 'Password changed successfully' });
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

module.exports = router;
