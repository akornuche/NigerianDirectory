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
    generateSlug,
    generateSchoolSlug,
    generateLocationSlug
};
