/**
 * Whether a directory record has enough original text to be indexed.
 *
 * This is the backend copy of frontend/src/lib/content-quality.ts, which
 * decides noindex and sitemap inclusion on the public site. The admin Page
 * Health report uses this copy so it can filter and count across every
 * record. Keep the two in sync: src/__tests__/content-quality.test.js pins
 * the shared behaviour.
 */

const CONTENT_FIELDS = ['enriched_history', 'enriched_academics', 'enriched_campus_info', 'enriched_student_life'];

const IRRELEVANT_MARKERS = [
    'amazon sinks as ai spending',
    'report cards for the last',
    'nursing graduates of bowen',
    'this is not another list copied from the internet',
];

// The standard admission note on university profiles is not original to the
// page, so it does not count towards indexability.
const SHARED_PARAGRAPH_PREFIXES = [
    'admission to undergraduate programmes is through the joint admissions',
    'undergraduate admission is through jamb',
    'as at every nigerian university, undergraduate admission',
    'admission still goes through jamb',
];

const MIN_ORIGINAL_WORDS = 80;

function withoutSharedParagraphs(value) {
    return value
        .split(/\n\s*\n/)
        .filter((p) => !SHARED_PARAGRAPH_PREFIXES.some((prefix) => p.trim().toLowerCase().startsWith(prefix)))
        .join('\n\n')
        .trim();
}

const wordCount = (value) => value.split(/\s+/).filter(Boolean).length;

function isRepeated(value) {
    const sentences = value
        .split(/[.!?\n]+/)
        .map((s) => s.trim().replace(/\s+/g, ' ').toLowerCase())
        .filter(Boolean);
    if (sentences.length < 3) return false;
    const counts = new Map();
    for (const s of sentences) counts.set(s, (counts.get(s) || 0) + 1);
    return Math.max(...counts.values()) / sentences.length >= 0.5;
}

const isIrrelevant = (value) => IRRELEVANT_MARKERS.some((m) => value.toLowerCase().includes(m));

function assessContentQuality(fields) {
    const sections = CONTENT_FIELDS.map((field) => ({
        field,
        value: withoutSharedParagraphs(String(fields[field] || '').trim()),
    }));
    const populated = sections.filter((s) => s.value.length > 0);
    const strong = populated.filter((s) => s.value.length >= 200);
    const repeatedFields = sections.filter((s) => s.value && isRepeated(s.value)).map((s) => s.field);
    const irrelevantFields = sections.filter((s) => s.value && isIrrelevant(s.value)).map((s) => s.field);
    const originalWords = wordCount(sections.map((s) => s.value).join(' '));
    const historyStrong = (sections[0].value.length || 0) >= 200;
    const substantial = strong.length >= 2 || (historyStrong && originalWords >= MIN_ORIGINAL_WORDS);
    return {
        indexable: substantial && repeatedFields.length === 0 && irrelevantFields.length === 0,
        originalWords,
        strongSectionCount: strong.length,
        populatedSectionCount: populated.length,
        repeatedFields,
        irrelevantFields,
    };
}

module.exports = { assessContentQuality, MIN_ORIGINAL_WORDS };
