const { query } = require('../config/database');

class EnrichmentQueue {
    /**
     * Add a school to the enrichment queue
     */
    static async add(schoolId, priority = 5) {
        const result = await query(
            `INSERT INTO enrichment_queue (school_id, priority, status)
             VALUES ($1, $2, 'pending')
             ON CONFLICT (school_id) DO UPDATE SET
                 priority = GREATEST(enrichment_queue.priority, EXCLUDED.priority),
                 status = CASE 
                     WHEN enrichment_queue.status IN ('completed', 'failed') THEN 'pending'
                     ELSE enrichment_queue.status
                 END,
                 created_at = CASE 
                     WHEN enrichment_queue.status IN ('completed', 'failed') THEN NOW()
                     ELSE enrichment_queue.created_at
                 END
             RETURNING *`,
            [schoolId, priority]
        );
        return result.rows[0];
    }

    /**
     * Get next batch of items to process (highest priority first)
     */
    static async getNext(limit = 10) {
        const result = await query(
            `UPDATE enrichment_queue SET
                 status = 'processing',
                 last_attempt = NOW(),
                 attempts = attempts + 1
             WHERE id IN (
                 SELECT id FROM enrichment_queue
                 WHERE status = 'pending'
                 ORDER BY priority DESC, created_at ASC
                 LIMIT $1
                 FOR UPDATE SKIP LOCKED
             )
             RETURNING *`,
            [limit]
        );

        // Join with school data
        if (result.rows.length === 0) return [];

        const ids = result.rows.map(r => r.school_id);
        const schools = await query(
            `SELECT id, name, slug, state, area, website FROM schools WHERE id = ANY($1)`,
            [ids]
        );

        const schoolMap = {};
        schools.rows.forEach(s => { schoolMap[s.id] = s; });

        return result.rows.map(item => ({
            ...item,
            school: schoolMap[item.school_id] || null
        }));
    }

    /**
     * Mark item as completed
     */
    static async markCompleted(schoolId) {
        const result = await query(
            `UPDATE enrichment_queue SET
                 status = 'completed',
                 completed_at = NOW()
             WHERE school_id = $1
             RETURNING *`,
            [schoolId]
        );
        return result.rows[0] || null;
    }

    /**
     * Mark item as failed
     */
    static async markFailed(schoolId, errorMessage) {
        const result = await query(
            `UPDATE enrichment_queue SET
                 status = 'failed',
                 error_message = $2
             WHERE school_id = $1
             RETURNING *`,
            [schoolId, errorMessage]
        );
        return result.rows[0] || null;
    }

    /**
     * Get queue item by school ID
     */
    static async getBySchool(schoolId) {
        const result = await query(
            'SELECT * FROM enrichment_queue WHERE school_id = $1',
            [schoolId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get queue items by status with pagination
     */
    static async getByStatus(status, page = 1, limit = 50) {
        const offset = (page - 1) * limit;

        const countResult = await query(
            'SELECT COUNT(*) FROM enrichment_queue WHERE status = $1',
            [status]
        );
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT eq.*, s.name as school_name, s.slug as school_slug
             FROM enrichment_queue eq
             LEFT JOIN schools s ON eq.school_id = s.id
             WHERE eq.status = $1
             ORDER BY eq.priority DESC, eq.created_at ASC
             LIMIT $2 OFFSET $3`,
            [status, limit, offset]
        );

        return {
            items: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        };
    }

    /**
     * Queue all un-enriched schools
     */
    static async queueUnenriched(priority = 3) {
        const result = await query(
            `INSERT INTO enrichment_queue (school_id, priority, status)
             SELECT id, $1, 'pending' FROM schools
             WHERE needs_ai_enrichment = true
               AND id NOT IN (
                   SELECT school_id FROM enrichment_queue
                   WHERE status IN ('pending', 'processing')
               )
             ON CONFLICT (school_id) DO NOTHING
             RETURNING *`,
            [priority]
        );
        return result.rows;
    }

    /**
     * Reset failed items for retry
     */
    static async resetFailed(maxAttempts = 3) {
        const result = await query(
            `UPDATE enrichment_queue SET
                 status = 'pending',
                 error_message = NULL
             WHERE status = 'failed' AND attempts < $1
             RETURNING *`,
            [maxAttempts]
        );
        return result.rows;
    }

    /**
     * Get stats
     */
    static async getStats() {
        const result = await query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'processing') as processing,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                AVG(attempts) FILTER (WHERE status = 'completed') as avg_attempts,
                MAX(completed_at) as last_completed
            FROM enrichment_queue
        `);
        return result.rows[0];
    }

    /**
     * Delete completed items older than N days
     */
    static async cleanup(daysOld = 30) {
        const result = await query(
            `DELETE FROM enrichment_queue
             WHERE status = 'completed'
               AND completed_at < NOW() - INTERVAL '${daysOld} days'
             RETURNING id`
        );
        return result.rowCount;
    }
}

module.exports = EnrichmentQueue;
