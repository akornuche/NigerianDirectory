/**
 * Links from news stories to the directory: which published universities and
 * schools a story mentions, by full name, by name without its town suffix
 * ("Covenant University" for "Covenant University Ota") or by a common
 * acronym ("UNILAG"). A name only counts when it points to exactly one
 * record, the longest name wins where two overlap, and a teaching hospital
 * ("University of Benin Teaching Hospital") is not its university.
 */
const { urlSegment } = require('./slugify');

// Common acronyms, keyed by the record's exact name. Matched case-sensitively.
const ACRONYMS = {
    'University of Lagos': ['UNILAG'],
    'Ahmadu Bello University': ['ABU'],
    'Obafemi Awolowo University': ['OAU'],
    'University of Nigeria, Nsukka': ['UNN'],
    'University of Benin': ['UNIBEN'],
    'University of Port Harcourt': ['UNIPORT'],
    'Lagos State University': ['LASU'],
    'Kaduna State University': ['KASU'],
    'Adekunle Ajasin University': ['AAUA'],
    'Imo State University': ['IMSU'],
    'Bayero University Kano': ['BUK'],
    'University of Jos': ['UNIJOS'],
    'University of Maiduguri': ['UNIMAID'],
    'University of Abuja': ['UNIABUJA'],
    'University of Uyo': ['UNIUYO'],
    'National Open University of Nigeria': ['NOUN'],
    'Federal University of Technology, Akure': ['FUTA'],
    'Federal University of Technology, Owerri': ['FUTO'],
    'Federal University of Technology, Minna': ['FUTMINNA'],
    'Ladoke Akintola University of Technology': ['LAUTECH'],
    'Nnamdi Azikiwe University': ['UNIZIK'],
    'University of Calabar': ['UNICAL'],
    'Delta State University': ['DELSU'],
    'Ekiti State University': ['EKSU'],
    'University of Ilorin': ['UNILORIN'],
    'Olabisi Onabanjo University': ['OOU'],
    'Rivers State University': ['RSU'],
    'Usmanu Danfodiyo University': ['UDUS'],
    'Abubakar Tafawa Balewa University': ['ATBU'],
    'Federal University of Agriculture, Abeokuta': ['FUNAAB'],
    'Michael Okpara University of Agriculture': ['MOUAU'],
};

const INSTITUTION_WORD = /\b(university|college|polytechnic|school|academy|institute)\b/i;
const ENDS_WITH_INSTITUTION = /\b(university|college|polytechnic|school|academy|institute)$/i;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The public URL of a record, as frontend/src/lib/adminApi.ts publicPath builds it. */
function recordPath(r) {
    const university = r.institution_category === 'university';
    const locality = university ? urlSegment(r.city) : urlSegment(r.area) || urlSegment(r.city);
    return `/education/${university ? 'universities' : 'schools'}/${urlSegment(r.state)}/${locality || 'area'}/${r.slug}/`;
}

/** Name variants for one record: the name itself and the name without a trailing town. */
function variants(r) {
    const out = [r.name];
    // "University of Nigeria, Nsukka" -> "University of Nigeria"
    const comma = r.name.match(/^(.+?),\s*[^,]+$/);
    if (comma && !/\b(of|and|the|for)$/i.test(comma[1])) out.push(comma[1]);
    // "Covenant University Ota" -> "Covenant University", but never "University of Lagos" -> "University of"
    for (const place of [r.city, r.area, r.state]) {
        if (!place) continue;
        const m = r.name.match(new RegExp(`^(.+?)\\s+${escape(place)}$`, 'i'));
        if (m && ENDS_WITH_INSTITUTION.test(m[1])) out.push(m[1]);
    }
    return out.filter((v) => v.length >= 10 && v.split(/\s+/).length >= 2 && INSTITUTION_WORD.test(v));
}

/**
 * Build a matcher over the published records.
 * @param {Array<{name, slug, state, city, area, institution_category}>} records
 */
function buildMatcher(records) {
    const owners = new Map(); // lowercased variant -> Set of record indexes
    records.forEach((r, i) => {
        for (const v of variants(r)) {
            const k = v.toLowerCase();
            if (!owners.has(k)) owners.set(k, new Set());
            owners.get(k).add(i);
        }
    });
    const byName = new Map(); // lowercased variant -> record, only when unambiguous
    for (const [k, set] of owners) if (set.size === 1) byName.set(k, records[[...set][0]]);
    const byAcronym = new Map();
    records.forEach((r) => (ACRONYMS[r.name] || []).forEach((a) => byAcronym.set(a, r)));

    const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escape);
    const nameRe = names.length ? new RegExp(`\\b(?:${names.join('|')})\\b(?!\\s+Teaching Hospital)`, 'gi') : null;
    const acronymRe = byAcronym.size ? new RegExp(`\\b(?:${[...byAcronym.keys()].map(escape).join('|')})\\b`, 'g') : null;

    /** Records a piece of text mentions, in order of first mention, at most `limit`. */
    return function find(text, limit = 4) {
        const hits = [];
        if (nameRe) for (const m of text.matchAll(nameRe)) hits.push({ at: m.index, r: byName.get(m[0].toLowerCase()) });
        if (acronymRe) for (const m of text.matchAll(acronymRe)) hits.push({ at: m.index, r: byAcronym.get(m[0]) });
        hits.sort((a, b) => a.at - b.at);
        const seen = new Set();
        const links = [];
        for (const { r } of hits) {
            if (!r || seen.has(r.slug)) continue;
            seen.add(r.slug);
            links.push({ name: r.name, path: recordPath(r) });
            if (links.length >= limit) break;
        }
        return links;
    };
}

/** The state page a story's state tag links to (every state has universities listed). */
const statePath = (state) => `/education/universities/${urlSegment(state)}/`;

module.exports = { buildMatcher, recordPath, statePath, variants, ACRONYMS };
