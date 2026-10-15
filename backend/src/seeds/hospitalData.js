/**
 * Nigerian hospital roster.
 *
 * Mirrors universityData.js: a tracked source of truth so institutions can
 * be rebuilt from the repository rather than existing only inside a
 * database that could become unreachable.
 *
 * Required: name, type, state, city
 * type: must be one of the values allowed by the schools_type_check
 * constraint ('private', 'public', 'international', 'federal', 'state',
 * 'mission', 'community', 'proprietory'). Nigerian teaching hospitals are
 * ordinarily described as federal; general/specialist hospitals run by a
 * state government as state or public.
 */

const hospitals = [
    {
        name: 'Lagos University Teaching Hospital',
        type: 'federal',
        state: 'Lagos',
        city: 'Surulere',
        area: 'Idi-Araba',
        address: 'Idi-Araba, Surulere, Lagos',
        website: 'https://luth.gov.ng',
        established_year: 1962,
        principal_name: null,
        principal_title: 'Chief Medical Director',
        levels: null,
        boarding: false,
    },
];

/**
 * Build a URL slug from an institution name.
 *
 * Matches slugify() in universityData.js so route segments are generated
 * consistently across niches.
 */
function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[,.]/g, '')
        .replace(/\s+/g, '-');
}

module.exports = { hospitals, slugify };
