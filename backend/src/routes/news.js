/**
 * The daily news digest (migration 010).
 *
 * Public, published days only:
 *   GET /api/news/months?before=YYYY-MM&limit=3   archive by month, newest first
 *   GET /api/news/month/:ym                       one month's days (ym = YYYY-MM)
 *   GET /api/news/day/:date                       one day's stories (date = YYYY-MM-DD)
 *
 * Admin review (mounted separately at /api/admin/news):
 *   GET    /                         every day, draft or published
 *   GET    /:date                    one day with its stories
 *   PATCH  /:date                    edit the lead; publish or unpublish
 *   PATCH  /:date/items/:id          edit one story
 *   DELETE /:date/items/:id          drop one story; the rest are renumbered
 *   POST   /bulk                     { action: publish|unpublish|delete, days: [YYYY-MM-DD] }
 */
const express = require('express');
const { query, withTransaction } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { buildMatcher, statePath } = require('../utils/newsLinks');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const CATEGORIES = ['politics', 'economy', 'business', 'security', 'education', 'health',
    'world', 'sports', 'technology', 'entertainment', 'society', 'environment'];

// DATE columns come back from pg as JS Dates; send plain YYYY-MM-DD strings.
const ymd = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

const DAY_SUMMARY = `
    SELECT d.day, d.lead, COUNT(i.id)::int AS story_count,
           (ARRAY_AGG(i.headline ORDER BY i.rank))[1:3] AS headlines
    FROM news_days d JOIN news_items i ON i.day = d.day
    WHERE d.status = 'published'`;

const shapeDay = (r) => ({ day: ymd(r.day), lead: r.lead, story_count: r.story_count, headlines: r.headlines || [] });

function groupByMonth(rows) {
    const months = [];
    for (const r of rows) {
        const day = shapeDay(r);
        const key = day.day.slice(0, 7);
        if (!months.length || months[months.length - 1].month !== key) months.push({ month: key, days: [] });
        months[months.length - 1].days.push(day);
    }
    return months;
}

// Published records the stories can link to, rebuilt at most every ten minutes.
let matcherCache = { at: 0, find: null };
async function directoryMatcher() {
    if (matcherCache.find && Date.now() - matcherCache.at < 10 * 60 * 1000) return matcherCache.find;
    const r = await query(
        `SELECT name, slug, state, city, area, institution_category FROM schools
         WHERE verification_status IN ('verified')`
    );
    matcherCache = { at: Date.now(), find: buildMatcher(r.rows) };
    return matcherCache.find;
}

/** Add directory links: institutions a story mentions, and its state pages. */
async function withLinks(items) {
    let find = () => [];
    try { find = await directoryMatcher(); } catch { /* links are optional */ }
    return items.map((i) => ({
        ...i,
        links: find(`${i.headline} ${i.summary}`),
        state_links: (i.states || []).map((name) => ({ name, path: statePath(name) })),
    }));
}

const publicRouter = express.Router();

publicRouter.get('/months', async (req, res, next) => {
    try {
        const before = MONTH.test(req.query.before || '') ? `${req.query.before}-01` : null;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 12);
        const monthRows = await query(
            `SELECT DISTINCT DATE_TRUNC('month', day)::date AS m FROM news_days
             WHERE status = 'published' ${before ? 'AND day < $2::date' : ''}
             ORDER BY m DESC LIMIT $1`,
            before ? [limit + 1, before] : [limit + 1]
        );
        const wanted = monthRows.rows.slice(0, limit).map((r) => ymd(r.m));
        const nextMonth = monthRows.rows.length > limit ? wanted[wanted.length - 1].slice(0, 7) : null;
        if (!wanted.length) return res.json({ months: [], next: null });
        const oldest = wanted[wanted.length - 1];
        const days = await query(
            `${DAY_SUMMARY} AND d.day >= $1::date ${before ? 'AND d.day < $2::date' : ''}
             GROUP BY d.day ORDER BY d.day DESC`,
            before ? [oldest, before] : [oldest]
        );
        res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.json({ months: groupByMonth(days.rows), next: nextMonth });
    } catch (error) {
        next(error);
    }
});

