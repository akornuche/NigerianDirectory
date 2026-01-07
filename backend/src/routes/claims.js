const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const School = require('../models/School');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { claimCreateValidation, claimStatusValidation, paginationValidation } = require('../middleware/validators');

// ============================================
// GET /api/claims - Get user's claims
// ============================================
router.get('/', authenticate, paginationValidation, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await Claim.getByUser(req.user.id, page, limit);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/claims/pending - Get pending claims (admin)
// ============================================
router.get('/pending', authenticate, requireAdmin, paginationValidation, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await Claim.getPending(page, limit);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/claims/stats - Get claims statistics (admin)
// ============================================
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const stats = await Claim.getStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/claims/:id - Get claim details
// ============================================
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const claim = await Claim.findById(id);

        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        // Only allow access to own claims (unless admin)
        if (req.user.role !== 'admin' && claim.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(claim);
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/claims - Create a new claim
// ============================================
router.post('/', authenticate, claimCreateValidation, async (req, res, next) => {
    try {
        const { school_id, verification_method, verification_documents, verification_notes } = req.body;

        // Check if school exists
        const school = await School.findById(school_id);
        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }

        // Check if school is already claimed
        if (school.claimed) {
            return res.status(400).json({ error: 'This school has already been claimed' });
        }

        // Create claim
        const claim = await Claim.create({
            school_id,
            user_id: req.user.id,
            verification_method,
            verification_documents,
            verification_notes
        });

        res.status(201).json({
            message: 'Claim submitted successfully. Our team will review your request.',
            claim
        });
    } catch (error) {
        if (error.message === 'This school already has an active claim') {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
});

// ============================================
// PATCH /api/claims/:id/status - Update claim status (admin)
// ============================================
router.patch('/:id/status', authenticate, requireAdmin, claimStatusValidation, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        const claim = await Claim.findById(id);
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        // Require rejection reason if rejecting
        if (status === 'rejected' && !rejection_reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const updatedClaim = await Claim.updateStatus(id, status, req.user.id, rejection_reason);

        res.json({
            message: `Claim ${status}`,
            claim: updatedClaim
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PATCH /api/claims/:id/payment - Update payment status
// ============================================
router.patch('/:id/payment', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { payment_status, payment_amount, payment_reference, payment_provider } = req.body;

        const claim = await Claim.findById(id);
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        // Only allow own claims (unless admin)
        if (req.user.role !== 'admin' && claim.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updatedClaim = await Claim.updatePayment(id, {
            payment_status,
            payment_amount,
            payment_reference,
            payment_provider
        });

        res.json({
            message: 'Payment status updated',
            claim: updatedClaim
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// DELETE /api/claims/:id - Cancel/delete claim
// ============================================
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;

        const claim = await Claim.findById(id);
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        // Only allow own claims or admin
        if (req.user.role !== 'admin' && claim.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Can only delete pending claims
        if (claim.status !== 'pending' && req.user.role !== 'admin') {
            return res.status(400).json({ error: 'Can only cancel pending claims' });
        }

        await Claim.delete(id);

        res.json({ message: 'Claim cancelled successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
