/**
 * Scheduled jobs, called by Vercel Cron (see vercel.json "crons").
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET
 * environment variable is set on the project; requests without it are
 * refused, so the endpoint cannot be used to send mail by anyone else.
 *
 *   GET /api/cron/daily-digest  emails ADMIN_EMAIL a summary of the last
 *                               24 hours: new form submissions, pending
 *                               claims and the verification queue size.
 *                               Nothing is sent when there is nothing new.
 */
const express = require('express');
const crypto = require('crypto');
const { query } = require('../config/database');
const emailService = require('../services/emailService');

const router = express.Router();

function authorised(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const given = Buffer.from(req.get('authorization') || '');
    const want = Buffer.from(`Bearer ${secret}`);
    return given.length === want.length && crypto.timingSafeEqual(given, want);
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

router.get('/daily-digest', async (req, res, next) => {
    if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const to = process.env.ADMIN_EMAIL;
        if (!to) return res.json({ sent: false, reason: 'ADMIN_EMAIL not set' });

        const [subs, claims, queue] = await Promise.all([
            query(`SELECT submission_type, name, email, subject, school_name, created_at
                     FROM contact_submissions WHERE created_at > NOW() - INTERVAL '24 hours'
                    ORDER BY created_at DESC LIMIT 50`),
            query(`SELECT COUNT(*)::int AS n FROM claims WHERE status IN ('pending', 'under_review')`).catch(() => ({ rows: [{ n: 0 }] })),
            query(`SELECT institution_category, COUNT(*)::int AS n FROM schools
                    WHERE verification_status = 'unverified' GROUP BY 1`),
        ]);
        const pendingClaims = claims.rows[0].n;
        if (!subs.rows.length && !pendingClaims) return res.json({ sent: false, reason: 'nothing new' });

        const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng').replace(/\/$/, '');
        const rows = subs.rows.map((s) => `<tr><td>${esc(s.submission_type)}</td><td>${esc(s.name)} &lt;${esc(s.email)}&gt;</td><td>${esc(s.subject)}${s.school_name ? ` (${esc(s.school_name)})` : ''}</td></tr>`).join('');
        const queueText = queue.rows.map((q) => `${q.n} ${esc(q.institution_category)}`).join(', ') || 'none';
        const html = `<h2>NigerianDirectory: last 24 hours</h2>
<p><strong>${subs.rows.length}</strong> new form submission(s). <strong>${pendingClaims}</strong> ownership claim(s) awaiting review.</p>
${rows ? `<table cellpadding="6" border="1" style="border-collapse:collapse"><tr><th>Type</th><th>From</th><th>Subject</th></tr>${rows}</table>` : ''}
<p>Verification queue: ${queueText} record(s) unverified.</p>
<p><a href="${site}/admin/submissions">Open submissions</a> &middot; <a href="${site}/admin/schools?status=unverified">Open verification queue</a></p>`;

        await emailService.send({ to, subject: `NigerianDirectory daily summary: ${subs.rows.length} new submission(s)`, html });
        res.json({ sent: true, submissions: subs.rows.length, pendingClaims });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
