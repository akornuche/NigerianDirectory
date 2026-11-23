/**
 * Admin: directory records (verification queue and listing editor).
 *
 *   GET   /api/admin/records             list, filter by status/category/search
 *   GET   /api/admin/records/:id         one record with its revision history
 *   PATCH /api/admin/records/:id         edit facts, profile text and metadata
 *   POST  /api/admin/records/:id/verify  verify, reject or unpublish a record
 *
 * Every change is written to record_revisions (migration 009) in the same
 * transaction as the update, with who made it and the old and new values.
 */
const express = require('express');
const { query, withTransaction } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { clearCachePattern } = require('../config/redis');

const router = express.Router();
router.use(authenticate, requireAdmin);

// Fields the editor may change. Identity fields that form the URL (slug,
// state, city, area) are excluded: changing them needs a slug alias so old
// links redirect, which is done through a reviewed SQL fix instead.
const EDITABLE = {
    name: 'text', type: 'text', address: 'text', website: 'url', phone: 'text', email: 'text',
    established_year: 'year', gender: 'text', boarding: 'bool', day_school: 'bool',
    curriculum: 'text', levels: 'text',
    principal_name: 'text', principal_title: 'text', vc_name: 'text', vc_title: 'text',
    accreditation: 'text', year_chartered: 'year', postgraduate: 'bool', distance_learning: 'bool',
    enriched_history: 'text', enriched_academics: 'text', enriched_campus_info: 'text',
    enriched_student_life: 'text', meta_title: 'text', meta_description: 'text',
    content_sources: 'json', field_sources: 'json',
};
const GENDERS = ['co-ed', 'boys-only', 'girls-only'];
const STATUSES = ['verified', 'unverified', 'rejected'];
const CATEGORIES = ['school', 'university', 'hospital', 'polytechnic', 'college'];

function coerce(field, value) {
    const kind = EDITABLE[field];
    if (value === null || value === '') return null;
    switch (kind) {
        case 'bool':
            if (typeof value !== 'boolean') throw new Error(`${field} must be true or false`);
            return value;
        case 'year': {
            const y = Number(value);
            if (!Number.isInteger(y) || y < 1800 || y > new Date().getFullYear()) throw new Error(`${field} must be a year`);
            return y;
        }
        case 'url':
            if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(String(value))) throw new Error(`${field} must be a full http(s) URL`);
            return String(value).trim();
        case 'json':
            if (typeof value !== 'object') throw new Error(`${field} must be JSON`);
            return JSON.stringify(value);
        default: {
            const s = String(value).trim();
            if (field === 'gender' && !GENDERS.includes(s)) throw new Error(`gender must be one of ${GENDERS.join(', ')}`);
            if (field === 'meta_title' && s.length > 70) throw new Error('meta_title must be 70 characters or fewer');
            if (field === 'meta_description' && s.length > 170) throw new Error('meta_description must be 170 characters or fewer');
            return s;
        }
    }
}

function same(a, b) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function clearCaches() {
    try { await clearCachePattern('schools:*'); } catch { /* cache is optional */ }
}

