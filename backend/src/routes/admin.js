const express = require('express');
const router = express.Router();
const School = require('../models/School');
const Location = require('../models/Location');
const Claim = require('../models/Claim');
const CrawlLog = require('../models/CrawlLog');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { clearCachePattern } = require('../config/redis');
const { generateSummary } = require('../services/summaryGenerator');

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// ============================================
// GET /api/admin/overview - Dashboard overview
// ============================================
router.get('/overview', async (req, res, next) => {
    try {
        const [schoolStats, locationStats, claimStats, crawlStats] = await Promise.all([
            School.getStats(),
            Location.getStats(),
            Claim.getStats(),
            CrawlLog.getStats()
        ]);

        res.json({
            schools: schoolStats,
            locations: locationStats,
            claims: claimStats,
            crawls: crawlStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/admin/enrichment-queue - Get schools needing enrichment
// ============================================
router.get('/enrichment-queue', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const schools = await School.getEnrichmentQueue(limit);
        
        res.json({
            count: schools.length,
            schools
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/admin/regenerate-summaries - Regenerate template summaries
// ============================================
router.post('/regenerate-summaries', async (req, res, next) => {
    try {
        const { schoolIds } = req.body;
        
        let schools;
        if (schoolIds && schoolIds.length > 0) {
            // Regenerate for specific schools
            schools = await Promise.all(
                schoolIds.map(id => School.findById(id))
            );
            schools = schools.filter(Boolean);
        } else {
            // Regenerate for all schools needing enrichment
            schools = await School.getEnrichmentQueue(100);
        }

        const results = [];
        for (const school of schools) {
            const { summary, templateId } = generateSummary(school);
            await School.update(school.id, {
                template_summary: summary,
                summary_template_id: templateId
            });
            results.push({
                id: school.id,
                name: school.name,
                templateId
            });
        }

        // Clear caches
        await clearCachePattern('schools:*');

        res.json({
            message: `Regenerated summaries for ${results.length} schools`,
            results
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/admin/users - List all users
// ============================================
router.get('/users', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await User.getAll(page, limit);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// PATCH /api/admin/users/:id/role - Update user role
// ============================================
router.patch('/users/:id/role', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['admin', 'school-owner', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const user = await User.update(id, { role });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User role updated',
            user
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/admin/crawl-logs - Get crawl logs
// ============================================
router.get('/crawl-logs', async (req, res, next) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;

        let result;
        if (status) {
            result = await CrawlLog.getByStatus(status, parseInt(page), parseInt(limit));
        } else {
            const logs = await CrawlLog.getRecent(parseInt(limit));
            result = { logs };
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/admin/clear-cache - Clear all caches
// ============================================
router.post('/clear-cache', async (req, res, next) => {
    try {
        const { pattern } = req.body;
        
        if (pattern) {
            await clearCachePattern(pattern);
        } else {
            await clearCachePattern('*');
        }

        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/admin/bulk-update-schools - Bulk update schools
// ============================================
router.post('/bulk-update-schools', async (req, res, next) => {
    try {
        const { schoolIds, updates } = req.body;

        if (!schoolIds || !Array.isArray(schoolIds) || schoolIds.length === 0) {
            return res.status(400).json({ error: 'School IDs array is required' });
        }

        const results = [];
        for (const id of schoolIds) {
            try {
                const school = await School.update(id, updates);
                if (school) {
                    results.push({ id, status: 'success' });
                } else {
                    results.push({ id, status: 'not_found' });
                }
            } catch (err) {
                results.push({ id, status: 'error', error: err.message });
            }
        }

        // Clear caches
        await clearCachePattern('schools:*');

        res.json({
            message: `Processed ${schoolIds.length} schools`,
            results
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
