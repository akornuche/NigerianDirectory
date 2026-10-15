"""
Niche Configuration for the Generic Crawler
=============================================
Defines what makes one directory vertical (university, hospital,
restaurant, ...) different from another, as data rather than as a
duplicated Python file.

Why this exists
----------------
university_crawler.py was a straight copy of the schools crawler with
"school" renamed to "university" throughout: the same ~500 lines, the same
bugs, duplicated. Scaling that pattern to the other seven verticals already
planned in frontend/src/config/verticals.ts (health, food, home-services,
churches, automotive, travel, business) would mean eight near-identical
files, each needing every future fix applied by hand eight times.

Looking at what university_crawler.py actually contained, almost none of it
is university-specific:
  - sentence-safe truncation, div/li/p harvesting, tie-break classification,
    subpage discovery, search retry/backoff -- all niche-agnostic
  - HISTORY_KW/ACADEMIC_KW/CAMPUS_KW/LIFE_KW, SUBPAGE_HINTS, the SEO title
    template, and the "institution_category = 'university'" filter -- these
    are the only niche-specific parts

This file captures exactly that second group as data. niche_crawler.py
is the one engine that reads it.

A hard constraint worth stating plainly: the schools table has exactly four
enrichment columns (enriched_history, enriched_academics,
enriched_campus_info, enriched_student_life), and database.py's
update_school_enrichment only accepts those four names. So every niche's
content is organised into the same four generic section slots
('history', 'academics', 'campus', 'student_life'), with the config
supplying a different *meaning* and *label* for each slot per niche. A
hospital's "academics" slot, for example, holds its services/departments
rather than faculties -- same column, different vocabulary. Adding a true
fifth section to any niche would require a migration, not just a config
entry.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Callable, Optional


# The four physical section slots every niche's content must map onto.
# Order matches FIELD_MAP in niche_crawler.py.
SECTION_KEYS = ('history', 'academics', 'campus', 'student_life')


@dataclass(frozen=True)
class NicheConfig:
    """
    Everything that distinguishes one vertical from another.

    key: short identifier used in logging and Blob storage paths
         (e.g. "university", "hospital"). Should match the
         institution_category value used to filter and tag rows, but is
         kept separate so a niche can use a different display key if ever
         needed.
    institution_category: value stored in schools.institution_category and
         used to filter get_institutions_for_enrichment().
    display_name: human-readable label for logs and the SEO template.
    section_labels: human-facing name for each of the four fixed slots,
         e.g. university's 'campus' slot is labelled "Campus & Facilities"
         while a hospital's might be "Facilities & Equipment".
    keywords: per-slot keyword list used for classification. Longer lists
         are not favoured over shorter ones, since niche_crawler.py
         normalises each score by the list's own length.
    subpage_hints: per-slot URL fragments used to discover and route
         subpages (e.g. "faculty" for a university's academics slot,
         "departments" for a hospital's).
    query_templates: format strings used to build search engine queries.
         Each receives name, state, city as named fields.
    seo_title_template / seo_description_template: format strings for the
         meta_title / meta_description fields. Receive name, type, state,
         city as named fields. seo_title_template is truncated to 60 chars
         and seo_description_template to 160 chars by the engine, matching
         existing SEO conventions elsewhere in this codebase.
    type_label: how to describe uni.get('type', ...) in the SEO
         description, e.g. "university" vs "hospital".
    """

    key: str
    institution_category: str
    display_name: str

    section_labels: Dict[str, str]
    keywords: Dict[str, List[str]]
    subpage_hints: Dict[str, List[str]]

    query_templates: List[str] = field(default_factory=list)

    seo_title_template: str = "{name} — {type} {display_name} in {state} | NigerianDirectory"
    seo_description_template: str = (
        "Explore {name}, a {type} {type_label} in {city}, {state}. "
        "Discover more on NigerianDirectory."
    )
    type_label: str = "institution"

    def __post_init__(self):
        missing_sections = set(SECTION_KEYS) - set(self.section_labels)
        if missing_sections:
            raise ValueError(
                f"NicheConfig '{self.key}' is missing section_labels for: "
                f"{sorted(missing_sections)}"
            )
        missing_keywords = set(SECTION_KEYS) - set(self.keywords)
        if missing_keywords:
            raise ValueError(
                f"NicheConfig '{self.key}' is missing keywords for: "
                f"{sorted(missing_keywords)}"
            )


UNIVERSITY = NicheConfig(
    key="university",
    institution_category="university",
    display_name="University",
    type_label="university",

    section_labels={
        "history": "Historical Background",
        "academics": "Academic Programs & Research",
        "campus": "Campus & Facilities",
        "student_life": "Student Life",
    },

    keywords={
        "history": [
            'history', 'founded', 'established', 'chartered', 'inaugurated',
            'origin', 'background', 'decades', 'years', 'milestone',
            'first vice-chancellor', 'pioneer', 'evolution', 'growth',
        ],
        "academics": [
            'faculty', 'faculties', 'department', 'programme', 'course',
            'undergraduate', 'postgraduate', 'masters', 'phd', 'degree',
            'school of', 'college of', 'nuc', 'accreditation', 'accredited',
            'jamb', 'admission', 'cutoff', 'waec', 'utme', 'research',
            'scholarship', 'fellowship', 'senate',
        ],
        "campus": [
            'campus', 'facility', 'facilities', 'laboratory', 'libraries',
            'hostel', 'accommodation', 'auditorium', 'stadium', 'clinic',
            'hospital', 'infrastructure', 'building', 'hall', 'centre',
            'university teaching hospital', 'medical centre',
        ],
        "student_life": [
            'student', 'students', 'union', 'club', 'society', 'association',
            'sport', 'athletics', 'extracurricular', 'fellowship', 'cultural',
            'festival', 'alumni', 'convocation', 'ceremony', 'graduation',
        ],
    },

    subpage_hints={
        "history": [
            'about', 'about-us', 'aboutus', 'history', 'our-history',
            'heritage', 'overview', 'background', 'profile', 'vision',
            'mission', 'who-we-are',
        ],
        "academics": [
            'academic', 'academics', 'faculty', 'faculties', 'department',
            'departments', 'programme', 'programmes', 'program', 'programs',
            'course', 'courses', 'school-of', 'college-of', 'admission',
            'admissions', 'undergraduate', 'postgraduate', 'research',
            'accreditation', 'institute',
        ],
        "campus": [
            'campus', 'facility', 'facilities', 'library', 'libraries',
            'hostel', 'accommodation', 'infrastructure', 'laboratory',
            'laboratories', 'health', 'clinic', 'sport-facility', 'gallery',
        ],
        # Deliberately excludes news and events: those pages carry dated
        # announcements rather than evergreen descriptions of the
        # institution, and read as noise on a directory page.
        "student_life": [
            'student-life', 'studentlife', 'student', 'students',
            'student-affairs', 'campus-life', 'club', 'clubs', 'society',
            'societies', 'sport', 'sports', 'alumni', 'convocation',
        ],
    },

    query_templates=[
        '"{name}" {state} Nigeria history founding',
        '"{name}" Nigeria faculties departments programmes',
        '"{name}" {city_or_state} campus facilities hostel',
        '"{name}" Nigeria student life activities union',
        '"{name}" NUC accreditation admission requirements',
        '{name} {city_or_state} university Nigeria information',
    ],

    seo_title_template="{name} — {type} University in {state} | NigerianDirectory",
    seo_description_template=(
        "Explore {name}, a {type} university in {city}, {state}. "
        "Discover faculties, programmes, admission requirements, campus life and more."
    ),
)


HOSPITAL = NicheConfig(
    key="hospital",
    institution_category="hospital",
    display_name="Hospital",
    type_label="hospital",

    # Structurally the furthest from a university of any planned niche
    # (frontend/src/config/verticals.ts lists hospitals/clinics/pharmacies
    # under Health & Wellness): a hospital has no "student life" or
    # "campus" in the academic sense. The four fixed slots are reused with
    # entirely different meanings:
    #   history       -> founding, ownership, accreditation history
    #   academics      -> clinical services, departments, specialisms
    #   campus         -> facilities, equipment, wards, labs
    #   student_life   -> patient experience, visiting policy, community
    section_labels={
        "history": "History & Accreditation",
        "academics": "Clinical Services & Departments",
        "campus": "Facilities & Equipment",
        "student_life": "Patient Experience",
    },

    keywords={
        "history": [
            'history', 'founded', 'established', 'accredited', 'accreditation',
            'licensed', 'registered', 'origin', 'background', 'years',
            'milestone', 'pioneer', 'legacy', 'mission', 'vision',
        ],
        "academics": [
            'department', 'unit', 'clinic', 'specialist', 'specialism',
            'consultant', 'surgery', 'surgical', 'diagnosis', 'diagnostic',
            'treatment', 'therapy', 'ward', 'icu', 'maternity', 'pediatric',
            'paediatric', 'cardiology', 'oncology', 'radiology', 'laboratory',
            'emergency', 'outpatient', 'inpatient', 'referral',
        ],
        "campus": [
            'facility', 'facilities', 'equipment', 'theatre', 'ward', 'bed',
            'laboratory', 'scanner', 'ambulance', 'pharmacy', 'infrastructure',
            'building', 'wing', 'centre', 'icu', 'intensive care',
        ],
        "student_life": [
            'patient', 'patients', 'visiting', 'visitor', 'community',
            'outreach', 'support group', 'counselling', 'welfare', 'nhis',
            'insurance', 'appointment', 'consultation', 'experience',
        ],
    },

    subpage_hints={
        "history": [
            'about', 'about-us', 'aboutus', 'history', 'accreditation',
            'overview', 'profile', 'vision', 'mission', 'who-we-are',
        ],
        "academics": [
            'department', 'departments', 'service', 'services', 'specialist',
            'specialists', 'clinic', 'clinics', 'unit', 'units', 'surgery',
            'diagnostic', 'diagnostics', 'laboratory', 'referral',
        ],
        "campus": [
            'facility', 'facilities', 'equipment', 'ward', 'wards', 'theatre',
            'laboratory', 'pharmacy', 'infrastructure', 'gallery',
        ],
        # Excludes news/blog/press for the same reason as universities:
        # dated announcements are not evergreen descriptive content.
        "student_life": [
            'patient', 'patients', 'patient-experience', 'visiting',
            'visitors', 'community', 'outreach', 'insurance', 'nhis',
            'appointment', 'appointments', 'contact',
        ],
    },

    query_templates=[
        '"{name}" {state} Nigeria hospital history accreditation',
        '"{name}" Nigeria hospital departments specialists services',
        '"{name}" {city_or_state} hospital facilities equipment',
        '"{name}" Nigeria hospital patient experience community',
        '"{name}" NHIS accreditation licensed hospital Nigeria',
        '{name} {city_or_state} hospital Nigeria information',
    ],

    seo_title_template="{name} — {type} Hospital in {state} | NigerianDirectory",
    seo_description_template=(
        "Explore {name}, a {type} hospital in {city}, {state}. "
        "Discover services, specialists, facilities and patient information."
    ),
)


NICHES: Dict[str, NicheConfig] = {
    config.key: config
    for config in (UNIVERSITY, HOSPITAL)
}


def get_niche(key: str) -> NicheConfig:
    try:
        return NICHES[key]
    except KeyError:
        available = ', '.join(sorted(NICHES))
        raise KeyError(f"Unknown niche '{key}'. Available: {available}")
