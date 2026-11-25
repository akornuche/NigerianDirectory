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

    // Any run of characters other than letters and digits becomes one
    // hyphen, so a name such as "Ado-Odo/Ota" cannot add a path segment.
    // The API matches route segments with the same rule (urlSegment in
    // backend/src/utils/slugify.js).
    const segment = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

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

/**
 * The one public URL of a directory record. Universities live under
 * /education/universities/{state}/{city}/, everything else under
 * /education/schools/{state}/{area or city}/. Detail pages 301 any other
 * path to this one, so a record is never served at two addresses.
 */
export function recordPath(r: {
    institution_category?: string | null;
    state: string;
    city?: string | null;
    area?: string | null;
    slug: string;
}): string {
    const university = r.institution_category === 'university';
    const locality = university ? toSlugSegment(r.city || r.state) : toLocationSegment(r.area, r.city || r.state);
    return `/education/${university ? 'universities' : 'schools'}/${toSlugSegment(r.state)}/${locality}/${r.slug}/`;
}