publicRouter.get('/month/:ym', async (req, res, next) => {
    try {
        const { ym } = req.params;
        if (!MONTH.test(ym)) return res.status(400).json({ error: 'Month must be YYYY-MM' });
        const start = `${ym}-01`;
        const days = await query(
            `${DAY_SUMMARY} AND d.day >= $1::date AND d.day < ($1::date + INTERVAL '1 month')
             GROUP BY d.day ORDER BY d.day DESC`,
            [start]
        );
        if (!days.rows.length) return res.status(404).json({ error: 'No published days in this month' });
        const nav = await query(
            `SELECT
               (SELECT TO_CHAR(MAX(day), 'YYYY-MM') FROM news_days WHERE status = 'published' AND day < $1::date) AS older,
               (SELECT TO_CHAR(MIN(day), 'YYYY-MM') FROM news_days WHERE status = 'published'
                  AND day >= ($1::date + INTERVAL '1 month')) AS newer`,
            [start]
        );
        res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.json({ month: ym, days: days.rows.map(shapeDay), ...nav.rows[0] });
    } catch (error) {
        next(error);
    }
});

publicRouter.get('/day/:date', async (req, res, next) => {
    try {
        const { date } = req.params;
        if (!DATE.test(date)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        const day = await query(`SELECT day, lead, published_at FROM news_days WHERE day = $1 AND status = 'published'`, [date]);
        if (!day.rows.length) return res.status(404).json({ error: 'No published digest for this day' });
        const [items, nav] = await Promise.all([
            query(`SELECT rank, headline, summary, category, states, sources FROM news_items WHERE day = $1 ORDER BY rank`, [date]),
            query(
                `SELECT
                   (SELECT MAX(day) FROM news_days WHERE status = 'published' AND day < $1) AS older,
                   (SELECT MIN(day) FROM news_days WHERE status = 'published' AND day > $1) AS newer`,
                [date]
            ),
        ]);
        const n = nav.rows[0];
        res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        res.json({
            day: ymd(day.rows[0].day),
            lead: day.rows[0].lead,
            published_at: day.rows[0].published_at,
            items: await withLinks(items.rows),
            older: n.older ? ymd(n.older) : null,
            newer: n.newer ? ymd(n.newer) : null,
        });
    } catch (error) {
        next(error);
    }
});

const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/', async (req, res, next) => {
    try {
        const r = await query(
            `SELECT d.day, d.status, d.published_at, d.updated_at, COUNT(i.id)::int AS story_count
             FROM news_days d LEFT JOIN news_items i ON i.day = d.day
             GROUP BY d.day ORDER BY d.day DESC`
        );
        res.json({ days: r.rows.map((x) => ({ ...x, day: ymd(x.day) })) });
    } catch (error) {
        next(error);
    }
});

// Act on several days at once from the review list. Publishing skips days
// with no stories; deleting removes the days and their stories (cascade).
adminRouter.post('/bulk', async (req, res, next) => {
    try {
        const { action } = req.body || {};
        const days = Array.isArray(req.body?.days) ? [...new Set(req.body.days.map(String))] : [];
        if (!['publish', 'unpublish', 'delete'].includes(action)) {
            return res.status(400).json({ error: 'Action must be publish, unpublish or delete' });
        }
        if (!days.length || days.length > 400 || !days.every((d) => DATE.test(d))) {
            return res.status(400).json({ error: 'Send between 1 and 400 days as YYYY-MM-DD' });
        }
        let r;
        if (action === 'publish') {
            r = await query(
                `UPDATE news_days d SET status = 'published', published_at = COALESCE(d.published_at, NOW()),
                        reviewed_by = $2, updated_at = NOW()
                 WHERE d.day = ANY($1::date[]) AND d.status = 'draft'
                   AND EXISTS (SELECT 1 FROM news_items i WHERE i.day = d.day)
                 RETURNING d.day`,
                [days, req.user.id]
            );
        } else if (action === 'unpublish') {
            r = await query(
                `UPDATE news_days SET status = 'draft', updated_at = NOW()
                 WHERE day = ANY($1::date[]) AND status = 'published' RETURNING day`,
                [days]
            );
        } else {
            r = await query(`DELETE FROM news_days WHERE day = ANY($1::date[]) RETURNING day`, [days]);
        }
        const changed = r.rows.map((x) => ymd(x.day));
        res.json({ action, requested: days.length, changed: changed.length, days: changed });
    } catch (error) {
        next(error);
    }
});

