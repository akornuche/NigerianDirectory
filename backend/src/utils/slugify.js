/**
 * Slug generation utilities
 */
const slugifyLib = require('slugify');

/**
 * Generate a URL-safe slug from a string
 * @param {string} text - Text to slugify
 * @returns {string} URL-safe slug
 */
function generateSlug(text) {
    return slugifyLib(text, {
        lower: true,
        strict: true,
        trim: true
    });
}

/**
 * Convert a location name into the URL path segment used by the frontend
 * routes: lowercase, each run of non-alphanumeric characters becomes one
 * hyphen, no leading or trailing hyphen. "Ado-Odo/Ota" -> "ado-odo-ota".
 * Must stay identical to toSlugSegment in frontend/src/lib/slug.ts.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function urlSegment(value) {
    return (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * The same transform in SQL, for matching a route segment against a column.
 * @param {string} column - Column name (trusted identifier, never user input)
 */
function urlSegmentSql(column) {
    return `TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(${column}), '[^a-z0-9]+', '-', 'g'))`;
}

/**
 * Generate a school slug with optional location context
 * @param {string} name - School name
 * @param {string} state - State name (optional, for disambiguation)
 * @param {string} area - Area name (optional, for disambiguation)
 * @returns {string} URL-safe slug
 */
function generateSchoolSlug(name, state, area) {
    return generateSlug(name);
}

/**
 * Generate a location slug
 * @param {string} state - State name
 * @param {string} city - City name (optional)
 * @param {string} area - Area name (optional)
 * @returns {string} URL-safe slug
 */
function generateLocationSlug(state, city, area) {
    const parts = [state];
    if (city) parts.push(city);
    if (area) parts.push(area);
    return generateSlug(parts.join(' '));
}

module.exports = {
    urlSegment,
    urlSegmentSql,
    generateSlug,
    generateSchoolSlug,
    generateLocationSlug
};
