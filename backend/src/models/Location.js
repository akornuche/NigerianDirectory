const { query } = require('../config/database');

class Location {
    // Create a new location
    static async create(locationData) {
        const { country, state, city, area, slug, latitude, longitude, population, is_major_city } = locationData;

        const result = await query(
            `INSERT INTO locations (country, state, city, area, slug, latitude, longitude, population, is_major_city)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (state, city, area) DO UPDATE SET
                 slug = EXCLUDED.slug,
                 latitude = COALESCE(EXCLUDED.latitude, locations.latitude),
                 longitude = COALESCE(EXCLUDED.longitude, locations.longitude),
                 population = COALESCE(EXCLUDED.population, locations.population),
                 is_major_city = COALESCE(EXCLUDED.is_major_city, locations.is_major_city)
             RETURNING *`,
            [country || 'Nigeria', state, city, area, slug, latitude, longitude, population, is_major_city || false]
        );

        return result.rows[0];
    }

    // Get all states
    static async getStates() {
        const result = await query(
            `SELECT DISTINCT state, 
                    COUNT(DISTINCT city) as city_count,
                    MIN(slug) as slug
             FROM locations 
             WHERE state IS NOT NULL
             GROUP BY state 
             ORDER BY state`
        );
        return result.rows;
    }

    // Get cities by state
    static async getCitiesByState(state) {
        const result = await query(
            `SELECT DISTINCT city, slug, latitude, longitude, population, is_major_city
             FROM locations 
             WHERE LOWER(state) = LOWER($1) AND city IS NOT NULL
             ORDER BY is_major_city DESC, population DESC NULLS LAST, city`,
            [state]
        );
        return result.rows;
    }

    // Get areas by state and city
    static async getAreasByCity(state, city) {
        const result = await query(
            `SELECT area, slug, latitude, longitude
             FROM locations 
             WHERE LOWER(state) = LOWER($1) AND LOWER(city) = LOWER($2) AND area IS NOT NULL
             ORDER BY area`,
            [state, city]
        );
        return result.rows;
    }

    // Get areas by state (for when city = state, like Lagos)
    static async getAreasByState(state) {
        const result = await query(
            `SELECT DISTINCT area, slug, latitude, longitude
             FROM locations 
             WHERE LOWER(state) = LOWER($1) AND area IS NOT NULL
             ORDER BY area`,
            [state]
        );
        return result.rows;
    }

    // Get major cities (for homepage)
    static async getMajorCities(limit = 50) {
        const result = await query(
            `SELECT DISTINCT ON (city) 
                    city, state, slug, latitude, longitude, population, is_major_city
             FROM locations 
             WHERE city IS NOT NULL AND is_major_city = true
             ORDER BY city, population DESC NULLS LAST
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    // Get all cities with school counts
    static async getCitiesWithSchoolCounts() {
        const result = await query(
            `SELECT 
                l.city, l.state, l.slug,
                COUNT(DISTINCT s.id) as school_count
             FROM locations l
             LEFT JOIN schools s ON LOWER(s.city) = LOWER(l.city) AND LOWER(s.state) = LOWER(l.state)
                 AND s.verification_status = 'verified'
             WHERE l.city IS NOT NULL
             GROUP BY l.city, l.state, l.slug
             HAVING COUNT(DISTINCT s.id) > 0
             ORDER BY school_count DESC, l.city`
        );
        return result.rows;
    }

    // Find by slug
    static async findBySlug(slug) {
        const result = await query(
            'SELECT * FROM locations WHERE slug = $1',
            [slug]
        );
        return result.rows[0] || null;
    }

    // Search locations
    static async search(searchTerm, limit = 10) {
        const result = await query(
            `SELECT DISTINCT state, city, area, slug
             FROM locations 
             WHERE state ILIKE $1 OR city ILIKE $1 OR area ILIKE $1
             ORDER BY 
                CASE 
                    WHEN state ILIKE $1 THEN 1
                    WHEN city ILIKE $1 THEN 2
                    ELSE 3
                END,
                state, city, area
             LIMIT $2`,
            [`%${searchTerm}%`, limit]
        );
        return result.rows;
    }

    // Get location hierarchy for breadcrumbs
    static async getHierarchy(state, city, area) {
        const hierarchy = {
            state: null,
            city: null,
            area: null
        };

        if (state) {
            const stateResult = await query(
                `SELECT DISTINCT state, MIN(slug) as slug FROM locations WHERE LOWER(state) = LOWER($1) GROUP BY state`,
                [state]
            );
            hierarchy.state = stateResult.rows[0] || null;
        }

        if (city) {
            const cityResult = await query(
                `SELECT city, state, slug FROM locations WHERE LOWER(state) = LOWER($1) AND LOWER(city) = LOWER($2) LIMIT 1`,
                [state, city]
            );
            hierarchy.city = cityResult.rows[0] || null;
        }

        if (area) {
            const areaResult = await query(
                `SELECT area, city, state, slug FROM locations WHERE LOWER(state) = LOWER($1) AND LOWER(area) = LOWER($2) LIMIT 1`,
                [state, area]
            );
            hierarchy.area = areaResult.rows[0] || null;
        }

        return hierarchy;
    }

    // Bulk create locations
    static async bulkCreate(locations) {
        const results = [];
        for (const loc of locations) {
            const result = await this.create(loc);
            results.push(result);
        }
        return results;
    }

    // Get stats
    static async getStats() {
        const result = await query(`
            SELECT 
                COUNT(DISTINCT state) as total_states,
                COUNT(DISTINCT city) as total_cities,
                COUNT(DISTINCT area) as total_areas,
                COUNT(*) as total_locations
            FROM locations
        `);
        return result.rows[0];
    }
}

module.exports = Location;
