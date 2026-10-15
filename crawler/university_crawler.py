"""
University Crawler for Nigerian Directory
==========================================
Crawls web content for Nigerian universities (federal, state, private).
Adapted from the schools crawler with university-specific search terms,
content sections, and SEO optimizations.

Key differences from schools crawler:
- Searches for faculties, departments, programmes, NUC accreditation
- Maps content to: history, faculties/academics, campus, student_life
- SEO targets: JAMB, NUC, university admission, postgraduate terms
- Saves institution_category = 'university'
"""

import sys
import os
import json
import logging
import time
import re
import random
import signal
from datetime import datetime, timedelta
from threading import Event

import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlparse

# Add crawler directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from search_engines import search_web
from database import db_manager
from seo_optimizer import SEOOptimizer
from content_quality import ContentQualityManager
from circuit_breaker import system_breakers, with_circuit_breaker
from error_reporter import error_reporter

# ── Graceful shutdown ───────────────────────────────────────────────────────
shutdown_event = Event()

def signal_handler(signum, frame):
    print(f"\n🛑 Shutdown signal received")
    shutdown_event.set()

# ── Logging setup ────────────────────────────────────────────────────────────
def setup_logging():
    log_filename = f'university_crawl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    file_handler   = logging.FileHandler(log_filename, mode='w', encoding='utf-8')
    stream_handler = logging.StreamHandler()
    fmt = logging.Formatter('%(asctime)s %(levelname)s:%(name)s:%(message)s')
    file_handler.setFormatter(fmt)
    stream_handler.setFormatter(fmt)
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(file_handler)
    root.addHandler(stream_handler)
    print(f'📝 Logging to: {log_filename}', flush=True)
    return logging.getLogger('university_crawler')


