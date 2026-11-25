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
// GET /api/admin/page-health - content and SEO health per record
// ============================================
// Every record is assessed with the same indexability rule the public site
// uses for noindex and the sitemap (utils/contentQuality), so "indexable"
// here means "Google is allowed to index this page". The set is small
// (hundreds of rows), so it is assessed, filtered, sorted and paged in JS.
//   ?category=all|university|school
//   &issue=all|not_indexable|missing_photo|missing_seo|missing_website
//   &q=<name search>&sort=score|name|state|words|updated&dir=asc|desc
//   &page=&limit=
const PAGE_HEALTH_SORTS = {
    score: (r) => r.page_score,
    words: (r) => r.original_words,
    name: (r) => r.name.toLowerCase(),
    state: (r) => `${r.state} ${r.name}`.toLowerCase(),
    updated: (r) => (r.updated_at ? new Date(r.updated_at).getTime() : 0),
};

router.get('/page-health', async (req, res, next) => {
    try {
        const { query } = require('../config/database');
        const { assessContentQuality } = require('../utils/contentQuality');
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
        const category = ['university', 'school'].includes(req.query.category) ? req.query.category : 'all';
        const issue = req.query.issue || req.query.filter || 'all';
        const sort = PAGE_HEALTH_SORTS[req.query.sort] ? req.query.sort : 'score';
        const dir = req.query.dir === 'desc' ? 'desc' : 'asc';
        const q = String(req.query.q || '').trim().toLowerCase();

        const { rows } = await query(
            `SELECT id, name, slug, state, city, area, type, institution_category, verification_status,
                    enriched_history, enriched_academics, enriched_campus_info, enriched_student_life,
                    meta_title, meta_description, hero_image_url, logo_url, website, updated_at
             FROM schools`
        );

        const filled = (v) => typeof v === 'string' && v.trim() !== '';
        const assessed = rows.map((r) => {
            const quality = assessContentQuality(r);
            const row = {
                id: r.id, name: r.name, slug: r.slug, state: r.state, city: r.city, area: r.area, type: r.type,
                institution_category: r.institution_category,
                verification_status: r.verification_status,
                updated_at: r.updated_at,
                indexable: quality.indexable,
                original_words: quality.originalWords,
                has_history: filled(r.enriched_history),
                has_academics: filled(r.enriched_academics),
                has_campus: filled(r.enriched_campus_info),
                has_student_life: filled(r.enriched_student_life),
                has_meta_title: filled(r.meta_title),
                has_meta_desc: filled(r.meta_description),
                has_hero_image: filled(r.hero_image_url),
                has_logo: filled(r.logo_url),
                has_website: filled(r.website),
            };
            // 0-100: indexability carries the most weight, then the core
            // sections, then search snippet, photo and contact details.
            row.page_score =
                (row.indexable ? 40 : 0) +
                (row.has_history ? 15 : 0) + (row.has_academics ? 15 : 0) +
                (row.has_campus ? 8 : 0) + (row.has_student_life ? 2 : 0) +
                (row.has_meta_title && row.has_meta_desc ? 10 : 0) +
                (row.has_hero_image ? 5 : 0) + (row.has_website ? 5 : 0);
            return row;
        });

        const inCategory = assessed.filter((r) => category === 'all' || r.institution_category === category);
        const ISSUES = {
            not_indexable: (r) => !r.indexable,
            missing_photo: (r) => !r.has_hero_image,
            missing_seo: (r) => !(r.has_meta_title && r.has_meta_desc),
            missing_website: (r) => !r.has_website,
            // Older links used these names.
            missing_content: (r) => !r.indexable,
            missing_images: (r) => !r.has_hero_image,
            missing_meta: (r) => !(r.has_meta_title && r.has_meta_desc),
        };
        let list = inCategory.filter((r) => (ISSUES[issue] ? ISSUES[issue](r) : true));
        if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));

        const key = PAGE_HEALTH_SORTS[sort];
        list.sort((a, b) => {
            const x = key(a), y = key(b);
            const c = x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name);
            return dir === 'desc' ? -c : c;
        });

        const count = (fn) => inCategory.filter(fn).length;
        const avg = inCategory.length ? inCategory.reduce((n, r) => n + r.page_score, 0) / inCategory.length : 0;
        res.json({
            summary: {
                total: inCategory.length,
                universities: assessed.filter((r) => r.institution_category === 'university').length,
                schools: assessed.filter((r) => r.institution_category === 'school').length,
                indexable: count((r) => r.indexable),
                not_indexable: count((r) => !r.indexable),
                has_photo: count((r) => r.has_hero_image),
                has_seo: count((r) => r.has_meta_title && r.has_meta_desc),
                has_website: count((r) => r.has_website),
                avg_page_score: Math.round(avg * 10) / 10,
            },
            schools: list.slice((page - 1) * limit, page * limit),
            pagination: { page, limit, totalCount: list.length, totalPages: Math.max(1, Math.ceil(list.length / limit)) },
            sort, dir,
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
