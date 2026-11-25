const { query } = require('../config/database');
const { urlSegmentSql } = require('../utils/slugify');
const slugify = require('slugify');

/**
 * Convert a value for a parameterised UPDATE. Plain objects and arrays are
 * the JSONB columns and are serialised. null must stay SQL NULL, and Dates
 * are passed through for pg to format: serialising either produced the text
 * "null" or a quoted date string that timestamp columns reject.
 */
function toColumnValue(value) {
    if (value === null || value === undefined || value instanceof Date) {
        return value ?? null;
    }
    return typeof value === 'object' ? JSON.stringify(value) : value;
}

// Only records verified against an independent source are shown publicly.
// Admin tooling passes includeUnpublished to see everything.
const PUBLISHED = "verification_status = 'verified'";

class School {
    // Create a new school
    static async create(schoolData) {
        const {
            name, type, state, city, area, address,
            latitude, longitude, curriculum, levels,
            boarding, day_school, gender, phone, email, website,
            social_links, template_summary, established_year,
            principal_name, principal_title, principal_image_url,
            management_info, facilities, achievements, student_life,
            fee_range, student_count, logo_url, hero_image_url, gallery_images,
            content_sources, meta_title, meta_description, institution_category
        } = schoolData;

        // Generate unique slug
        const baseSlug = slugify(`${name}`, { lower: true, strict: true });
        const slug = await this.generateUniqueSlug(baseSlug, state, area);

        const result = await query(
            `INSERT INTO schools (
                name, slug, type, state, city, area, address,
                latitude, longitude, curriculum, levels,
                boarding, day_school, gender, phone, email, website,
                social_links, template_summary, needs_ai_enrichment,
                established_year, principal_name, principal_title, principal_image_url,
                management_info, facilities, achievements, student_life,
                fee_range, student_count, logo_url, hero_image_url, gallery_images,
                content_sources, meta_title, meta_description, institution_category
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35, $36, $37
            ) RETURNING *`,
            [
                name, slug, type, state, city, area, address,
                latitude, longitude, curriculum, levels,
                boarding ?? false, day_school ?? true, gender, phone, email, website,
                JSON.stringify(social_links || {}), template_summary, true,
                established_year, principal_name, principal_title, principal_image_url,
                JSON.stringify(management_info || []), JSON.stringify(facilities || []),
                JSON.stringify(achievements || []), JSON.stringify(student_life || {}),
                fee_range, student_count, logo_url, hero_image_url, JSON.stringify(gallery_images || []),
                JSON.stringify(content_sources || []),
                meta_title, meta_description, institution_category || 'school'
            ]
        );

        return result.rows[0];
    }

