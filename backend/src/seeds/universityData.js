/**
 * Nigerian university roster.
 *
 * This file is the source of truth for seeded universities and is tracked in
 * version control deliberately: an earlier roster existed only inside a local
 * database volume and was lost when that volume became unreachable.
 *
 * Add new institutions here rather than inserting rows by hand, so any
 * environment can be rebuilt from the repository.
 *
 * Required: name, type, state, city
 * type: 'federal' | 'state' | 'private'
 */

const universities = [
    {
        name: 'University of Ibadan',
        type: 'federal',
        state: 'Oyo',
        city: 'Ibadan',
        // Templates build route segments from area, falling back to city, so
        // leaving area null produced broken links and crashed state pages.
        area: 'Ibadan North',
        address: 'Oduduwa Road, Ibadan',
        website: 'https://ui.edu.ng',
        established_year: 1948,
        principal_name: 'Prof. Kayode Adebowale',
        principal_title: 'Vice-Chancellor',
        levels: 'Undergraduate, Postgraduate',
        boarding: true,
    },
    {
        name: 'University of Lagos',
        type: 'federal',
        state: 'Lagos',
        city: 'Akoka',
        area: 'Yaba',
        address: 'University Road, Akoka, Yaba',
        website: 'https://unilag.edu.ng',
        established_year: 1962,
        principal_name: 'Prof. Folasade Ogunsola',
        principal_title: 'Vice-Chancellor',
        levels: 'Undergraduate, Postgraduate',
        boarding: true,
    },
];

/**
 * Build a URL slug from an institution name.
 *
 * Matches the slugs already present in existing databases so that re-seeding
 * updates rows instead of creating duplicates.
 */
function slugify(name) {
    return name
        .toLowerCase()
        .replace(/[,.]/g, '')
        .replace(/\s+/g, '-');
}

module.exports = { universities, slugify };