// GET /api/admin/records
router.get('/', async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
        const where = [];
        const params = [];
        if (STATUSES.includes(req.query.status)) { params.push(req.query.status); where.push(`verification_status = $${params.length}`); }
        if (CATEGORIES.includes(req.query.category)) { params.push(req.query.category); where.push(`institution_category = $${params.length}`); }
        if (req.query.state) { params.push(req.query.state); where.push(`state = $${params.length}`); }
        if (req.query.q) { params.push(`%${String(req.query.q).slice(0, 100)}%`); where.push(`name ILIKE $${params.length}`); }
        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

        const [count, rows, summary] = await Promise.all([
            query(`SELECT COUNT(*) FROM schools ${clause}`, params),
            query(
                `SELECT id, name, slug, institution_category, type, state, city, area, website,
                        verification_status, verification_source_name, verification_source_url,
                        verification_notes, data_verified_at, updated_at,
                        (COALESCE(array_length(regexp_split_to_array(trim(COALESCE(enriched_history,'') || ' ' ||
                          COALESCE(enriched_academics,'') || ' ' || COALESCE(enriched_campus_info,'') || ' ' ||
                          COALESCE(enriched_student_life,'')), '\\s+'), 1), 0)) AS words
                   FROM schools ${clause}
                  ORDER BY name
                  LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
                params
            ),
            query(`SELECT institution_category, verification_status, COUNT(*)::int AS n
                     FROM schools GROUP BY 1, 2`),
        ]);
        const total = parseInt(count.rows[0].count);
        res.json({
            records: rows.rows,
            summary: summary.rows,
            pagination: { page, limit, totalCount: total, totalPages: Math.max(1, Math.ceil(total / limit)) },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/records/:id
router.get('/:id(\\d+)', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const [rec, revisions, reports] = await Promise.all([
            query('SELECT * FROM schools WHERE id = $1', [id]),
            query(`SELECT r.id, r.action, r.changes, r.note, r.created_at, u.name AS user_name
                     FROM record_revisions r LEFT JOIN users u ON u.id = r.user_id
                    WHERE r.school_id = $1 ORDER BY r.created_at DESC LIMIT 50`, [id]),
            query(`SELECT id, name, email, subject, message, submission_type, status, created_at
                     FROM contact_submissions WHERE school_id = $1 ORDER BY created_at DESC LIMIT 20`, [id])
                .catch(() => ({ rows: [] })),
        ]);
        if (!rec.rows[0]) return res.status(404).json({ error: 'Record not found' });
        res.json({ record: rec.rows[0], revisions: revisions.rows, reports: reports.rows });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/admin/records/:id   body: { updates: {...}, note?: string }
router.patch('/:id(\\d+)', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body?.updates;
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            return res.status(400).json({ error: 'updates object is required' });
        }
        const unknown = Object.keys(updates).filter((k) => !(k in EDITABLE));
        if (unknown.length) return res.status(400).json({ error: `Fields not editable here: ${unknown.join(', ')}` });

        let values;
        try {
            values = Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, coerce(k, v)]));
        } catch (e) {
            return res.status(422).json({ error: e.message });
        }

        const result = await withTransaction(async (client) => {
            const cur = (await client.query('SELECT * FROM schools WHERE id = $1 FOR UPDATE', [id])).rows[0];
            if (!cur) return null;
            const changes = {};
            for (const [k, v] of Object.entries(values)) {
                const before = EDITABLE[k] === 'json' ? cur[k] : cur[k] ?? null;
                const after = EDITABLE[k] === 'json' && v !== null ? JSON.parse(v) : v;
                if (!same(before, after)) changes[k] = { from: before, to: after };
            }
            if (!Object.keys(changes).length) return { record: cur, changed: [] };

            const fields = Object.keys(changes);
            const set = fields.map((f, i) => `${f} = $${i + 2}${EDITABLE[f] === 'json' ? '::jsonb' : ''}`);
            const updated = (await client.query(
                `UPDATE schools SET ${set.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
                [id, ...fields.map((f) => values[f])]
            )).rows[0];
            await client.query(
                `INSERT INTO record_revisions (school_id, user_id, action, changes, note) VALUES ($1, $2, 'edit', $3, $4)`,
                [id, req.user.id, JSON.stringify(changes), req.body.note ? String(req.body.note).slice(0, 1000) : null]
            );
            return { record: updated, changed: fields };
        });
        if (!result) return res.status(404).json({ error: 'Record not found' });
        await clearCaches();
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/records/:id/verify
//   body: { status: 'verified'|'rejected'|'unverified', source_name?, source_url?, note? }
// Verifying requires the URL of the independent source that confirms the
// record; rejecting requires a reason.
router.post('/:id(\\d+)/verify', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { status, source_name, source_url, note } = req.body || {};
        if (!STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
        if (status === 'verified' && !/^https?:\/\/\S+\.\S+/i.test(source_url || '')) {
            return res.status(422).json({ error: 'A source URL that confirms the record is required to verify it' });
        }
        if (status === 'rejected' && !String(note || '').trim()) {
            return res.status(422).json({ error: 'A reason is required to reject a record' });
        }

        const result = await withTransaction(async (client) => {
            const cur = (await client.query('SELECT * FROM schools WHERE id = $1 FOR UPDATE', [id])).rows[0];
            if (!cur) return null;
            const verified = status === 'verified';
            const updated = (await client.query(
                `UPDATE schools SET verification_status = $2,
                        verification_source_name = $3, verification_source_url = $4,
                        verification_notes = $5,
                        data_verified_at = CASE WHEN $2 = 'verified' THEN NOW() ELSE data_verified_at END,
                        updated_at = NOW()
                  WHERE id = $1 RETURNING *`,
                [id, status, verified ? (source_name || null) : cur.verification_source_name,
                 verified ? source_url : cur.verification_source_url,
                 note ? String(note).slice(0, 1000) : cur.verification_notes]
            )).rows[0];
            const action = { verified: 'verify', rejected: 'reject', unverified: 'unverify' }[status];
            await client.query(
                `INSERT INTO record_revisions (school_id, user_id, action, changes, note) VALUES ($1, $2, $3, $4, $5)`,
                [id, req.user.id, action,
                 JSON.stringify({ verification_status: { from: cur.verification_status, to: status },
                                  ...(verified ? { verification_source_url: { from: cur.verification_source_url, to: source_url } } : {}) }),
                 note ? String(note).slice(0, 1000) : null]
            );
            return updated;
        });
        if (!result) return res.status(404).json({ error: 'Record not found' });
        await clearCaches();
        res.json({ record: result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
module.exports.EDITABLE = EDITABLE;
