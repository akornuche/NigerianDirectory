/**
 * Standard API response helpers
 * Ensures consistent response format across all endpoints
 */

/**
 * Send a success response
 */
function success(res, data, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        ...data
    });
}

/**
 * Send a created response (201)
 */
function created(res, data) {
    return success(res, data, 201);
}

/**
 * Send a paginated response
 */
function paginated(res, { items, pagination, key = 'items' }) {
    return res.status(200).json({
        success: true,
        [key]: items,
        pagination
    });
}

/**
 * Send an error response
 */
function error(res, message, statusCode = 500, details = null) {
    const response = {
        success: false,
        error: message
    };
    if (details) {
        response.details = details;
    }
    return res.status(statusCode).json(response);
}

/**
 * Send a not found response
 */
function notFound(res, resource = 'Resource') {
    return error(res, `${resource} not found`, 404);
}

/**
 * Send a bad request response
 */
function badRequest(res, message = 'Bad request', details = null) {
    return error(res, message, 400, details);
}

/**
 * Send an unauthorized response
 */
function unauthorized(res, message = 'Unauthorized') {
    return error(res, message, 401);
}

/**
 * Send a forbidden response
 */
function forbidden(res, message = 'Forbidden') {
    return error(res, message, 403);
}

module.exports = {
    success,
    created,
    paginated,
    error,
    notFound,
    badRequest,
    unauthorized,
    forbidden
};
