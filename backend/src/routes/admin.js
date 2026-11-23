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

const ContactSubmission = require('../models/ContactSubmission');

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// ============================================
// GET /api/admin/overview - Dashboard overview
// ============================================
router.get('/overview', async (req, res, next) => {
    try {
        const [schoolStats, locationStats, claimStats, crawlStats, contactStats] = await Promise.all([
            School.getStats({ includeUnpublished: true }),
            Location.getStats(),
            Claim.getStats(),
            CrawlLog.getStats(),
            ContactSubmission.getStats()
        ]);

        res.json({
            schools: schoolStats,
            locations: locationStats,
            claims: claimStats,
            crawls: crawlStats,
            contact: contactStats,
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

// ============================================
// GET /api/admin/page-health - Enrichment & SEO health per school
// ============================================
router.get('/page-health', async (req, res, next) => {
    try {
        const { query } = require('../config/database');
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 50;
        const filter = req.query.filter || 'all'; // all | missing_content | missing_images | missing_meta
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        if (filter === 'missing_content') whereClause = 'enriched_history IS NULL';
        if (filter === 'missing_images')  whereClause = 'hero_image_url IS NULL';
        if (filter === 'missing_meta')    whereClause = "meta_title IS NULL OR meta_title = ''";

        const [countRes, rowsRes, summaryRes] = await Promise.all([
            query(`SELECT COUNT(*) FROM schools WHERE ${whereClause}`),
            query(
                `SELECT
                    id, name, slug, state, city, area, type,
                    enriched_at, enrichment_status,
                    CASE WHEN enriched_history IS NOT NULL AND enriched_history != '' THEN true ELSE false END AS has_history,
                    CASE WHEN enriched_academics IS NOT NULL AND enriched_academics != '' THEN true ELSE false END AS has_academics,
                    CASE WHEN enriched_campus_info IS NOT NULL AND enriched_campus_info != '' THEN true ELSE false END AS has_campus,
                    CASE WHEN enriched_student_life IS NOT NULL AND enriched_student_life != '' THEN true ELSE false END AS has_student_life,
                    CASE WHEN meta_title IS NOT NULL AND meta_title != '' THEN true ELSE false END AS has_meta_title,
                    CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN true ELSE false END AS has_meta_desc,
                    CASE WHEN hero_image_url IS NOT NULL THEN true ELSE false END AS has_hero_image,
                    CASE WHEN logo_url IS NOT NULL THEN true ELSE false END AS has_logo,
                    CASE WHEN website IS NOT NULL THEN true ELSE false END AS has_website,
                    -- Content score 0-100
                    (
                        CASE WHEN enriched_history IS NOT NULL AND enriched_history != '' THEN 25 ELSE 0 END +
                        CASE WHEN enriched_academics IS NOT NULL AND enriched_academics != '' THEN 25 ELSE 0 END +
                        CASE WHEN enriched_campus_info IS NOT NULL AND enriched_campus_info != '' THEN 15 ELSE 0 END +
                        CASE WHEN enriched_student_life IS NOT NULL AND enriched_student_life != '' THEN 15 ELSE 0 END +
                        CASE WHEN meta_title IS NOT NULL AND meta_title != '' THEN 10 ELSE 0 END +
                        CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 5 ELSE 0 END +
                        CASE WHEN hero_image_url IS NOT NULL THEN 5 ELSE 0 END
                    ) AS page_score
                 FROM schools
                 WHERE ${whereClause}
                 ORDER BY page_score ASC, name ASC
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            ),
            query(`
                SELECT
                    COUNT(*) as total_schools,
                    COUNT(*) FILTER (WHERE enriched_history IS NOT NULL AND enriched_history != '') as has_content,
                    COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) as has_images,
                    COUNT(*) FILTER (WHERE meta_title IS NOT NULL AND meta_title != '') as has_meta,
                    ROUND(AVG(
                        CASE WHEN enriched_history IS NOT NULL AND enriched_history != '' THEN 25 ELSE 0 END +
                        CASE WHEN enriched_academics IS NOT NULL AND enriched_academics != '' THEN 25 ELSE 0 END +
                        CASE WHEN enriched_campus_info IS NOT NULL AND enriched_campus_info != '' THEN 15 ELSE 0 END +
                        CASE WHEN enriched_student_life IS NOT NULL AND enriched_student_life != '' THEN 15 ELSE 0 END +
                        CASE WHEN meta_title IS NOT NULL AND meta_title != '' THEN 10 ELSE 0 END +
                        CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 5 ELSE 0 END +
                        CASE WHEN hero_image_url IS NOT NULL THEN 5 ELSE 0 END
                    ), 1) as avg_page_score
                FROM schools
            `)
        ]);

        res.json({
            summary: summaryRes.rows[0],
            schools: rowsRes.rows,
            pagination: {
                page, limit,
                totalCount: parseInt(countRes.rows[0].count),
                totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/admin/contact-submissions — List contact/ownership form submissions
// ============================================
router.get('/contact-submissions', async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 30;
        const { status, submission_type } = req.query;

        const result = await ContactSubmission.getAll({ page, limit, status, submission_type });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/admin/claims - Pending ownership claims (account-based)
// ============================================
router.get('/claims', async (req, res, next) => {
    try {
        const page  = parseInt(req.query.page)  || 1;
        const limit = Math.min(100, parseInt(req.query.limit) || 30);
        res.json(await Claim.getPending(page, limit));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
