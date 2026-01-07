const { query } = require('../config/database');
const slugify = require('slugify');

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
            fee_range, student_count, logo_url, hero_image_url, gallery_images
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
                meta_title, meta_description
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35
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
                `${name}, ${area}, ${city} - School Profile | NigerianDirectory`,
                `Discover ${name} in ${area}, ${city}, ${state}. Learn about programs, fees, facilities, and admissions.`
            ]
        );

        return result.rows[0];
    }

    // Generate unique slug
    static async generateUniqueSlug(baseSlug, state, area) {
        let slug = baseSlug;
        let counter = 1;

        while (true) {
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

    // Find by slug
    static async findBySlug(slug) {
        const result = await query(
            'SELECT * FROM schools WHERE slug = $1',
            [slug]
        );
        return result.rows[0] || null;
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
        search, page = 1, limit = 20, sortBy = 'name', sortOrder = 'ASC'
    }) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (state) {
            conditions.push(`LOWER(state) = LOWER($${paramIndex})`);
            params.push(state);
            paramIndex++;
        }

        if (city) {
            conditions.push(`LOWER(city) = LOWER($${paramIndex})`);
            params.push(city);
            paramIndex++;
        }

        if (area) {
            conditions.push(`LOWER(area) = LOWER($${paramIndex})`);
            params.push(area);
            paramIndex++;
        }

        if (type) {
            conditions.push(`type = $${paramIndex}`);
            params.push(type);
            paramIndex++;
        }

        if (curriculum) {
            conditions.push(`curriculum ILIKE $${paramIndex}`);
            params.push(`%${curriculum}%`);
            paramIndex++;
        }

        if (gender) {
            conditions.push(`gender = $${paramIndex}`);
            params.push(gender);
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
                id, uuid, name, slug, type, state, city, area,
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
                id, name, slug, type, area, city,
                curriculum, levels, boarding, gender,
                logo_url, claimed, verified, template_summary
            FROM schools 
            WHERE LOWER(state) = LOWER($1)
            ORDER BY area, name`,
            [state]
        );
        return result.rows;
    }

    // Get schools by area for SEO pages
    static async getByArea(state, area) {
        const result = await query(
            `SELECT 
                id, name, slug, type, city, address,
                curriculum, levels, boarding, gender,
                logo_url, hero_image_url, claimed, verified,
                template_summary, fee_range
            FROM schools 
            WHERE LOWER(state) = LOWER($1) AND LOWER(area) = LOWER($2)
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
            'claimed', 'verified', 'claimed_by_user_id', 'claimed_at', 'verified_at',
            'meta_title', 'meta_description'
        ];

        const setClause = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramIndex}`);
                params.push(typeof value === 'object' ? JSON.stringify(value) : value);
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

        return result.rows[0] || null;
    }

    // Get featured schools
    static async getFeatured(limit = 10) {
        const result = await query(
            `SELECT 
                id, name, slug, type, state, city, area,
                curriculum, logo_url, hero_image_url, claimed, verified,
                template_summary
            FROM schools 
            WHERE verified = true OR claimed = true
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
    static async getStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total_schools,
                COUNT(*) FILTER (WHERE claimed = true) as claimed_schools,
                COUNT(*) FILTER (WHERE verified = true) as verified_schools,
                COUNT(*) FILTER (WHERE needs_ai_enrichment = true) as needs_enrichment,
                COUNT(DISTINCT state) as total_states,
                COUNT(DISTINCT area) as total_areas
            FROM schools
        `);
        return result.rows[0];
    }

    // Delete school
    static async delete(id) {
        const result = await query(
            'DELETE FROM schools WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0] || null;
    }
}

module.exports = School;
