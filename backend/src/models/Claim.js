const { query } = require('../config/database');

class Claim {
    // Create a new claim
    static async create(claimData) {
        const {
            school_id, user_id, verification_method,
            verification_documents, verification_notes
        } = claimData;

        // Check if school already has an active claim
        const existingClaim = await query(
            `SELECT id FROM claims 
             WHERE school_id = $1 AND status IN ('pending', 'under_review', 'approved')`,
            [school_id]
        );

        if (existingClaim.rows.length > 0) {
            throw new Error('This school already has an active claim');
        }

        const result = await query(
            `INSERT INTO claims (
                school_id, user_id, verification_method,
                verification_documents, verification_notes, status,
                expires_at
            ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW() + INTERVAL '30 days')
             RETURNING *`,
            [
                school_id, user_id, verification_method,
                JSON.stringify(verification_documents || []),
                verification_notes
            ]
        );

        return result.rows[0];
    }

    // Find by ID
    static async findById(id) {
        const result = await query(
            `SELECT c.*, s.name as school_name, s.slug as school_slug,
                    u.name as user_name, u.email as user_email
             FROM claims c
             JOIN schools s ON c.school_id = s.id
             JOIN users u ON c.user_id = u.id
             WHERE c.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    // Find by UUID
    static async findByUuid(uuid) {
        const result = await query(
            `SELECT c.*, s.name as school_name, s.slug as school_slug,
                    u.name as user_name, u.email as user_email
             FROM claims c
             JOIN schools s ON c.school_id = s.id
             JOIN users u ON c.user_id = u.id
             WHERE c.uuid = $1`,
            [uuid]
        );
        return result.rows[0] || null;
    }

    // Get claims by user
    static async getByUser(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const countResult = await query(
            'SELECT COUNT(*) FROM claims WHERE user_id = $1',
            [userId]
        );
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT c.*, s.name as school_name, s.slug as school_slug
             FROM claims c
             JOIN schools s ON c.school_id = s.id
             WHERE c.user_id = $1
             ORDER BY c.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        return {
            claims: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        };
    }

    // Get claims by school
    static async getBySchool(schoolId) {
        const result = await query(
            `SELECT c.*, u.name as user_name, u.email as user_email
             FROM claims c
             JOIN users u ON c.user_id = u.id
             WHERE c.school_id = $1
             ORDER BY c.created_at DESC`,
            [schoolId]
        );
        return result.rows;
    }

    // Get pending claims (admin)
    static async getPending(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const countResult = await query(
            `SELECT COUNT(*) FROM claims WHERE status IN ('pending', 'under_review')`
        );
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT c.*, s.name as school_name, s.slug as school_slug,
                    s.state, s.area, u.name as user_name, u.email as user_email
             FROM claims c
             JOIN schools s ON c.school_id = s.id
             JOIN users u ON c.user_id = u.id
             WHERE c.status IN ('pending', 'under_review')
             ORDER BY c.created_at ASC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return {
            claims: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        };
    }

    // Update claim status
    static async updateStatus(id, status, adminId, rejectionReason = null) {
        const result = await query(
            `UPDATE claims SET 
                status = $1,
                verified = $2,
                verified_by = $3,
                verified_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE verified_at END,
                rejection_reason = $4
             WHERE id = $5
             RETURNING *`,
            [
                status,
                status === 'approved',
                status === 'approved' || status === 'rejected' ? adminId : null,
                rejectionReason,
                id
            ]
        );

        // If approved, update the school
        if (status === 'approved' && result.rows[0]) {
            const claim = result.rows[0];
            await query(
                `UPDATE schools SET 
                    claimed = true,
                    verified = true,
                    claimed_by_user_id = $1,
                    claimed_at = NOW(),
                    verified_at = NOW()
                 WHERE id = $2`,
                [claim.user_id, claim.school_id]
            );
        }

        return result.rows[0] || null;
    }

    // Update payment status
    static async updatePayment(id, paymentData) {
        const { payment_status, payment_amount, payment_reference, payment_provider } = paymentData;

        const result = await query(
            `UPDATE claims SET 
                payment_status = $1,
                payment_amount = $2,
                payment_reference = $3,
                payment_provider = $4,
                paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END
             WHERE id = $5
             RETURNING *`,
            [payment_status, payment_amount, payment_reference, payment_provider, id]
        );

        return result.rows[0] || null;
    }

    // Get stats
    static async getStats() {
        const result = await query(`
            SELECT 
                COUNT(*) as total_claims,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_claims,
                COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_claims,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_claims,
                COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_claims
            FROM claims
        `);
        return result.rows[0];
    }

    // Delete claim
    static async delete(id) {
        const result = await query(
            'DELETE FROM claims WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0] || null;
    }
}

module.exports = Claim;
