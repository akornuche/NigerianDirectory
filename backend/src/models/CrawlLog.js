const { query } = require('../config/database');

class CrawlLog {
    // Create a new crawl log entry
    static async create(logData) {
        const {
            school_id, source_url, source_name, crawl_status,
            raw_data, parsed_data, confidence_score, error_message
        } = logData;

        const result = await query(
            `INSERT INTO crawl_logs (
                school_id, source_url, source_name, crawl_status,
                raw_data, parsed_data, confidence_score, error_message
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                school_id, source_url, source_name, crawl_status,
                JSON.stringify(raw_data || {}),
                JSON.stringify(parsed_data || {}),
                confidence_score, error_message
            ]
        );

        return result.rows[0];
    }

    // Get logs by school
    static async getBySchool(schoolId) {
        const result = await query(
            `SELECT * FROM crawl_logs 
             WHERE school_id = $1 
             ORDER BY last_crawled DESC`,
            [schoolId]
        );
        return result.rows;
    }

    // Get recent logs
    static async getRecent(limit = 100) {
        const result = await query(
            `SELECT cl.*, s.name as school_name, s.slug as school_slug
             FROM crawl_logs cl
             LEFT JOIN schools s ON cl.school_id = s.id
             ORDER BY cl.last_crawled DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    // Get logs by status
    static async getByStatus(status, page = 1, limit = 50) {
        const offset = (page - 1) * limit;

        const countResult = await query(
            'SELECT COUNT(*) FROM crawl_logs WHERE crawl_status = $1',
            [status]
        );
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT cl.*, s.name as school_name, s.slug as school_slug
             FROM crawl_logs cl
             LEFT JOIN schools s ON cl.school_id = s.id
             WHERE cl.crawl_status = $1
             ORDER BY cl.last_crawled DESC
             LIMIT $2 OFFSET $3`,
            [status, limit, offset]
        );

        return {
            logs: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        };
    }

    // Get stats
    static async getStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total_crawls,
                COUNT(*) FILTER (WHERE crawl_status = 'success') as successful,
                COUNT(*) FILTER (WHERE crawl_status = 'failure') as failed,
                COUNT(*) FILTER (WHERE crawl_status = 'partial') as partial,
                COUNT(*) FILTER (WHERE crawl_status = 'pending') as pending,
                AVG(confidence_score) FILTER (WHERE crawl_status = 'success') as avg_confidence,
                COUNT(DISTINCT school_id) as schools_crawled,
                MAX(last_crawled) as last_crawl_time
            FROM crawl_logs
        `);
        return result.rows[0];
    }

    // Update log status
    static async updateStatus(id, status, errorMessage = null) {
        const result = await query(
            `UPDATE crawl_logs SET 
                crawl_status = $1,
                error_message = $2,
                last_crawled = NOW()
             WHERE id = $3
             RETURNING *`,
            [status, errorMessage, id]
        );
        return result.rows[0] || null;
    }

    // Delete old logs (cleanup)
    static async deleteOldLogs(daysOld = 90) {
        const result = await query(
            `DELETE FROM crawl_logs 
             WHERE last_crawled < NOW() - INTERVAL '${daysOld} days'
             RETURNING id`
        );
        return result.rowCount;
    }
}

module.exports = CrawlLog;