# ── University content crawler ───────────────────────────────────────────────
class UniversityCrawler:
    """Crawls web content for Nigerian universities."""

    # University-specific keywords for search and categorisation
    HISTORY_KW = [
        'history', 'founded', 'established', 'chartered', 'inaugurated',
        'origin', 'background', 'decades', 'years', 'milestone',
        'first vice-chancellor', 'pioneer', 'evolution', 'growth'
    ]
    ACADEMIC_KW = [
        'faculty', 'faculties', 'department', 'programme', 'course',
        'undergraduate', 'postgraduate', 'masters', 'phd', 'degree',
        'school of', 'college of', 'nuc', 'accreditation', 'accredited',
        'jamb', 'admission', 'cutoff', 'waec', 'utme', 'research',
        'scholarship', 'fellowship', 'senate'
    ]
    CAMPUS_KW = [
        'campus', 'facility', 'facilities', 'laboratory', 'libraries',
        'hostel', 'accommodation', 'auditorium', 'stadium', 'clinic',
        'hospital', 'infrastructure', 'building', 'hall', 'centre',
        'university teaching hospital', 'medical centre'
    ]
    LIFE_KW = [
        'student', 'students', 'union', 'club', 'society', 'association',
        'sport', 'athletics', 'extracurricular', 'fellowship', 'cultural',
        'festival', 'alumni', 'convocation', 'ceremony', 'graduation'
    ]

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        self.seo     = SEOOptimizer()
        self.quality = ContentQualityManager()
        self.logger  = logging.getLogger('university_crawler')
        self.stats   = {
            'total': 0, 'success': 0, 'failed': 0,
            'website_primary': 0, 'search_only': 0,
            'quality_rejected': 0, 'insufficient': 0,
        }

    # ── Tunables ─────────────────────────────────────────────────────────────
    SECTIONS = ('history', 'academics', 'campus', 'student_life')

    # Maximum stored characters per section. The previous value of 800 capped
    # every page at roughly 3,200 characters regardless of how much material
    # was available, which worked against the goal of substantial pages.
    SECTION_CHAR_CAP = 2600

    # Minimum length for a harvested text block. Lowered from 60 because
    # headline-style sentences on university sites are frequently shorter.
    MIN_BLOCK_LEN = 45

    # Longest single block kept, to avoid one enormous block filling a section.
    MAX_BLOCK_LEN = 700

    MAX_SUBPAGES = 10
    PAGE_TIMEOUT = 20

    # Minimum keyword matches before a block is assigned to a section.
    # Third-party pages must clear the higher bar; the institution's own
    # domain is treated as inherently on-topic.
    MIN_KEYWORD_HITS = 2
    MIN_KEYWORD_HITS_OFFICIAL = 1

    # URL fragments that indicate which section a subpage is likely to serve.
    SUBPAGE_HINTS = {
        'history': [
            'about', 'about-us', 'aboutus', 'history', 'our-history', 'heritage',
            'overview', 'background', 'profile', 'vision', 'mission', 'who-we-are',
        ],
        'academics': [
            'academic', 'academics', 'faculty', 'faculties', 'department',
            'departments', 'programme', 'programmes', 'program', 'programs',
            'course', 'courses', 'school-of', 'college-of', 'admission',
            'admissions', 'undergraduate', 'postgraduate', 'research',
            'accreditation', 'institute',
        ],
        'campus': [
            'campus', 'facility', 'facilities', 'library', 'libraries', 'hostel',
            'accommodation', 'infrastructure', 'laboratory', 'laboratories',
            'health', 'clinic', 'sport-facility', 'gallery',
        ],
        # Deliberately excludes news and events. Those pages carry dated
        # announcements such as lecture themes and fair dates, which are not
        # evergreen descriptions of the institution and read as noise on a
        # directory page.
        'student_life': [
            'student-life', 'studentlife', 'student', 'students',
            'student-affairs', 'campus-life', 'club', 'clubs', 'society',
            'societies', 'sport', 'sports', 'alumni', 'convocation',
        ],
    }

    # Subpath fragments never worth crawling for descriptive content.
    SUBPAGE_EXCLUSIONS = (
        '/news', '/event', '/blog', '/press', '/vacanc', '/career',
        '/tender', '/notice', '/announcement', '/gallery', '/login',
        '/portal', '/webmail', '/search', '/tag/', '/category/',
        '/author/', '/archive', '/feed',
    )

    # Navigation and boilerplate text that should never become page content.
    BOILERPLATE_MARKERS = (
        'cookie', 'javascript', 'all rights reserved', 'copyright',
        'read more', 'click here', 'sign in', 'log in', 'subscribe',
        'follow us', 'privacy policy', 'terms of use', 'skip to content',
    )

    # Encyclopaedia and reference-list artefacts. Wikipedia mirrors are a
    # frequent search result and their citation blocks were being stored as
    # institutional history.
    CITATION_MARKERS = (
        'archived from the original', 'retrieved ', 'citation needed',
        'edit source', 'jump to navigation', 'this article',
        'doi:', 'isbn', 'issn', 'arxiv', 'pmid',
        'wayback machine', 'archived copy', 'original on',
    )

    # Sentence terminators used when trimming text to a length budget.
    SENTENCE_ENDINGS = ('. ', '! ', '? ', '." ', '!" ', '?" ', '.\n')

    # Abbreviations that end in a period but do not end a sentence.
    NON_TERMINAL_ABBREVIATIONS = (
        'prof.', 'dr.', 'mr.', 'mrs.', 'ms.', 'st.', 'no.', 'vol.', 'ed.',
        'e.g.', 'i.e.', 'etc.', 'jr.', 'sr.', 'rev.', 'hon.', 'engr.',
    )

    @classmethod
    def _truncate_at_sentence(cls, text: str, limit: int) -> str:
        """
        Trim text to a budget without cutting a sentence in half.

        Slicing on a raw character count left fragments such as
        "...report to Council an" and "...have these facilities: Ayodele Fa"
        on the published page.

        Text already inside the budget is returned untouched. An earlier
        version also required a trailing terminator here, which silently
        discarded most harvested prose because web copy frequently omits a
        final period, and the website yield fell to zero.
        """
        text = (text or '').strip()
        if not text:
            return ''

        if len(text) <= limit:
            return text

        window = text[:limit]

        best = -1
        for ending in cls.SENTENCE_ENDINGS:
            position = window.rfind(ending)
            while position != -1:
                candidate = window[:position + 1]
                tail = candidate.rsplit(' ', 1)[-1].lower()
                if tail not in cls.NON_TERMINAL_ABBREVIATIONS:
                    best = max(best, position + 1)
                    break
                position = window.rfind(ending, 0, position)

        if window.endswith(('.', '!', '?')):
            best = max(best, len(window))

        if best > 0:
            return window[:best].strip()

        # No sentence boundary inside the budget. Cut on a word boundary and
        # mark the text as continuing, rather than ending mid-word.
        trimmed = window.rsplit(' ', 1)[0].strip()
        if not trimmed:
            return ''
        return trimmed.rstrip(',;:') + '…'

    @classmethod
    def _tidy_ending(cls, text: str) -> str:
        """
        Ensure stored text closes on a complete sentence.

        Source pages sometimes end a block mid-word, for example a teaser
        reading "...have these facilities: Ayodele Fa". Such a block is kept
        for its useful content but the trailing partial sentence is removed.
        Text with no sentence boundary at all is returned unchanged, since
        discarding it entirely would lose real information.
        """
        text = (text or '').strip()
        if not text:
            return ''

        if text.endswith(('.', '!', '?', '"', ')', '…')):
            return text

        best = -1
        for ending in cls.SENTENCE_ENDINGS:
            position = text.rfind(ending)
            while position != -1:
                tail = text[:position + 1].rsplit(' ', 1)[-1].lower()
                if tail not in cls.NON_TERMINAL_ABBREVIATIONS:
                    best = max(best, position + 1)
                    break
                position = text.rfind(ending, 0, position)

        if best <= 0:
            return text

        return text[:best].strip()

    @classmethod
    def _join_blocks(cls, blocks: List[str], limit: int) -> str:
        """
        Concatenate whole blocks up to a budget.

        Assembling sections from complete blocks means the stored text is
        never cut mid-sentence at the section boundary, which is where the
        "...report to Council an" fragment came from. Blocks that do not fit
        are skipped rather than sliced.
        """
        parts: List[str] = []
        used = 0

        for block in blocks:
            block = (block or '').strip()
            if not block:
                continue

            addition = len(block) + (1 if parts else 0)
            if used + addition > limit:
                continue

            parts.append(block)
            used += addition

        return cls._tidy_ending(' '.join(parts).strip())

    # ── Text harvesting ──────────────────────────────────────────────────────
    def _text_blocks(self, node) -> List[str]:
        """
        Collect readable text blocks from a parsed document.

        The original implementation read only <p> tags. Measurement against
        live university sites showed that discarded 23 to 56 div elements of
        over 200 characters per homepage, because these sites place prose in
        divs, list items and sections.

        Only leaf-level blocks are taken, meaning elements that contain no
        further block-level element with text. That captures div-based prose
        without counting the same words once per ancestor.
        """
        blocks: List[str] = []
        block_tags = ['p', 'li', 'div', 'section', 'article', 'blockquote', 'td', 'dd']

        for tag in node.find_all(block_tags):
            if tag.find(block_tags):
                continue

            text = tag.get_text(' ', strip=True)
            if len(text) < self.MIN_BLOCK_LEN:
                continue

            lowered = text.lower()
            if any(marker in lowered for marker in self.BOILERPLATE_MARKERS):
                continue

            if any(marker in lowered for marker in self.CITATION_MARKERS):
                continue

            # Citation glyphs and bracketed footnote markers.
            if text.startswith(('↑', '^', '[')) or '↑' in text[:40]:
                continue

            # Dated event announcements rather than descriptive prose.
            if lowered.startswith(('theme:', 'date:', 'venue:', 'time:', 'posted on')):
                continue

            # Require sentence-like content rather than link lists or labels.
            if text.count(' ') < 6:
                continue

            # Reference lists are dense with digits and parentheses; prose is
            # not. Reject blocks that are more than a quarter numeric.
            digits = sum(1 for ch in text if ch.isdigit())
            if digits / max(len(text), 1) > 0.25:
                continue

            trimmed = self._truncate_at_sentence(text, self.MAX_BLOCK_LEN)
            if not trimmed:
                continue

            blocks.append(trimmed)

        # Drop duplicates, which are common across templated pages.
        seen = set()
        unique = []
        for block in blocks:
            key = block[:120].lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(block)

        return unique

    def _classify(self, text: str, totals: Dict[str, int],
                  min_hits: Optional[int] = None) -> Optional[str]:
        """
        Choose the section a block belongs to.

        Scores are normalised by keyword-list length so that sections with
        longer vocabularies are not favoured. Ties previously resolved through
        max() over a dict, which always returned 'history' because it is the
        first key; measurement found 5 of 51 blocks hitting that path. Ties now
        go to whichever tied section holds the least content, which both
        removes the bias and improves section breadth.
        """
        lowered = text.lower()
        keyword_sets = {
            'history': self.HISTORY_KW,
            'academics': self.ACADEMIC_KW,
            'campus': self.CAMPUS_KW,
            'student_life': self.LIFE_KW,
        }

        raw = {
            section: sum(1 for kw in keywords if kw in lowered)
            for section, keywords in keyword_sets.items()
        }
        scores = {
            section: raw[section] / len(keyword_sets[section])
            for section in keyword_sets
        }

        best = max(scores.values())
        if best <= 0:
            return None

        contenders = [s for s, v in scores.items() if v == best]
        if len(contenders) == 1:
            chosen = contenders[0]
        else:
            chosen = min(contenders, key=lambda s: totals.get(s, 0))

        # Evidence threshold. Third-party pages need two keyword hits, since
        # one broad term such as "background" was enough to file unrelated
        # research abstracts as institutional history. Pages on the
        # institution's own domain are about the institution by definition, so
        # applying the same bar there discarded nearly all official content:
        # the website yield for Ibadan fell from about 3,000 characters to 71.
        threshold = self.MIN_KEYWORD_HITS if min_hits is None else min_hits
        if raw[chosen] < threshold:
            return None

        return chosen

    def _harvest_page(self, url: str, accumulator: Dict[str, List[str]],
                      totals: Dict[str, int],
                      min_hits: Optional[int] = None) -> int:
        """Fetch one page, classify its blocks, and return characters added."""
        added = 0
        try:
            response = self.session.get(url, timeout=self.PAGE_TIMEOUT)
            if response.status_code != 200:
                return 0

            soup = BeautifulSoup(response.text, 'html.parser')
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'menu', 'form']):
                tag.decompose()

            body = soup.find('main') or soup.find('article') or soup.find('body')
            if not body:
                return 0

            for block in self._text_blocks(body):
                section = self._classify(block, totals, min_hits)
                if section is None:
                    continue
                if totals[section] >= self.SECTION_CHAR_CAP:
                    continue
                accumulator[section].append(block)
                totals[section] += len(block)
                added += len(block)

        except Exception as exc:
            self.logger.debug(f"Harvest failed for {url}: {exc}")

        return added

    def _discover_subpages(self, base_url: str) -> List[str]:
        """
        Find internal pages likely to carry section content.

        A university homepage is a landing page; history, faculties and campus
        detail live on dedicated subpages. Crawling only the root was the
        single largest source of missing content.
        """
        found: List[str] = []
        try:
            response = self.session.get(base_url, timeout=self.PAGE_TIMEOUT)
            if response.status_code != 200:
                return found

            soup = BeautifulSoup(response.text, 'html.parser')
            base_domain = urlparse(base_url).netloc.lower().replace('www.', '')

            all_hints = [h for hints in self.SUBPAGE_HINTS.values() for h in hints]
            scored = []

            for anchor in soup.find_all('a', href=True):
                href = anchor['href'].strip()
                if href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
                    continue

                absolute = urljoin(base_url, href)
                parsed = urlparse(absolute)

                if parsed.scheme not in ('http', 'https'):
                    continue

                # Stay on the institution's own domain.
                domain = parsed.netloc.lower().replace('www.', '')
                if domain != base_domain:
                    continue

                # Skip binaries and media.
                if any(parsed.path.lower().endswith(ext) for ext in
                       ('.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.doc', '.docx', '.xlsx')):
                    continue

                path = parsed.path.lower().rstrip('/')
                if path in ('', '/'):
                    continue

                if any(excluded in path for excluded in self.SUBPAGE_EXCLUSIONS):
                    continue

                matches = sum(1 for hint in all_hints if hint in path)
                if matches == 0:
                    continue

                # Prefer shallower paths, which tend to be overview pages.
                depth = path.count('/')
                scored.append((matches, -depth, absolute))

            seen = set()
            for _, _, link in sorted(scored, reverse=True):
                normalised = link.rstrip('/')
                if normalised in seen:
                    continue
                seen.add(normalised)
                found.append(link)
                if len(found) >= self.MAX_SUBPAGES:
                    break

        except Exception as exc:
            self.logger.debug(f"Subpage discovery failed for {base_url}: {exc}")

        return found

    # ── Website extraction ───────────────────────────────────────────────────
    def _extract_from_website(self, url: str, name: str) -> Dict[str, Any]:
        """Extract content from the institution's own website and subpages."""
        accumulator: Dict[str, List[str]] = {s: [] for s in self.SECTIONS}
        totals: Dict[str, int] = {s: 0 for s in self.SECTIONS}
        sources: List[Dict[str, Any]] = []

        if not url:
            return {**{s: '' for s in self.SECTIONS}, 'sources': []}

        official_hits = self.MIN_KEYWORD_HITS_OFFICIAL

        if self._harvest_page(url, accumulator, totals, official_hits) > 0 or any(totals.values()):
            sources.append({'url': url, 'title': name, 'type': 'official_website'})

        subpages = self._discover_subpages(url)
        if subpages:
            self.logger.info(f"🔗 Found {len(subpages)} candidate subpages")

        for link in subpages:
            if sum(totals.values()) >= self.SECTION_CHAR_CAP * len(self.SECTIONS):
                break
            if self._harvest_page(link, accumulator, totals, official_hits) > 0:
                sources.append({'url': link, 'title': name, 'type': 'official_website'})
            time.sleep(random.uniform(0.4, 0.9))

        if any(totals.values()):
            self.stats['website_primary'] += 1

        result = {
            s: self._join_blocks(accumulator[s], self.SECTION_CHAR_CAP)
            for s in self.SECTIONS
        }
        result['sources'] = sources
        return result

    # ── Search engine queries ────────────────────────────────────────────────
    def _build_queries(self, name: str, state: str, city: str) -> List[str]:
        return [
            f'"{name}" {state} Nigeria history founding',
            f'"{name}" Nigeria faculties departments programmes',
            f'"{name}" {city or state} campus facilities hostel',
            f'"{name}" Nigeria student life activities union',
            f'"{name}" NUC accreditation admission requirements',
            f'{name} {city or state} university Nigeria information',
        ]

    def _search_web(self, name: str, state: str, city: str,
                    totals: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """
        Run search queries and harvest content from the results.

        Accepts the running per-section character totals so that search tops
        up whichever sections the official website left thin, rather than
        refilling sections that are already complete.
        """
        extracted: Dict[str, Any] = {s: [] for s in self.SECTIONS}
        extracted['sources'] = []
        if totals is None:
            totals = {s: 0 for s in self.SECTIONS}
        seen_urls = set()

        for query in self._build_queries(name, state, city):
            try:
                self.logger.info(f"🔍 Searching: {query}")
                results = search_web(query, max_results=5)
                for r in results:
                    if r.confidence < 0.5 or r.url in seen_urls:
                        continue
                    seen_urls.add(r.url)
                    added = self._harvest_page(r.url, extracted, totals)
                    if added > 0:
                        extracted['sources'].append({
                            'url': r.url, 'title': r.title,
                            'type': 'web_search', 'confidence': r.confidence,
                        })
                    time.sleep(random.uniform(0.5, 1.0))
                time.sleep(random.uniform(1.0, 2.0))
            except Exception as e:
                self.logger.debug(f"Search error: {e}")

        return extracted

    # ── Synthesise ───────────────────────────────────────────────────────────
    FIELD_MAP = {
        'history': 'enriched_history',
        'academics': 'enriched_academics',
        'campus': 'enriched_campus_info',
        'student_life': 'enriched_student_life',
    }

    def _synthesise(self, web: Dict, search: Dict, name: str) -> Dict[str, Any]:
        """
        Merge website and search content, with the official website first.

        Generated lead-in sentences such as "Academic offerings at X include:"
        were removed. They were identical across every institution, so they
        added duplicate boilerplate to each page while inflating the length
        the quality gate measured: a section could pass a 100-character
        threshold on roughly 50 characters of real text.
        """
        merged: Dict[str, Any] = {}

        for section, field in self.FIELD_MAP.items():
            candidates: List[str] = []

            website_text = (web.get(section) or '').strip()
            if website_text:
                candidates.append(website_text)

            candidates.extend(search.get(section, []) or [])

            # Whole blocks only, so a section never ends mid-sentence.
            merged[field] = self._join_blocks(candidates, self.SECTION_CHAR_CAP)

        merged['content_sources'] = (
            web.get('sources', []) + search.get('sources', [])
        )[:12]

        return merged

    # A section counts as substantive at this length, and a record needs this
    # many substantive sections plus an overall minimum. Measured on real
    # content rather than on generated boilerplate.
    QUALITY_SECTION_CHARS = 200
    QUALITY_MIN_SECTIONS = 2
    QUALITY_TOTAL_CHARS = 600

    def _section_lengths(self, content: Dict) -> Dict[str, int]:
        return {
            field: len((content.get(field) or '').strip())
            for field in self.FIELD_MAP.values()
        }

    def _meets_quality(self, content: Dict) -> bool:
        lengths = self._section_lengths(content)
        substantive = sum(1 for n in lengths.values() if n >= self.QUALITY_SECTION_CHARS)
        total = sum(lengths.values())
        return substantive >= self.QUALITY_MIN_SECTIONS and total >= self.QUALITY_TOTAL_CHARS

    # A site this rich is accepted even with one weaker section, which avoids
    # spending search budget on pages that are already substantial.
    SEARCH_SKIP_TOTAL = 6000

    def _needs_search(self, totals: Dict[str, int]) -> bool:
        """
        Decide whether to supplement with search results.

        The previous trigger compared a total word count against 150, but the
        quality gate requires breadth across sections. A site yielding plenty
        of words concentrated in one section therefore skipped search and then
        failed the gate. Breadth is now the trigger: search runs until every
        section is substantive, unless the page is already very rich.
        """
        substantive = sum(1 for n in totals.values() if n >= self.QUALITY_SECTION_CHARS)
        if substantive >= len(self.SECTIONS):
            return False
        return sum(totals.values()) < self.SEARCH_SKIP_TOTAL

    # ── SEO ──────────────────────────────────────────────────────────────────
    def _build_seo(self, uni: Dict, content: Dict) -> Dict:
        """Generate university-specific SEO data."""
        name     = uni['name']
        city     = uni.get('city', '')
        state    = uni.get('state', '')
        uni_type = uni.get('type', 'university')

        # Override the school-oriented SEO title templates with university ones
        meta_title = (
            f"{name} — {uni_type.title()} University in {state} | NigerianDirectory"
        )[:60]
        meta_desc = (
            f"Explore {name}, a {uni_type} university in {city}, {state}. "
            f"Discover faculties, programmes, admission requirements, campus life and more."
        )[:160]

        return {
            'meta_title':       meta_title,
            'meta_description': meta_desc,
        }

    # ── Main per-university crawl ─────────────────────────────────────────────
    @with_circuit_breaker('network')
    def crawl_university(self, uni: Dict[str, Any]) -> bool:
        uid   = uni['id']
        name  = uni['name']
        state = uni['state']
        city  = uni.get('city', '')
        url   = uni.get('website', '')

        self.logger.info(f"🎓 Processing: {name} ({state})")
        self.stats['total'] += 1

        try:
            web_content = self._extract_from_website(url, name) if url else {}
            search_content: Dict[str, Any] = {}

            totals = {
                section: len((web_content.get(section) or '').strip())
                for section in self.SECTIONS
            }
            self.logger.info(
                "📄 Website yield: " +
                ", ".join(f"{s}={totals[s]}" for s in self.SECTIONS)
            )

            if self._needs_search(totals):
                self.logger.info("🔎 Supplementing with search engine content")
                search_content = self._search_web(name, state, city, totals)
                if not url:
                    self.stats['search_only'] += 1

            final = self._synthesise(web_content, search_content, name)

            lengths = self._section_lengths(final)
            self.logger.info(
                "🧩 Final content: " +
                ", ".join(f"{k.replace('enriched_', '')}={v}" for k, v in lengths.items()) +
                f", total={sum(lengths.values())}"
            )

            # Quality check
            quality = self.quality.process_school_content(uid, final)
            if quality['action'] == 'reject':
                self.logger.warning(f"❌ Quality rejected: {name}")
                self.stats['quality_rejected'] += 1
                return False

            if not self._meets_quality(final):
                self.logger.warning(f"❌ Insufficient content: {name}")
                self.stats['insufficient'] += 1
                return False

            # Add SEO
            seo = self._build_seo(uni, final)
            final.update(seo)

            # Save
            ok = db_manager.update_school_enrichment(uid, final)
            if ok:
                self.logger.info(f"✅ Saved: {name}")
                self.stats['success'] += 1
                return True
            else:
                self.logger.error(f"❌ DB save failed: {name}")
                self.stats['failed'] += 1
                return False

        except Exception as e:
            self.logger.error(f"💥 Error: {name} — {e}")
            error_reporter.record_error(e, context='university_crawler',
                                        school_name=name, school_id=uid)
            self.stats['failed'] += 1
            return False


# ── Load universities from DB ────────────────────────────────────────────────
def get_universities_for_enrichment(limit: int = 500) -> List[Dict]:
    """Load universities that haven't been enriched yet."""
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, name, slug, type, state, city, area, website,
                       established_year, year_chartered, institution_category
                FROM schools
                WHERE institution_category = 'university'
                  AND (enriched_history IS NULL OR enriched_history = '')
                  AND (enriched_academics IS NULL OR enriched_academics = '')
                ORDER BY
                    CASE WHEN website IS NOT NULL THEN 0 ELSE 1 END,
                    name
                LIMIT %s
            """, (limit,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()


# ── Main orchestrator ────────────────────────────────────────────────────────
def crawl_all_universities():
    print("🎓 NIGERIAN DIRECTORY — UNIVERSITY CRAWLER")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    signal.signal(signal.SIGINT,  signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger = setup_logging()

    crawler = UniversityCrawler()

    logger.info("📚 Loading universities from database...")
    universities = get_universities_for_enrichment(limit=500)
    if not universities:
        logger.info("✅ All universities already enriched — nothing to do.")
        return True

    total = len(universities)
    logger.info(f"✅ Loaded {total} universities for processing")

    start_time = datetime.now()
    batch_size = 10

    for i in range(0, total, batch_size):
        if shutdown_event.is_set():
            logger.info("🛑 Graceful shutdown requested")
            break

        batch      = universities[i:i + batch_size]
        batch_num  = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        logger.info(f"📦 Batch {batch_num}/{total_batches} ({len(batch)} universities)")

        for uni in batch:
            if shutdown_event.is_set():
                break

            success = crawler.crawl_university(uni)

            # Progress report every 5
            processed = crawler.stats['total']
            if processed % 5 == 0:
                pct = processed / total * 100
                elapsed = datetime.now() - start_time
                avg = elapsed.total_seconds() / processed
                eta = start_time + timedelta(seconds=avg * total)
                logger.info(
                    f"📊 Progress: {processed}/{total} ({pct:.1f}%) "
                    f"— ETA: {eta.strftime('%H:%M:%S')}"
                )

            delay = random.uniform(2.0, 4.0) if success else random.uniform(3.0, 6.0)
            time.sleep(delay)

        logger.info(f"✅ Batch {batch_num} completed")

        # Pause between batches
        if not shutdown_event.is_set() and i + batch_size < total:
            time.sleep(2)

    # ── Final report ─────────────────────────────────────────────────────────
    stats  = crawler.stats
    elapsed = datetime.now() - start_time
    rate   = stats['success'] / max(1, stats['total']) * 100

    logger.info("\n" + "=" * 60)
    logger.info("📊 UNIVERSITY CRAWL COMPLETE")
    logger.info("=" * 60)
    logger.info(f"   Total processed : {stats['total']}")
    logger.info(f"   Success          : {stats['success']} ({rate:.1f}%)")
    logger.info(f"   Failed           : {stats['failed']}")
    logger.info(f"   Quality rejected : {stats['quality_rejected']}")
    logger.info(f"   Insufficient     : {stats['insufficient']}")
    logger.info(f"   Total time       : {elapsed}")
    logger.info(f"   Avg per uni      : {elapsed.total_seconds()/max(1,stats['total']):.1f}s")

    if rate >= 80:
        logger.info("🎯 SUCCESS: ≥80% success rate!")
    elif rate >= 60:
        logger.info("⚠️  PARTIAL: 60-80% success — some issues to review")
    else:
        logger.info("❌ NEEDS ATTENTION: <60% success rate")

    print(f"\n🎉 Done — {stats['success']}/{stats['total']} universities enriched ({rate:.1f}%)")
    return stats['success'] > 0


if __name__ == '__main__':
    crawl_all_universities()
