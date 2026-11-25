/**
 * The backend copy of the indexability rule (used by the admin Page Health
 * report) must agree with frontend/src/lib/content-quality.ts, which decides
 * noindex on the public site. These cases pin the shared behaviour.
 */
const { assessContentQuality } = require('../utils/contentQuality');

const para = (n) => Array.from({ length: n }, (_, i) => `Sentence number ${i} describes a distinct fact.`).join(' ');

describe('assessContentQuality', () => {
    test('two strong sections are indexable', () => {
        expect(assessContentQuality({ enriched_history: para(8), enriched_academics: para(8) }).indexable).toBe(true);
    });

    test('a strong history with 80+ original words is indexable on its own', () => {
        const r = assessContentQuality({ enriched_history: para(14), enriched_academics: 'Short.' });
        expect(r.originalWords).toBeGreaterThanOrEqual(80);
        expect(r.indexable).toBe(true);
    });

    test('short sections are not indexable', () => {
        expect(assessContentQuality({ enriched_history: 'A school.', enriched_academics: 'It teaches.' }).indexable).toBe(false);
    });

    test('the shared JAMB admission note does not count', () => {
        const note = `Admission to undergraduate programmes is through the Joint Admissions and Matriculation Board. ${para(10)}`;
        const r = assessContentQuality({ enriched_history: 'Founded in 1990.', enriched_academics: note });
        expect(r.originalWords).toBeLessThan(10);
        expect(r.indexable).toBe(false);
    });

    test('repeated sentences block indexing', () => {
        const rep = 'Same line here. Same line here. Same line here. Other.';
        const r = assessContentQuality({ enriched_history: rep.repeat(20), enriched_academics: para(8) });
        expect(r.repeatedFields).toContain('enriched_history');
        expect(r.indexable).toBe(false);
    });
});