    // Generate unique slug
    static async generateUniqueSlug(baseSlug, state, area) {
        let slug = baseSlug;
        let counter = 1;

        for (;;) {
            const existing = await query(
                'SELECT id FROM schools WHERE slug = $1',
                [slug]
            );

            if (existing.rows.length === 0) {
                return slug;
            }

            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }

    // Find by slug. Unpublished records are hidden unless includeUnpublished.
    static async findBySlug(slug, { includeUnpublished = false } = {}) {
        const result = await query(
            `SELECT * FROM schools WHERE slug = $1${includeUnpublished ? '' : ` AND ${PUBLISHED}`}`,
            [slug]
        );
        if (!result.rows[0]) return null;
        const school = result.rows[0];
        // Parse all JSON fields
        [
            'social_links', 'management_info', 'facilities', 'achievements',
            'student_life', 'gallery_images', 'content_sources',
            'enriched_notable_alumni', 'enriched_recent_news'
        ].forEach(field => {
            if (school[field] && typeof school[field] === 'string') {
                try { school[field] = JSON.parse(school[field]); } catch { school[field] = []; }
            }
        });
        return school;
    }

    /**
     * Resolve the slug of a record that was merged or renamed to the slug of
     * the published record that replaced it, so its old URL can 301.
     * @returns {Promise<string|null>}
     */
    static async resolveSlugAlias(oldSlug) {
        const result = await query(
            `SELECT s.slug FROM slug_aliases a
             JOIN schools s ON s.id = a.school_id
             WHERE a.old_slug = $1 AND s.${PUBLISHED}`,
            [oldSlug]
        );
        return result.rows[0]?.slug || null;
    }

    // Find by ID
    static async findById(id) {
        const result = await query(
            'SELECT * FROM schools WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    // List schools with filters and pagination
    static async list({
        state, city, area, type, curriculum, gender, boarding,
        institution_category, search, page = 1, limit = 20, sortBy = 'name', sortOrder = 'ASC',
        includeUnpublished = false
    }) {
        const conditions = includeUnpublished ? [] : [PUBLISHED];
        const params = [];
        let paramIndex = 1;

        if (state) {
            conditions.push(`(LOWER(state) = LOWER($${paramIndex}) OR ${urlSegmentSql('state')} = LOWER($${paramIndex}))`);
            params.push(state);
            paramIndex++;
        }

        if (city) {
            conditions.push(`(LOWER(city) = LOWER($${paramIndex}) OR ${urlSegmentSql('city')} = LOWER($${paramIndex}))`);
            params.push(city);
            paramIndex++;
        }

        if (area) {
            conditions.push(`(LOWER(area) = LOWER($${paramIndex}) OR ${urlSegmentSql('area')} = LOWER($${paramIndex}))`);
            params.push(area);
            paramIndex++;
        }

        if (type) {
            conditions.push(`LOWER(type) = LOWER($${paramIndex})`);
            params.push(type);
            paramIndex++;
        }

        if (curriculum) {
            conditions.push(`curriculum ILIKE $${paramIndex}`);
            params.push(`%${curriculum}%`);
            paramIndex++;
        }

        if (gender) {
            conditions.push(`LOWER(gender) = LOWER($${paramIndex})`);
            params.push(gender);
            paramIndex++;
        }

        if (institution_category) {
            conditions.push(`LOWER(institution_category) = LOWER($${paramIndex})`);
            params.push(institution_category);
            paramIndex++;
        }

        if (boarding !== undefined) {
            conditions.push(`boarding = $${paramIndex}`);
            params.push(boarding);
            paramIndex++;
        }

        if (search) {
            conditions.push(`(name ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // Validate sort column
        const validSortColumns = ['name', 'created_at', 'updated_at', 'established_year'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
        const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM schools ${whereClause}`,
            params
        );
        const totalCount = parseInt(countResult.rows[0].count);

        // Get schools
        const schoolsResult = await query(
            `SELECT 
                id, uuid, name, slug, institution_category, type, state, city, area,
                curriculum, levels, boarding, gender, 
                logo_url, hero_image_url, claimed, verified,
                template_summary, established_year, fee_range
            FROM schools 
            ${whereClause}
            ORDER BY ${sortColumn} ${order}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        return {
            schools: schoolsResult.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        };
    }

    // Get schools by state for SEO pages
    static async getByState(state) {
        const result = await query(
            `SELECT 
                id, name, slug, institution_category, type, state, city, area,
                curriculum, levels, boarding, gender,
                logo_url, hero_image_url, claimed, verified, template_summary
            FROM schools 
            WHERE (LOWER(state) = LOWER($1) OR ${urlSegmentSql('state')} = LOWER($1))
              AND ${PUBLISHED}
            ORDER BY area, name`,
            [state]
        );
        return result.rows;
    }

    // Get schools by area for SEO pages
    static async getByArea(state, area) {
        const result = await query(
            `SELECT 
                id, name, slug, institution_category, type, state, city, area, address,
                curriculum, levels, boarding, gender,
                logo_url, hero_image_url, claimed, verified,
                template_summary, fee_range
            FROM schools 
            WHERE (LOWER(state) = LOWER($1) OR ${urlSegmentSql('state')} = LOWER($1))
              AND (LOWER(area) = LOWER($2) OR ${urlSegmentSql('area')} = LOWER($2))
              AND ${PUBLISHED}
            ORDER BY name`,
            [state, area]
        );
        return result.rows;
    }

    // Get nearby schools
    static async getNearby(schoolId, state, area, limit = 5) {
        const result = await query(
            `SELECT 
                id, name, slug, type, area, city,
                logo_url, claimed, verified
            FROM schools 
            WHERE id != $1 
                AND (LOWER(area) = LOWER($2) OR LOWER(state) = LOWER($3))
                AND ${PUBLISHED}
            ORDER BY 
                CASE WHEN LOWER(area) = LOWER($2) THEN 0 ELSE 1 END,
                name
            LIMIT $4`,
            [schoolId, area, state, limit]
        );
        return result.rows;
    }

    // Update school
    static async update(id, updates) {
        const allowedFields = [
            'name', 'type', 'address', 'latitude', 'longitude',
            'curriculum', 'levels', 'boarding', 'day_school', 'gender',
            'phone', 'email', 'website', 'social_links',
            'template_summary', 'ai_summary', 'needs_ai_enrichment',
            'established_year', 'principal_name', 'principal_title', 'principal_image_url',
            'management_info', 'facilities', 'achievements', 'student_life',
            'fee_range', 'student_count', 'logo_url', 'hero_image_url', 'gallery_images',
            'claimed', 'verified', 'featured', 'claimed_by_user_id', 'claimed_at', 'verified_at',
            'meta_title', 'meta_description', 'content_sources',
            'enriched_history', 'enriched_academics', 'enriched_campus_info',
            'enriched_student_life', 'enriched_notable_alumni', 'enriched_recent_news',
            'enriched_at', 'enrichment_status', 'last_enriched',
            // University-specific columns (migration 006)
            'accreditation', 'faculties', 'programmes', 'vc_name', 'vc_title',
            'student_population', 'postgraduate', 'distance_learning', 'year_chartered'
        ];

        const setClause = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramIndex}`);
                params.push(toColumnValue(value));
                paramIndex++;
            }
        }

        if (setClause.length === 0) {
            return null;
        }

        params.push(id);
        const result = await query(
            `UPDATE schools SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (!result.rows[0]) return null;
        const school = result.rows[0];
        [
            'social_links', 'management_info', 'facilities', 'achievements',
            'student_life', 'gallery_images', 'content_sources',
            'enriched_notable_alumni', 'enriched_recent_news'
        ].forEach(field => {
            if (school[field] && typeof school[field] === 'string') {
                try { school[field] = JSON.parse(school[field]); } catch { school[field] = []; }
            }
        });
        return school;
    }

    // Get featured schools
    static async getFeatured(limit = 10) {
        const result = await query(
            `SELECT 
                id, name, slug, type, state, city, area,
                curriculum, logo_url, hero_image_url, claimed, verified,
                template_summary
            FROM schools 
            WHERE (verified = true OR claimed = true) AND ${PUBLISHED}
            ORDER BY verified DESC, claimed DESC, created_at DESC
            LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    // Get schools needing enrichment
    static async getEnrichmentQueue(limit = 50) {
        const result = await query(
            `SELECT * FROM schools 
            WHERE needs_ai_enrichment = true 
            ORDER BY claimed DESC, created_at ASC
            LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    // Get stats
    static async getStats({ includeUnpublished = false } = {}) {
        const result = await query(`
            SELECT 
                COUNT(*) as total_schools,
                COUNT(*) FILTER (WHERE institution_category = 'university') as universities,
                COUNT(*) FILTER (WHERE institution_category = 'school') as secondary_schools,
                COUNT(*) FILTER (WHERE claimed = true) as claimed_schools,
                COUNT(*) FILTER (WHERE verified = true) as verified_schools,
                COUNT(*) FILTER (WHERE needs_ai_enrichment = true) as needs_enrichment,
                COUNT(DISTINCT state) as total_states,
                COUNT(DISTINCT area) as total_areas
            FROM schools
            ${includeUnpublished ? '' : `WHERE ${PUBLISHED}`}
        `);
        // Published records per state, split by category, for the homepage's
        // state index. Counts arrive as strings, like the totals above.
        const byState = await query(`
            SELECT state,
                COUNT(*) FILTER (WHERE institution_category = 'school') as schools,
                COUNT(*) FILTER (WHERE institution_category = 'university') as universities
            FROM schools
            ${includeUnpublished ? '' : `WHERE ${PUBLISHED}`}
            GROUP BY state
            ORDER BY COUNT(*) DESC, state
        `);
        return { ...result.rows[0], by_state: byState.rows };
    }

    // Delete school
    static async delete(id) {
        const result = await query(
            'DELETE FROM schools WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0] || null;
    }

    // ============================================
    // AI AGENTS & GENERATIVE ENGINE OPTIMIZATION
    // ============================================

    /**
     * Search schools optimized for AI agents with rich context
     */
    static async searchForAI({ location, state, city, type, limit = 50 }) {
        let whereClause = `WHERE ${PUBLISHED}`;
        const params = [];
        let paramIndex = 1;

        if (state) {
            whereClause += ` AND LOWER(state) LIKE LOWER($${paramIndex})`;
            params.push(`%${state}%`);
            paramIndex++;
        }

        if (city) {
            whereClause += ` AND LOWER(city) LIKE LOWER($${paramIndex})`;
            params.push(`%${city}%`);
            paramIndex++;
        }

        if (location && !state && !city) {
            // Generic location search across city, state, and area
            whereClause += ` AND (LOWER(city) LIKE LOWER($${paramIndex}) OR LOWER(state) LIKE LOWER($${paramIndex}) OR LOWER(area) LIKE LOWER($${paramIndex}))`;
            params.push(`%${location}%`);
            paramIndex++;
        }

        if (type) {
            whereClause += ` AND LOWER(type) LIKE LOWER($${paramIndex})`;
            params.push(`%${type}%`);
            paramIndex++;
        }

        params.push(limit);

        const result = await query(
            `SELECT 
                id, name, slug, type, state, city, area, address,
                latitude, longitude, curriculum, levels,
                boarding, day_school, gender, phone, email, website,
                social_links, template_summary, established_year,
                principal_name, principal_title, management_info,
                facilities, achievements, student_life,
                fee_range, student_count, logo_url, hero_image_url,
                meta_title, meta_description, institution_category,
                enriched_history, enriched_academics, enriched_campus_info, enriched_student_life,
                created_at, updated_at
            FROM schools 
            ${whereClause}
            ORDER BY 
                CASE WHEN enriched_history IS NOT NULL THEN 1 ELSE 2 END,
                CASE WHEN website IS NOT NULL THEN 1 ELSE 2 END,
                updated_at DESC
            LIMIT $${paramIndex}`,
            params
        );

        return result.rows;
    }

    /**
     * Natural language search for AI agents
     */
    // The parameter is `searchText`, not `query`: naming it `query` shadowed
    // the database helper, so every call threw "query is not a function".
    static async naturalLanguageSearch(searchText, limit = 50) {
        const result = await query(
            `SELECT 
                id, name, slug, type, state, city, area,
                phone, email, website, template_summary,
                enriched_history, enriched_academics, enriched_campus_info, enriched_student_life,
                meta_title, meta_description, institution_category,
                ts_rank(
                    to_tsvector('english', 
                        COALESCE(name, '') || ' ' || 
                        COALESCE(city, '') || ' ' || 
                        COALESCE(state, '') || ' ' || 
                        COALESCE(type, '') || ' ' ||
                        COALESCE(enriched_history, '') || ' ' ||
                        COALESCE(enriched_academics, '') || ' ' ||
                        COALESCE(template_summary, '')
                    ),
                    plainto_tsquery('english', $1)
                ) AS relevance_score
            FROM schools 
            WHERE to_tsvector('english', 
                COALESCE(name, '') || ' ' || 
                COALESCE(city, '') || ' ' || 
                COALESCE(state, '') || ' ' || 
                COALESCE(type, '') || ' ' ||
                COALESCE(enriched_history, '') || ' ' ||
                COALESCE(enriched_academics, '') || ' ' ||
                COALESCE(template_summary, '')
            ) @@ plainto_tsquery('english', $1)
              AND ${PUBLISHED}
            ORDER BY relevance_score DESC, updated_at DESC
            LIMIT $2`,
            [searchText, limit]
        );

        return result.rows;
    }

    /**
     * Get featured schools optimized for AI agents
     */
    static async getFeaturedForAI(limit = 50) {
        const result = await query(
            `SELECT 
                id, name, slug, type, state, city, area,
                phone, email, website, template_summary, established_year,
                enriched_history, enriched_academics, enriched_campus_info, enriched_student_life,
                meta_title, meta_description, institution_category,
                logo_url, hero_image_url
            FROM schools 
            WHERE ${PUBLISHED} AND (
                enriched_history IS NOT NULL 
                OR enriched_academics IS NOT NULL 
                OR website IS NOT NULL
            )
            ORDER BY 
                CASE 
                    WHEN enriched_history IS NOT NULL AND enriched_academics IS NOT NULL THEN 1
                    WHEN enriched_history IS NOT NULL OR enriched_academics IS NOT NULL THEN 2
                    WHEN website IS NOT NULL THEN 3
                    ELSE 4
                END,
                LENGTH(COALESCE(enriched_history, '') || COALESCE(enriched_academics, '')) DESC,
                updated_at DESC
            LIMIT $1`,
            [limit]
        );

        return result.rows;
    }

    /**
     * Search schools by location (city, state, or region)
     */
    static async searchByLocation(location, limit = 20) {
        const result = await query(
            `SELECT 
                id, name, slug, type, state, city, area,
                phone, email, website, template_summary,
                enriched_history, enriched_academics, enriched_campus_info,
                meta_title, institution_category
            FROM schools 
            WHERE ${PUBLISHED} AND (
                LOWER(city) LIKE LOWER($1) OR 
                LOWER(state) LIKE LOWER($1) OR 
                LOWER(area) LIKE LOWER($1) OR
                LOWER(name) LIKE LOWER($1)
            )
            ORDER BY 
                CASE 
                    WHEN LOWER(city) = LOWER($1) THEN 1
                    WHEN LOWER(state) = LOWER($1) THEN 2
                    WHEN LOWER(city) LIKE LOWER($1) THEN 3
                    WHEN LOWER(state) LIKE LOWER($1) THEN 4
                    ELSE 5
                END,
                LENGTH(COALESCE(enriched_history, '') || COALESCE(enriched_academics, '')) DESC
            LIMIT $2`,
            [`%${location}%`, limit]
        );

        return result.rows;
    }

    /**
     * Get AI-optimized school statistics
     */
    static async getAIStats() {
        const result = await query(
            `SELECT 
                COUNT(*) as total_schools,
                COUNT(CASE WHEN enriched_history IS NOT NULL THEN 1 END) as schools_with_history,
                COUNT(CASE WHEN enriched_academics IS NOT NULL THEN 1 END) as schools_with_academics,
                COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as schools_with_websites,
                COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as schools_with_logos,
                COUNT(DISTINCT state) as states_covered,
                COUNT(DISTINCT city) as cities_covered,
                AVG(CASE 
                    WHEN enriched_history IS NOT NULL AND enriched_academics IS NOT NULL THEN 100
                    WHEN enriched_history IS NOT NULL OR enriched_academics IS NOT NULL THEN 50
                    ELSE 0
                END) as avg_content_completeness
            FROM schools
            WHERE ${PUBLISHED}`
        );

        return result.rows[0];
    }

    /**
     * Get schools by Nigerian region for AI geographic queries
     */
    static async getSchoolsByRegion(region, limit = 30) {
        const regionStates = {
            'southwest': ['Lagos', 'Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti'],
            'southeast': ['Anambra', 'Abia', 'Imo', 'Enugu', 'Ebonyi'],
            'south-south': ['Rivers', 'Delta', 'Bayelsa', 'Cross River', 'Akwa Ibom', 'Edo'],
            'north-central': ['FCT', 'Plateau', 'Niger', 'Kwara', 'Kogi', 'Benue', 'Nasarawa'],
            'northeast': ['Borno', 'Yobe', 'Bauchi', 'Gombe', 'Adamawa', 'Taraba'],
            'northwest': ['Kano', 'Kaduna', 'Katsina', 'Sokoto', 'Zamfara', 'Kebbi', 'Jigawa']
        };

        const states = regionStates[region.toLowerCase()] || [];
        
        if (states.length === 0) {
            return [];
        }

        const placeholders = states.map((_, index) => `$${index + 1}`).join(',');
        states.push(limit);

        const result = await query(
            `SELECT 
                id, name, slug, type, state, city, area,
                phone, email, website, template_summary,
                enriched_history, enriched_academics,
                meta_title, institution_category
            FROM schools 
            WHERE state = ANY(ARRAY[${placeholders}]) AND ${PUBLISHED}
            ORDER BY 
                LENGTH(COALESCE(enriched_history, '') || COALESCE(enriched_academics, '')) DESC,
                updated_at DESC
            LIMIT $${states.length}`,
            states
        );

        return result.rows;
    }
}

module.exports = School;
module.exports.toColumnValue = toColumnValue;