adminRouter.get('/:date', async (req, res, next) => {
    try {
        const { date } = req.params;
        if (!DATE.test(date)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        const day = await query(`SELECT * FROM news_days WHERE day = $1`, [date]);
        if (!day.rows.length) return res.status(404).json({ error: 'No digest for this day' });
        const items = await query(`SELECT * FROM news_items WHERE day = $1 ORDER BY rank`, [date]);
        res.json({ day: { ...day.rows[0], day: ymd(day.rows[0].day) }, items: items.rows, categories: CATEGORIES });
    } catch (error) {
        next(error);
    }
});

adminRouter.patch('/:date', async (req, res, next) => {
    try {
        const { date } = req.params;
        if (!DATE.test(date)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        const { lead, status } = req.body || {};
        if (status !== undefined && !['draft', 'published'].includes(status)) {
            return res.status(400).json({ error: 'Status must be draft or published' });
        }
        const sets = [];
        const vals = [date];
        if (typeof lead === 'string') { vals.push(lead.trim() || null); sets.push(`lead = $${vals.length}`); }
        if (status === 'published') {
            const count = await query(`SELECT COUNT(*)::int AS n FROM news_items WHERE day = $1`, [date]);
            if (!count.rows[0].n) return res.status(400).json({ error: 'A day with no stories cannot be published' });
            vals.push(req.user.id);
            sets.push(`status = 'published'`, `published_at = COALESCE(published_at, NOW())`, `reviewed_by = $${vals.length}`);
        } else if (status === 'draft') {
            sets.push(`status = 'draft'`);
        }
        if (!sets.length) return res.status(400).json({ error: 'Nothing to change' });
        const r = await query(`UPDATE news_days SET ${sets.join(', ')}, updated_at = NOW() WHERE day = $1 RETURNING *`, vals);
        if (!r.rows.length) return res.status(404).json({ error: 'No digest for this day' });
        res.json({ day: { ...r.rows[0], day: ymd(r.rows[0].day) } });
    } catch (error) {
        next(error);
    }
});

adminRouter.patch('/:date/items/:id', async (req, res, next) => {
    try {
        const { date, id } = req.params;
        if (!DATE.test(date)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        const { headline, summary, category, states } = req.body || {};
        const sets = [];
        const vals = [date, id];
        const add = (sql, v) => { vals.push(v); sets.push(`${sql} = $${vals.length}`); };
        if (typeof headline === 'string' && headline.trim()) add('headline', headline.trim());
        if (typeof summary === 'string' && summary.trim()) add('summary', summary.trim());
        if (category !== undefined) {
            if (!CATEGORIES.includes(category)) return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });
            add('category', category);
        }
        if (Array.isArray(states)) add('states', states.map(String).map((s) => s.trim()).filter(Boolean));
        if (!sets.length) return res.status(400).json({ error: 'Nothing to change' });
        const r = await query(
            `UPDATE news_items SET ${sets.join(', ')}, updated_at = NOW() WHERE day = $1 AND id = $2 RETURNING *`,
            vals
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Story not found' });
        res.json({ item: r.rows[0] });
    } catch (error) {
        next(error);
    }
});

adminRouter.delete('/:date/items/:id', async (req, res, next) => {
    try {
        const { date, id } = req.params;
        if (!DATE.test(date)) return res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        const removed = await withTransaction(async (client) => {
            const del = await client.query(`DELETE FROM news_items WHERE day = $1 AND id = $2 RETURNING rank`, [date, id]);
            if (!del.rows.length) return false;
            // Close the gap so ranks stay 1..n. Rows move up one at a time,
            // lowest first, each into the slot just freed, so the UNIQUE
            // (day, rank) constraint never sees two rows on one rank.
            const below = await client.query(
                `SELECT id FROM news_items WHERE day = $1 AND rank > $2 ORDER BY rank`,
                [date, del.rows[0].rank]
            );
            for (const row of below.rows) {
                await client.query(`UPDATE news_items SET rank = rank - 1 WHERE id = $1`, [row.id]);
            }
            return true;
        });
        if (!removed) return res.status(404).json({ error: 'Story not found' });
        res.json({ deleted: true });
    } catch (error) {
        next(error);
    }
});

module.exports = { publicRouter, adminRouter, CATEGORIES };
