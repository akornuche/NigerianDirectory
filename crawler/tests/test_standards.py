"""
Offline tests for crawler/standards.py, built from real failures found by the
2026-11-21 audit (documents/audit/2026-11-21-flagged-records.csv).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import standards as st  # noqa: E402


class TestSources:
    def test_own_site_is_never_a_source(self):
        # 38 school records cited this site as their own source.
        assert st.is_blocked_source('https://www.nigeriandirectory.com.ng/education/schools/lagos/ikeja/chrisland-schools/')

    def test_ai_generated_encyclopedia_is_blocked(self):
        assert st.is_blocked_source('https://grokipedia.com/page/University_of_Benin')

    def test_job_boards_are_low_trust(self):
        assert st.is_low_trust_source('https://www.joberplanet.com/some-university-courses')
        assert not st.is_low_trust_source('https://www.ui.edu.ng/about')


class TestJunk:
    def test_scraped_news_headline(self):
        assert st.is_junk('Dowen College is in Lekki. Amazon sinks as AI spending eclipses fastest cloud growth in five years')

    def test_byline_and_listicle(self):
        assert st.is_junk('History of Abia State University (ABSU). By SchoolMata Team. Abia State University is...')
        assert st.is_junk('Top 20 Best Computer & Tech Courses to Study in Nigeria')

    def test_terms_of_service_text(self):
        assert st.is_junk('users are responsible for maintaining the confidentiality of their login credentials')

    def test_legitimate_text_is_not_junk(self):
        assert not st.is_junk('Governors have invested in teacher recruitment and school infrastructure.')
        assert not st.is_junk('The state has remained in the top 3 best performers in school certificate exams.')
        assert not st.is_junk('The school is now sponsored by ten Christian mission bodies.')
        assert st.is_junk('Sponsored content: best schools to apply to this year')


class TestRelevance:
    LOC = ('Osun', 'Osogbo', 'Osogbo')

    def test_text_about_another_school_is_rejected(self):
        # Government Girls Secondary School Osogbo was given this text.
        block = ('Ebunoluwa International School (EIS) was founded in September 2002 as a private school '
                 'with international standard.')
        assert not st.block_is_relevant(block, 'Government Girls Secondary School Osogbo', self.LOC)

    def test_generic_essay_is_rejected(self):
        block = ('The Nigerian education system is divided into three levels: primary, secondary, and '
                 'tertiary. Primary education lasts for six years.')
        assert not st.block_is_relevant(block, 'Community Secondary School Zuru', ('Kebbi', 'Zuru', 'Zuru'))

    def test_text_naming_the_school_is_accepted(self):
        block = 'King\'s College was founded on 20 September 1909 with ten students on Lagos Island.'
        assert st.block_is_relevant(block, "King's College Lagos", ('Lagos', 'Lagos', 'Lagos Island'))

    def test_section_gate_requires_opening_about_institution(self):
        text = ('The Nigerian education system is divided into three levels. ' * 6) + ' Igbobi College is in Yaba.'
        assert not st.section_passes(text, 'Igbobi College Lagos', ('Lagos', 'Lagos', 'Yaba'))
        good = 'Igbobi College was founded in 1932 in Yaba, Lagos. ' + 'It is a boys\' secondary school. ' * 10
        assert st.section_passes(good, 'Igbobi College Lagos', ('Lagos', 'Lagos', 'Yaba'))

    def test_short_section_fails(self):
        assert not st.section_passes('Igbobi College is a school.', 'Igbobi College Lagos', ('Lagos',))


class TestWebsiteOwnership:
    def test_school_never_gets_a_university_domain(self):
        # Federal Government College Osun was given uniosun.edu.ng.
        assert not st.website_plausibly_owned('https://uniosun.edu.ng', 'Federal Government College Osun',
                                              'school', ('Osun', 'Osogbo', None))

    def test_school_never_gets_a_polytechnic_domain(self):
        # Three Damaturu schools were given the Federal Polytechnic's site.
        assert not st.website_plausibly_owned('https://fedpodam.edu.ng', 'Government Science Secondary School Damaturu',
                                              'school', ('Yobe', 'Damaturu', 'Damaturu'))

    def test_name_with_only_location_words_is_never_matched(self):
        assert not st.website_plausibly_owned('https://fgcosun.sch.ng', 'Federal Government College Osun',
                                              'school', ('Osun',))

    def test_unrelated_organisation_rejected(self):
        # Kaduna State University was given a students' association site.
        assert not st.website_plausibly_owned('https://ssanunational.org.ng', 'Kaduna State University',
                                              'university', ('Kaduna', 'Kaduna', None))

    def test_domain_already_used_by_another_record_rejected(self):
        assert not st.website_plausibly_owned('https://unilorin.edu.ng', 'University of Ilorin Staff School',
                                              'school', ('Kwara', 'Ilorin'), used_by_other_record=True)

    def test_matching_domain_and_title_accepted(self):
        assert st.website_plausibly_owned('https://www.kasu.edu.ng', 'Kaduna State University', 'university',
                                          ('Kaduna',), page_title='Kaduna State University - KASU')
        assert st.website_plausibly_owned('https://www.chrislandschools.com', 'Chrisland Schools', 'school',
                                          ('Lagos', 'Lagos', 'Ikeja'), page_title='Chrisland Schools | Home')

    def test_title_naming_someone_else_rejected(self):
        assert not st.website_plausibly_owned('https://www.chrislandschools.com', 'Chrisland Schools', 'school',
                                              ('Lagos',), page_title='Domain for sale')
