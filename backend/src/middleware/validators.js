const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
}

// ============================================
// AUTH VALIDATORS
// ============================================
const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    handleValidation
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
    handleValidation
];

// ============================================
// SCHOOL VALIDATORS
// ============================================
const schoolListValidation = [
    query('state').optional().trim(),
    query('city').optional().trim(),
    query('area').optional().trim(),
    query('type').optional().isIn(['private', 'public', 'international', 'federal', 'state', 'mission', 'community']),
    query('curriculum').optional().trim(),
    query('gender').optional().isIn(['co-ed', 'boys-only', 'girls-only']),
    query('boarding').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['name', 'created_at', 'updated_at', 'established_year']),
    query('sortOrder').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
    handleValidation
];

const schoolSlugValidation = [
    param('slug')
        .trim()
        .notEmpty().withMessage('School slug is required'),
    handleValidation
];

const schoolCreateValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('School name is required')
        .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
    body('type')
        .optional()
        .isIn(['private', 'public', 'international', 'federal', 'state', 'mission', 'community']),
    body('state')
        .trim()
        .notEmpty().withMessage('State is required'),
    body('city')
        .optional()
        .trim(),
    body('area')
        .optional()
        .trim(),
    body('address')
        .optional()
        .trim(),
    body('latitude')
        .optional()
        .isDecimal().withMessage('Invalid latitude'),
    body('longitude')
        .optional()
        .isDecimal().withMessage('Invalid longitude'),
    body('curriculum')
        .optional()
        .trim(),
    body('levels')
        .optional()
        .trim(),
    body('boarding')
        .optional()
        .isBoolean(),
    body('gender')
        .optional()
        .isIn(['co-ed', 'boys-only', 'girls-only']),
    body('phone')
        .optional()
        .trim(),
    body('email')
        .optional()
        .isEmail().withMessage('Invalid email'),
    body('website')
        .optional()
        .isURL().withMessage('Invalid website URL'),
    handleValidation
];

const schoolUpdateValidation = [
    param('id')
        .isInt().withMessage('Invalid school ID'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
    body('type')
        .optional()
        .isIn(['private', 'public', 'international', 'federal', 'state', 'mission', 'community']),
    body('address')
        .optional()
        .trim(),
    body('latitude')
        .optional()
        .isDecimal().withMessage('Invalid latitude'),
    body('longitude')
        .optional()
        .isDecimal().withMessage('Invalid longitude'),
    body('curriculum')
        .optional()
        .trim(),
    body('levels')
        .optional()
        .trim(),
    body('boarding')
        .optional()
        .isBoolean(),
    body('gender')
        .optional()
        .isIn(['co-ed', 'boys-only', 'girls-only']),
    body('phone')
        .optional()
        .trim(),
    body('email')
        .optional()
        .isEmail().withMessage('Invalid email'),
    body('website')
        .optional()
        .isURL().withMessage('Invalid website URL'),
    handleValidation
];

// ============================================
// CLAIM VALIDATORS
// ============================================
const claimCreateValidation = [
    body('school_id')
        .notEmpty().withMessage('School ID is required')
        .isInt().withMessage('Invalid school ID'),
    body('verification_method')
        .notEmpty().withMessage('Verification method is required')
        .isIn(['email', 'phone', 'document', 'visit']),
    body('verification_notes')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Notes too long'),
    handleValidation
];

const claimStatusValidation = [
    param('id')
        .isInt().withMessage('Invalid claim ID'),
    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['pending', 'under_review', 'approved', 'rejected']),
    body('rejection_reason')
        .optional()
        .trim(),
    handleValidation
];

// ============================================
// LOCATION VALIDATORS
// ============================================
const locationStateValidation = [
    param('state')
        .trim()
        .notEmpty().withMessage('State is required'),
    handleValidation
];

const locationCityValidation = [
    param('state')
        .trim()
        .notEmpty().withMessage('State is required'),
    param('city')
        .trim()
        .notEmpty().withMessage('City is required'),
    handleValidation
];

// ============================================
// PAGINATION VALIDATOR
// ============================================
const paginationValidation = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidation
];

module.exports = {
    handleValidation,
    registerValidation,
    loginValidation,
    schoolListValidation,
    schoolSlugValidation,
    schoolCreateValidation,
    schoolUpdateValidation,
    claimCreateValidation,
    claimStatusValidation,
    locationStateValidation,
    locationCityValidation,
    paginationValidation
};
