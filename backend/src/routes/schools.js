const express = require('express');
const router = express.Router();
const School = require('../models/School');
const Location = require('../models/Location');
const { getCache, setCache, deleteCache, clearCachePattern, CACHE_TTL } = require('../config/redis');
const { authenticate, requireAdmin, checkSchoolOwnership } = require('../middleware/auth');
const { schoolListValidation, schoolSlugValidation, schoolCreateValidation, schoolUpdateValidation } = require('../middleware/validators');
const { generateSummary } = require('../services/summaryGenerator');

// ============================================
// GET /api/schools - List schools with filters
// ============================================
router.get('/', schoolListValidation, async (req, res, next) => {
    try {
        const {
            state, city, area, type, curriculum, gender, boarding,
            search, page = 1, limit = 20, sortBy, sortOrder
        } = req.query;

        // Build cache key
        const cacheKey = `schools:list:${JSON.stringify(req.query)}`;

        // Check cache
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Query database
        const result = await School.list({
            state, city, area, type, curriculum, gender,
            institution_category: req.query.category || req.query.institution_category,
            boarding: boarding === 'true' ? true : boarding === 'false' ? false : undefined,
            search, page, limit, sortBy, sortOrder
        });

        // Cache result
        await setCache(cacheKey, result, CACHE_TTL.MEDIUM);

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/schools/featured - Get featured schools
// ============================================
router.get('/featured', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const cacheKey = `schools:featured:${limit}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const schools = await School.getFeatured(limit);

        await setCache(cacheKey, schools, CACHE_TTL.MEDIUM);
        res.json(schools);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/schools/stats - Get school statistics
// ============================================
router.get('/stats', async (req, res, next) => {
    try {
        const cacheKey = 'schools:stats';

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const stats = await School.getStats();

        await setCache(cacheKey, stats, CACHE_TTL.LONG);
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/schools/state/:state - Get schools by state
// ============================================
router.get('/state/:state', async (req, res, next) => {
    try {
        const { state } = req.params;
        const cacheKey = `schools:state:${state.toLowerCase()}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const schools = await School.getByState(state);
        const areas = await Location.getAreasByState(state);

        const result = {
            state,
            schoolCount: schools.length,
            areas: [...new Set(schools.map(s => s.area).filter(Boolean))],
            areaDetails: areas,
            schools
        };

        await setCache(cacheKey, result, CACHE_TTL.MEDIUM);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/schools/area/:state/:area - Get schools by area
// ============================================
router.get('/area/:state/:area', async (req, res, next) => {
    try {
        const { state, area } = req.params;
        const cacheKey = `schools:area:${state.toLowerCase()}:${area.toLowerCase()}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const schools = await School.getByArea(state, area);

        const result = {
            state,
            area,
            schoolCount: schools.length,
            schools
        };

        await setCache(cacheKey, result, CACHE_TTL.MEDIUM);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/schools/:state/:area/:slug - Get school by full path
// ============================================
router.get('/:state/:area/:slug', async (req, res, next) => {
    try {
        const { state, area, slug } = req.params;
        const cacheKey = `schools:path:${state.toLowerCase()}:${area.toLowerCase()}:${slug}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const school = await School.findBySlug(slug);

        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }

        // Verify state and either area OR city match
        const schoolState = school.state.toLowerCase().replace(/\s+/g, '-');
        const schoolArea = school.area?.toLowerCase().replace(/\s+/g, '-') || '';
        const schoolCity = school.city?.toLowerCase().replace(/\s+/g, '-') || '';

        const stateMatch = schoolState === state.toLowerCase();
        const locationMatch = schoolArea === area.toLowerCase() || schoolCity === area.toLowerCase();

        if (!stateMatch || !locationMatch) {
            return res.status(404).json({ error: 'School not found at this location' });
        }

        await setCache(cacheKey, school, CACHE_TTL.MEDIUM);
        res.json(school);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/schools/:slug - Get school by slug
// ============================================
router.get('/:slug', schoolSlugValidation, async (req, res, next) => {
    try {
        const { slug } = req.params;
        const cacheKey = `schools:detail:${slug}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const school = await School.findBySlug(slug);

        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }

        // Get nearby schools
        const nearbySchools = await School.getNearby(school.id, school.state, school.area, 5);

        // Get location hierarchy for breadcrumbs
        const locationHierarchy = await Location.getHierarchy(school.state, school.city, school.area);

        const result = {
            school,
            nearbySchools,
            breadcrumbs: locationHierarchy
        };

        await setCache(cacheKey, result, CACHE_TTL.MEDIUM);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/schools/:slug/blog - Get school blog data
// ============================================
router.get('/:slug/blog', async (req, res, next) => {
    try {
        const { slug } = req.params;
        const cacheKey = `schools:blog:${slug}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const school = await School.findBySlug(slug);

        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }

        // Get nearby schools for related section
        const relatedSchools = await School.getNearby(school.id, school.state, school.area, 5);

        // Get location hierarchy
        const locationHierarchy = await Location.getHierarchy(school.state, school.city, school.area);

        // Generate blog-specific meta data
        const blogData = {
            school,
            relatedSchools,
            breadcrumbs: locationHierarchy,
            meta: {
                title: `${school.name}, ${school.area}, ${school.city} – Profile, Updates & Highlights`,
                description: `Explore ${school.name} in ${school.area}, ${school.city}. Learn about its programs, leadership, student life, and achievements.`,
                canonical: `/schools/${school.state.toLowerCase()}/${school.area?.toLowerCase() || 'area'}/${school.slug}/blog/`
            },
            schema: {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: `${school.name}, ${school.area}, ${school.city} – Profile, Updates & Highlights`,
                author: {
                    '@type': 'Organization',
                    name: 'NigerianDirectory.com'
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'NigerianDirectory.com',
                    logo: {
                        '@type': 'ImageObject',
                        url: 'https://nigeriandirectory.com/logo.png'
                    }
                },
                datePublished: school.created_at,
                dateModified: school.updated_at,
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': `https://nigeriandirectory.com/schools/${school.state.toLowerCase()}/${school.area?.toLowerCase() || 'area'}/${school.slug}/blog/`
                },
                image: school.hero_image_url || school.logo_url
            }
        };

        await setCache(cacheKey, blogData, CACHE_TTL.MEDIUM);
        res.json(blogData);
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/schools - Create new school (admin only)
// ============================================
router.post('/', authenticate, requireAdmin, schoolCreateValidation, async (req, res, next) => {
    try {
        // Generate template summary
        const { summary, templateId } = generateSummary(req.body);

        const schoolData = {
            ...req.body,
            template_summary: summary,
            summary_template_id: templateId,
            needs_ai_enrichment: true
        };

        const school = await School.create(schoolData);

        // Clear relevant caches
        await clearCachePattern('schools:*');

        res.status(201).json(school);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'A school with this name already exists in this location' });
        }
        next(error);
    }
});

// ============================================
// PATCH /api/schools/:id - Update school
// ============================================
router.patch('/:id', authenticate, checkSchoolOwnership, schoolUpdateValidation, async (req, res, next) => {
    try {
        const { id } = req.params;

        const school = await School.update(id, req.body);

        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }

        // Clear relevant caches
        await deleteCache(`schools:detail:${school.slug}`);
        await deleteCache(`schools:blog:${school.slug}`);
        await clearCachePattern(`schools:state:${school.state.toLowerCase()}*`);
        await clearCachePattern(`schools:area:${school.state.toLowerCase()}*`);
        await clearCachePattern('schools:list:*');
        await clearCachePattern('schools:featured*');

        res.json(school);
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/schools/:id/claim - Initiate school claim
// ============================================
router.post('/:id/claim', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { verification_method, verification_notes } = req.body;

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }

        if (school.claimed) {
            return res.status(400).json({ error: 'This school has already been claimed' });
        }

        // Create claim (this is handled in claims route, redirect there)
        const Claim = require('../models/Claim');
        const claim = await Claim.create({
            school_id: id,
            user_id: req.user.id,
            verification_method,
            verification_notes
        });

        res.status(201).json({
            message: 'Claim submitted successfully',
            claim
        });
    } catch (error) {
        if (error.message === 'This school already has an active claim') {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
});

// ============================================
// DELETE /api/schools/:id - Delete school (admin only)
// ============================================
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }

        await School.delete(id);

        // Clear caches
        await deleteCache(`schools:detail:${school.slug}`);
        await deleteCache(`schools:blog:${school.slug}`);
        await clearCachePattern('schools:*');

        res.json({ message: 'School deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
