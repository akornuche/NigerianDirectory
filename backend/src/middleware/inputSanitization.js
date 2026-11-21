/**
 * Input Sanitization & Validation Middleware
 * 
 * Prevents:
 * - XSS attacks via input sanitization
 * - SQL injection (via parameterized queries - already used)
 * - Command injection
 * - NoSQL injection
 * - Request smuggling
 */

const validator = require('validator');

/**
 * Sanitize and validate string input
 */
function sanitizeString(input, maxLength = 500) {
    if (typeof input !== 'string') {
        return '';
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Enforce max length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    // Escape HTML entities (prevent XSS)
    sanitized = validator.escape(sanitized);

    return sanitized;
}

/**
 * Sanitize email
 */
function sanitizeEmail(input) {
    if (typeof input !== 'string') {
        return '';
    }

    const trimmed = input.trim().toLowerCase();

    // Validate email format
    if (!validator.isEmail(trimmed)) {
        return '';
    }

    // Escape and normalize
    return validator.normalizeEmail(trimmed);
}

/**
 * Sanitize URL
 */
function sanitizeUrl(input) {
    if (typeof input !== 'string') {
        return '';
    }

    const trimmed = input.trim();

    // Validate URL format
    if (!validator.isURL(trimmed, {
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true
    })) {
        return '';
    }

    return trimmed;
}

/**
 * Sanitize number
 */
function sanitizeNumber(input) {
    const num = parseInt(input, 10);
    return isNaN(num) ? 0 : num;
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj, maxDepth = 5, currentDepth = 0) {
    if (currentDepth > maxDepth) {
        return {};
    }

    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Prevent prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }

            const value = obj[key];

            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'number') {
                sanitized[key] = sanitizeNumber(value);
            } else if (typeof value === 'boolean') {
                sanitized[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
            }
        }
    }

    return sanitized;
}

/**
 * Middleware to sanitize request body, query, and params
 */
function sanitizationMiddleware(req, res, next) {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }

    next();
}

/**
 * Middleware to prevent request smuggling
 */
function preventRequestSmuggling(req, res, next) {
    // If Transfer-Encoding header is present (especially chunked), be cautious
    if (req.get('transfer-encoding')?.toLowerCase() === 'chunked' && process.env.NODE_ENV === 'production') {
        return res.status(400).json({ error: 'Unsupported request format' });
    }

    next();
}

/**
 * Validate specific field types
 */
const fieldValidators = {
    email: (value) => {
        const sanitized = sanitizeEmail(value);
        return sanitized.length > 0 ? sanitized : null;
    },

    password: (value) => {
        if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
            return null;
        }
        return sanitizeString(value, 128);
    },

    username: (value) => {
        if (typeof value !== 'string' || value.length < 3 || value.length > 50) {
            return null;
        }
        // Only alphanumeric, underscore, hyphen
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return null;
        }
        return sanitizeString(value, 50);
    },

    url: sanitizeUrl,

    phone: (value) => {
        if (typeof value !== 'string') {
            return null;
        }
        // Remove non-numeric characters
        const digits = value.replace(/\D/g, '');
        // Validate length (international format)
        return (digits.length >= 10 && digits.length <= 15) ? digits : null;
    },

    integer: (value) => {
        const num = parseInt(value, 10);
        return isNaN(num) ? null : num;
    },

    float: (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    },

    boolean: (value) => {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true' || value === '1';
        }
        return false;
    },

    date: (value) => {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    },

    slug: (value) => {
        if (typeof value !== 'string') {
            return null;
        }
        // Only alphanumeric and hyphens
        if (!/^[a-z0-9-]+$/.test(value.toLowerCase())) {
            return null;
        }
        return value.toLowerCase();
    }
};

module.exports = {
    sanitizeString,
    sanitizeEmail,
    sanitizeUrl,
    sanitizeNumber,
    sanitizeObject,
    sanitizationMiddleware,
    preventRequestSmuggling,
    fieldValidators
};
