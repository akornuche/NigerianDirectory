const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Create a new user
    static async create(userData) {
        const { name, email, password, role } = userData;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, uuid, name, email, role, email_verified, created_at`,
            [name, email, password_hash, role || 'user']
        );

        return result.rows[0];
    }

    // Find by email
    static async findByEmail(email) {
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    // Find by ID
    static async findById(id) {
        const result = await query(
            'SELECT id, uuid, name, email, role, email_verified, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    // Find by UUID
    static async findByUuid(uuid) {
        const result = await query(
            'SELECT id, uuid, name, email, role, email_verified, created_at, updated_at FROM users WHERE uuid = $1',
            [uuid]
        );
        return result.rows[0] || null;
    }

    // Verify password
    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    // Update user
    static async update(id, updates) {
        const allowedFields = ['name', 'email', 'role', 'email_verified'];
        const setClause = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        }

        if (setClause.length === 0) {
            return null;
        }

        params.push(id);
        const result = await query(
            `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramIndex} 
             RETURNING id, uuid, name, email, role, email_verified, created_at, updated_at`,
            params
        );

        return result.rows[0] || null;
    }

    // Update password
    static async updatePassword(id, newPassword) {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        const result = await query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
            [password_hash, id]
        );

        return result.rows[0] || null;
    }

    // Get all users (admin)
    static async getAll(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const countResult = await query('SELECT COUNT(*) FROM users');
        const totalCount = parseInt(countResult.rows[0].count);

        const result = await query(
            `SELECT id, uuid, name, email, role, email_verified, created_at
             FROM users 
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return {
            users: result.rows,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        };
    }

    // Delete user
    static async delete(id) {
        const result = await query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0] || null;
    }

    // Get user's claimed schools
    static async getClaimedSchools(userId) {
        const result = await query(
            `SELECT s.* FROM schools s
             WHERE s.claimed_by_user_id = $1
             ORDER BY s.claimed_at DESC`,
            [userId]
        );
        return result.rows;
    }
}

module.exports = User;
