const { query } = require('../config/database');

class PageView {
    /**
     * Record a page view
     */
    static async record({ school_id, page_type, ip_hash, user_agent, referrer }) {
        const result = await query(
            `INSERT INTO page_views (school_id, page_type, ip_hash, user_agent, referrer)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [school_id, page_type || 'listing', ip_hash, user_agent, referrer]
        );
        return result.rows[0];
    }

    /**
     * Get view count for a school
     */
    static async getBySchool(schoolId, days = 30) {
        const result = await query(
            `SELECT
                 COUNT(*) as total_views,
                 COUNT(*) FILTER (WHERE page_type = 'listing') as listing_views,
                 COUNT(*) FILTER (WHERE page_type = 'blog') as blog_views,
                 COUNT(DISTINCT ip_hash) as unique_visitors
             FROM page_views
             WHERE school_id = $1
               AND viewed_at >= NOW() - INTERVAL '${days} days'`,
            [schoolId]
        );
        return result.rows[0];
    }

    /**
     * Get daily view counts for a school (for charts)
     */
    static async getDailyViews(schoolId, days = 30) {
        const result = await query(
            `SELECT
                 DATE(viewed_at) as date,
                 COUNT(*) as views,
                 COUNT(DISTINCT ip_hash) as unique_visitors
             FROM page_views
             WHERE school_id = $1
               AND viewed_at >= NOW() - INTERVAL '${days} days'
             GROUP BY DATE(viewed_at)
             ORDER BY date DESC`,
            [schoolId]
        );
        return result.rows;
    }

    /**
     * Get top viewed schools
     */
    static async getTopPages(limit = 20, days = 30) {
        const result = await query(
            `SELECT
                 pv.school_id,
                 s.name as school_name,
                 s.slug as school_slug,
                 s.state,
                 s.area,
                 COUNT(*) as total_views,
                 COUNT(DISTINCT pv.ip_hash) as unique_visitors
             FROM page_views pv
             JOIN schools s ON pv.school_id = s.id
             WHERE pv.viewed_at >= NOW() - INTERVAL '${days} days'
             GROUP BY pv.school_id, s.name, s.slug, s.state, s.area
             ORDER BY total_views DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    /**
     * Get top referrers
     */
    static async getTopReferrers(limit = 20, days = 30) {
        const result = await query(
            `SELECT
                 referrer,
                 COUNT(*) as count
             FROM page_views
             WHERE referrer IS NOT NULL
               AND referrer != ''
               AND viewed_at >= NOW() - INTERVAL '${days} days'
             GROUP BY referrer
             ORDER BY count DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    }

    /**
     * Get overall stats
     */
    static async getStats(days = 30) {
        const result = await query(`
            SELECT
                COUNT(*) as total_views,
                COUNT(DISTINCT ip_hash) as unique_visitors,
                COUNT(DISTINCT school_id) as schools_viewed,
                COUNT(*) FILTER (WHERE page_type = 'listing') as listing_views,
                COUNT(*) FILTER (WHERE page_type = 'blog') as blog_views,
                COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '1 day') as views_today,
                COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '7 days') as views_this_week
            FROM page_views
            WHERE viewed_at >= NOW() - INTERVAL '${days} days'
        `);
        return result.rows[0];
    }

    /**
     * Delete old page views (cleanup)
     */
    static async cleanup(daysOld = 90) {
        const result = await query(
            `DELETE FROM page_views
             WHERE viewed_at < NOW() - INTERVAL '${daysOld} days'
             RETURNING id`
        );
        return result.rowCount;
    }
}

module.exports = PageView;
