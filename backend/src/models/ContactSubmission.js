const { query } = require('../config/database');

class ContactSubmission {
    static async create(data) {
        const {
            name, email, phone, subject, message,
            submission_type = 'contact',
            school_id, school_name,
            requester_role, organisation_name, verification_notes,
            ip_address, user_agent
        } = data;

        const result = await query(
            `INSERT INTO contact_submissions (
                name, email, phone, subject, message,
                submission_type, school_id, school_name,
                requester_role, organisation_name, verification_notes,
                ip_address, user_agent
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *`,
            [
                name, email, phone || null, subject, message,
                submission_type, school_id || null, school_name || null,
                requester_role || null, organisation_name || null, verification_notes || null,
                ip_address || null, user_agent || null
            ]
        );
        return result.rows[0];
    }

    static async getAll({ page = 1, limit = 30, status, submission_type } = {}) {
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
        if (submission_type) { conditions.push(`submission_type = $${idx++}`); params.push(submission_type); }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const [countRes, rowsRes] = await Promise.all([
            query(`SELECT COUNT(*) FROM contact_submissions ${where}`, params),
            query(
                `SELECT cs.*, s.slug as school_slug
                 FROM contact_submissions cs
                 LEFT JOIN schools s ON cs.school_id = s.id
                 ${where}
                 ORDER BY cs.created_at DESC
                 LIMIT $${idx} OFFSET $${idx + 1}`,
                [...params, limit, offset]
            )
        ]);

        return {
            submissions: rowsRes.rows,
            pagination: {
                page, limit,
                totalCount: parseInt(countRes.rows[0].count),
                totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
            }
        };
    }

    static async findById(id) {
        const result = await query(
            `SELECT cs.*, s.slug as school_slug, s.name as school_name_from_db
             FROM contact_submissions cs
             LEFT JOIN schools s ON cs.school_id = s.id
             WHERE cs.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    static async updateStatus(id, status, adminId = null, adminNotes = null) {
        const result = await query(
            `UPDATE contact_submissions
             SET status = $1,
                 admin_notes = COALESCE($2, admin_notes),
                 replied_by  = CASE WHEN $1 = 'replied' THEN $3 ELSE replied_by END,
                 replied_at  = CASE WHEN $1 = 'replied' THEN NOW() ELSE replied_at END
             WHERE id = $4
             RETURNING *`,
            [status, adminNotes, adminId, id]
        );
        return result.rows[0] || null;
    }

    static async getStats() {
        const result = await query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'new')      as new_count,
                COUNT(*) FILTER (WHERE status = 'read')     as read_count,
                COUNT(*) FILTER (WHERE status = 'replied')  as replied_count,
                COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
                COUNT(*) FILTER (WHERE submission_type = 'contact')         as contact_count,
                COUNT(*) FILTER (WHERE submission_type = 'school_ownership') as ownership_count,
                COUNT(*) FILTER (WHERE submission_type = 'report_error')     as report_count,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days
            FROM contact_submissions
        `);
        return result.rows[0];
    }
}

module.exports = ContactSubmission;
