/**
 * URL segment helpers.
 *
 * Institution records do not always carry every location field. Universities,
 * for example, are seeded with a city but no area. Templates that built route
 * segments by calling `.toLowerCase()` directly on those fields threw
 * "Cannot read properties of null" and returned HTTP 500 for any state
 * containing such a record.
 */

const FALLBACK_SEGMENT = 'area';

/**
 * Convert a location name into a URL-safe path segment.
 *
 * Accepts null and undefined so callers can pass optional fields directly,
 * and falls back to a stable placeholder rather than throwing.
 */
export function toSlugSegment(
    value: string | null | undefined,
    fallback: string = FALLBACK_SEGMENT
): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const segment = value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

    return segment === '' ? fallback : segment;
}

/**
 * Pick the most specific available location name for a route segment,
 * preferring area over city.
 */
export function toLocationSegment(
    area: string | null | undefined,
    city: string | null | undefined
): string {
    if (typeof area === 'string' && area.trim() !== '') {
        return toSlugSegment(area);
    }
    return toSlugSegment(city);
}
