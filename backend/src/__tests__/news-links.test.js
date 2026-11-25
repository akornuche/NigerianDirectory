/**
 * News stories link to the directory records they mention, without
 * guessing: ambiguous names, teaching hospitals and lookalikes are skipped.
 */
const { buildMatcher, statePath } = require('../utils/newsLinks');

const records = [
    { name: 'University of Lagos', slug: 'university-of-lagos', state: 'Lagos', city: 'Akoka', area: null, institution_category: 'university' },
    { name: 'Lagos State University', slug: 'lagos-state-university', state: 'Lagos', city: 'Ojo', area: null, institution_category: 'university' },
    { name: 'Lagos State University of Education', slug: 'lasued', state: 'Lagos', city: 'Ijanikin', area: null, institution_category: 'university' },
    { name: 'University of Benin', slug: 'university-of-benin', state: 'Edo', city: 'Benin City', area: null, institution_category: 'university' },
    { name: 'Covenant University Ota', slug: 'covenant-university-ota', state: 'Ogun', city: 'Ota', area: null, institution_category: 'university' },
    { name: "King's College Lagos", slug: 'king-s-college-lagos', state: 'Lagos', city: 'Lagos', area: 'Lagos Island', institution_category: 'school' },
    { name: 'Federal Science and Technical College Yaba', slug: 'fstc-yaba', state: 'Lagos', city: 'Lagos', area: 'Yaba', institution_category: 'school' },
    { name: 'Federal Science and Technical College Uyo', slug: 'fstc-uyo', state: 'Akwa Ibom', city: 'Uyo', area: 'Uyo', institution_category: 'school' },
];
const find = buildMatcher(records);
const names = (t) => find(t).map((l) => l.name);

test('full names, names without the town, and acronyms all link', () => {
    expect(names('Students of Covenant University and UNILAG met at King\'s College.'))
        .toEqual(['Covenant University Ota', 'University of Lagos', "King's College Lagos"]);
});

test('links carry the public record path', () => {
    expect(find('LASU')[0].path).toBe('/education/universities/lagos/ojo/lagos-state-university/');
    expect(find("King's College Lagos")[0].path).toBe('/education/schools/lagos/lagos-island/king-s-college-lagos/');
});

test('the longest name wins and each record appears once', () => {
    expect(names('Lagos State University of Education and Lagos State University; LASU again'))
        .toEqual(['Lagos State University of Education', 'Lagos State University']);
});

test('teaching hospitals, ambiguous short names and lowercase acronyms do not link', () => {
    expect(names('Doctors at the University of Benin Teaching Hospital')).toEqual([]);
    expect(names('a Federal Science and Technical College student')).toEqual([]);
    expect(names('the unilag hashtag')).toEqual([]);
});

test('state tags link to the state page', () => {
    expect(statePath('Akwa Ibom')).toBe('/education/universities/akwa-ibom/');
});
