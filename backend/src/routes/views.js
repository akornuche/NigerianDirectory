/**
 * Page Views API Routes
 * Records and retrieves page view analytics
 */
const express = require('express');
const router = express.Router();
const PageView = require('../models/PageView');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Recording is public, since any visitor's page view is recorded, but it
// writes a row per call, so it is limited per IP to stop table flooding.
const recordLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many page view events' }
});

// Reading analytics exposes traffic data and is for admins only.
const adminOnly = [authenticate, requireAdmin];

function boundedInt(value, fallback, max) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(n, max);
}

/**
 * Helper to hash IP addresses for privacy
 */
function hashIP(ip) {
    return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').substring(0, 16);
}

/**
 * POST /api/views
 * Record a page view
 */
router.post('/', recordLimiter, async (req, res) => {
    try {
        const { school_id, page_type } = req.body;

        if (!school_id || !/^\d+$/.test(String(school_id))) {
            return res.status(400).json({ error: 'school_id is required and must be an integer' });
        }
        if (page_type !== undefined && !['listing', 'blog'].includes(page_type)) {
            return res.status(400).json({ error: "page_type must be 'listing' or 'blog'" });
        }

        const ip_hash = hashIP(req.ip || req.headers['x-forwarded-for']);
        const user_agent = req.headers['user-agent'] || null;
        const referrer = req.headers['referer'] || req.body.referrer || null;

        const result = await PageView.record({
            school_id,
            page_type: page_type || 'listing',
            ip_hash,
            user_agent,
            referrer
        });

        res.status(201).json({ success: true, id: result.id });
    } catch (error) {
        console.error('Error recording page view:', error);
        res.status(500).json({ error: 'Failed to record page view' });
    }
});

/**
 * GET /api/views/school/:id
 * Get views for a specific school
 */
router.get('/school/:id', adminOnly, async (req, res) => {
    try {
        const days = boundedInt(req.query.days, 30, 365);
        const views = await PageView.getBySchool(req.params.id, days);
        res.json(views);
    } catch (error) {
        console.error('Error getting school views:', error);
        res.status(500).json({ error: 'Failed to get school views' });
    }
});

/**
 * GET /api/views/school/:id/daily
 * Get daily view breakdown for a school
 */
router.get('/school/:id/daily', adminOnly, async (req, res) => {
    try {
        const days = boundedInt(req.query.days, 30, 365);
        const views = await PageView.getDailyViews(req.params.id, days);
        res.json(views);
    } catch (error) {
        console.error('Error getting daily views:', error);
        res.status(500).json({ error: 'Failed to get daily views' });
    }
});

/**
 * GET /api/views/top
 * Get top viewed pages
 */
router.get('/top', adminOnly, async (req, res) => {
    try {
        const limit = boundedInt(req.query.limit, 20, 100);
        const days = boundedInt(req.query.days, 30, 365);
        const top = await PageView.getTopPages(limit, days);
        res.json(top);
    } catch (error) {
        console.error('Error getting top pages:', error);
        res.status(500).json({ error: 'Failed to get top pages' });
    }
});

/**
 * GET /api/views/stats
 * Get overall view stats
 */
router.get('/stats', adminOnly, async (req, res) => {
    try {
        const days = boundedInt(req.query.days, 30, 365);
        const stats = await PageView.getStats(days);
        res.json(stats);
    } catch (error) {
        console.error('Error getting view stats:', error);
        res.status(500).json({ error: 'Failed to get view stats' });
    }
});

module.exports = router;
