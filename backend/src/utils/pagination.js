/**
 * Pagination helper utilities
 */

/**
 * Parse and validate pagination params from query string
 * @param {Object} query - Express req.query object
 * @param {Object} defaults - Default values
 * @returns {Object} { page, limit, offset }
 */
function parsePagination(query, defaults = {}) {
    const {
        maxLimit = 100,
        defaultLimit = 20,
        defaultPage = 1
    } = defaults;

    let page = parseInt(query.page) || defaultPage;
    let limit = parseInt(query.limit) || defaultLimit;

    // Clamp values
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > maxLimit) limit = maxLimit;

    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

/**
 * Build pagination metadata for responses
 * @param {number} totalCount - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
function buildPaginationMeta(totalCount, page, limit) {
    const totalPages = Math.ceil(totalCount / limit);
    return {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page * limit < totalCount,
        hasPrevious: page > 1
    };
}

module.exports = {
    parsePagination,
    buildPaginationMeta
};
