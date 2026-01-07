const express = require('express');
const router = express.Router();
const Location = require('../models/Location');
const { getCache, setCache, CACHE_TTL } = require('../config/redis');
const { locationStateValidation, locationCityValidation } = require('../middleware/validators');

// ============================================
// GET /api/locations/states - Get all Nigerian states
// ============================================
router.get('/states', async (req, res, next) => {
    try {
        const cacheKey = 'locations:states';
        
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const states = await Location.getStates();
        
        await setCache(cacheKey, states, CACHE_TTL.DAY);
        res.json(states);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/locations/cities - Get major cities
// ============================================
router.get('/cities', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const cacheKey = `locations:cities:${limit}`;
        
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const cities = await Location.getMajorCities(limit);
        
        await setCache(cacheKey, cities, CACHE_TTL.DAY);
        res.json(cities);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/locations/cities-with-schools - Get cities with school counts
// ============================================
router.get('/cities-with-schools', async (req, res, next) => {
    try {
        const cacheKey = 'locations:cities-with-schools';
        
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const cities = await Location.getCitiesWithSchoolCounts();
        
        await setCache(cacheKey, cities, CACHE_TTL.LONG);
        res.json(cities);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/locations/stats - Get location statistics
// ============================================
router.get('/stats', async (req, res, next) => {
    try {
        const cacheKey = 'locations:stats';
        
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const stats = await Location.getStats();
        
        await setCache(cacheKey, stats, CACHE_TTL.DAY);
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/locations/search - Search locations
// ============================================
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q || q.length < 2) {
            return res.json([]);
        }

        const results = await Location.search(q, parseInt(limit));
        res.json(results);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/locations/state/:state - Get state details with cities
// ============================================
router.get('/state/:state', locationStateValidation, async (req, res, next) => {
    try {
        const { state } = req.params;
        const cacheKey = `locations:state:${state.toLowerCase()}`;
        
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const cities = await Location.getCitiesByState(state);
        const areas = await Location.getAreasByState(state);
        
        const result = {
            state,
            cityCount: cities.length,
            areaCount: areas.length,
            cities,
            areas
        };

        await setCache(cacheKey, result, CACHE_TTL.DAY);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/locations/state/:state/city/:city - Get city details with areas
// ============================================
router.get('/state/:state/city/:city', locationCityValidation, async (req, res, next) => {
    try {
        const { state, city } = req.params;
        const cacheKey = `locations:city:${state.toLowerCase()}:${city.toLowerCase()}`;
        
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const areas = await Location.getAreasByCity(state, city);
        
        const result = {
            state,
            city,
            areaCount: areas.length,
            areas
        };

        await setCache(cacheKey, result, CACHE_TTL.DAY);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/locations/hierarchy - Get location hierarchy for breadcrumbs
// ============================================
router.get('/hierarchy', async (req, res, next) => {
    try {
        const { state, city, area } = req.query;
        
        if (!state) {
            return res.status(400).json({ error: 'State parameter is required' });
        }

        const hierarchy = await Location.getHierarchy(state, city, area);
        res.json(hierarchy);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
