const express = require('express');
const router = express.Router();
const ContactSubmission = require('../models/ContactSubmission');
const emailService = require('../services/emailService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limit: 5 submissions per hour per IP
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Too many submissions. Please try again later.' }
});

const contactValidation = [
    body('name').trim().notEmpty().isLength({ max: 120 }).withMessage('Name is required (max 120 chars)'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
    body('subject').trim().notEmpty().isLength({ max: 200 }).withMessage('Subject is required'),
    body('message').trim().notEmpty().isLength({ min: 10, max: 5000 }).withMessage('Message must be 10–5000 characters'),
    body('submission_type').optional().isIn(['contact', 'school_ownership', 'report_error', 'advertise', 'other']),
    body('school_id').optional({ checkFalsy: true }).isInt(),
    body('school_name').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
    body('requester_role').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body('organisation_name').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
    body('verification_notes').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
];

// ============================================
// POST /api/contact — Public submission
// ============================================
router.post('/', contactLimiter, contactValidation, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        const userAgent = req.headers['user-agent'] || '';

        const submission = await ContactSubmission.create({
            ...req.body,
            ip_address: ip,
            user_agent: userAgent
        });

        res.status(201).json({
            message: 'Your message has been received. We will get back to you shortly.',
            id: submission.uuid
        });

        // Fire-and-forget admin notification
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@nigeriandirectory.com';
        const typeLabel = {
            contact: 'General Enquiry',
            school_ownership: 'School Ownership Request',
            report_error: 'Error Report',
            advertise: 'Advertising Enquiry',
            other: 'Other'
        }[submission.submission_type] || 'Contact';

        emailService.sendEmail?.({
            to: adminEmail,
            subject: `[NigerianDirectory] New ${typeLabel}: ${submission.subject}`,
            html: `
                <h2>New ${typeLabel}</h2>
                <p><strong>From:</strong> ${submission.name} &lt;${submission.email}&gt;</p>
                ${submission.phone ? `<p><strong>Phone:</strong> ${submission.phone}</p>` : ''}
                ${submission.school_name ? `<p><strong>School:</strong> ${submission.school_name}</p>` : ''}
                ${submission.requester_role ? `<p><strong>Role:</strong> ${submission.requester_role}</p>` : ''}
                ${submission.organisation_name ? `<p><strong>Organisation:</strong> ${submission.organisation_name}</p>` : ''}
                <p><strong>Subject:</strong> ${submission.subject}</p>
                <p><strong>Message:</strong></p>
                <p>${submission.message.replace(/\n/g, '<br>')}</p>
                ${submission.verification_notes ? `<p><strong>Additional notes:</strong> ${submission.verification_notes}</p>` : ''}
                <hr>
                <p><small>Submitted: ${new Date().toLocaleString('en-NG')} | IP: ${ip}</small></p>
            `
        }).catch(err => console.error('Failed to send contact notification:', err?.message));

    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/contact — Admin: list all submissions
// ============================================
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const { status, submission_type } = req.query;

        const result = await ContactSubmission.getAll({ page, limit, status, submission_type });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/contact/stats — Admin: submission stats
// ============================================
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const stats = await ContactSubmission.getStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/contact/:id — Admin: single submission
// ============================================
router.get('/:id', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const submission = await ContactSubmission.findById(req.params.id);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });
        
        // Mark as read automatically
        if (submission.status === 'new') {
            await ContactSubmission.updateStatus(submission.id, 'read');
            submission.status = 'read';
        }
        res.json(submission);
    } catch (error) {
        next(error);
    }
});

// ============================================
// PATCH /api/contact/:id/status — Admin: update status
// ============================================
router.patch('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { status, admin_notes } = req.body;
        const validStatuses = ['new', 'read', 'replied', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const updated = await ContactSubmission.updateStatus(
            req.params.id, status, req.user.id, admin_notes
        );
        if (!updated) return res.status(404).json({ error: 'Submission not found' });
        res.json(updated);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
