export interface ContentFields {
  enriched_history?: string | null;
  enriched_academics?: string | null;
  enriched_campus_info?: string | null;
  enriched_student_life?: string | null;
}

export interface ContentQualityResult {
  indexable: boolean;
  manageable: boolean;
  strongSectionCount: number;
  originalWords: number;
  populatedSectionCount: number;
  repeatedFields: string[];
  irrelevantFields: string[];
}

const CONTENT_FIELDS = [
  'enriched_history',
  'enriched_academics',
  'enriched_campus_info',
  'enriched_student_life',
] as const;

const IRRELEVANT_MARKERS = [
  'amazon sinks as ai spending',
  'report cards for the last',
  'nursing graduates of bowen',
  'this is not another list copied from the internet',
];

// Standard paragraphs that appear on many pages (the admission note added
// to every university profile). They are useful to readers but are not
// original to the page, so they do not count towards indexability.
const SHARED_PARAGRAPH_PREFIXES = [
  'admission to undergraduate programmes is through the joint admissions',
  'undergraduate admission is through jamb',
  'as at every nigerian university, undergraduate admission',
  'admission still goes through jamb',
];

function withoutSharedParagraphs(value: string): string {
  return value
    .split(/\n\s*\n/)
    .filter((p) => !SHARED_PARAGRAPH_PREFIXES.some((prefix) => p.trim().toLowerCase().startsWith(prefix)))
    .join('\n\n')
    .trim();
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

// A page with a substantial history section and at least this many words of
// its own text is indexable even if its other sections are short.
const MIN_ORIGINAL_WORDS = 80;

function normalizedSentences(value: string): string[] {
  return value
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(Boolean);
}

function isRepeated(value: string): boolean {
  const sentences = normalizedSentences(value);
  if (sentences.length < 3) return false;

  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    counts.set(sentence, (counts.get(sentence) || 0) + 1);
  }

  const highestCount = Math.max(...Array.from(counts.values()));
  return highestCount / sentences.length >= 0.5;
}

function isIrrelevant(value: string): boolean {
  const normalized = value.toLowerCase();
  return IRRELEVANT_MARKERS.some((marker) => normalized.includes(marker));
}

export function assessContentQuality(fields: ContentFields): ContentQualityResult {
  const sections = CONTENT_FIELDS.map((field) => ({
    field,
    value: withoutSharedParagraphs((fields[field] || '').trim()),
  }));
  const populatedSections = sections.filter(({ value }) => value.length > 0);
  const strongSections = populatedSections.filter(({ value }) => value.length >= 200);
  const repeatedFields = sections
    .filter(({ value }) => value && isRepeated(value))
    .map(({ field }) => field);
  const irrelevantFields = sections
    .filter(({ value }) => value && isIrrelevant(value))
    .map(({ field }) => field);
  const manageable = populatedSections.length === 4 && strongSections.length === 0;
  const originalWords = wordCount(sections.map(({ value }) => value).join(' '));
  const historyStrong = (sections.find((s) => s.field === 'enriched_history')?.value.length || 0) >= 200;
  const substantial = strongSections.length >= 2 || (historyStrong && originalWords >= MIN_ORIGINAL_WORDS);

  return {
    indexable: substantial && repeatedFields.length === 0 && irrelevantFields.length === 0,
    originalWords,
    manageable,
    strongSectionCount: strongSections.length,
    populatedSectionCount: populatedSections.length,
    repeatedFields,
    irrelevantFields,
  };
}
