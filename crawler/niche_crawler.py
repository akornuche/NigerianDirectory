"""
Generic Niche Crawler
======================
A single content-enrichment engine driven by a NicheConfig (see
niche_config.py), instead of one hand-copied Python class per vertical.

This is the extraction of what used to be UniversityCrawler. Nearly none of
that class's logic was actually university-specific: sentence-safe
truncation, div/li/p harvesting, tie-break classification, subpage
discovery, and search retry/backoff all operated purely on keyword lists
and section names supplied to it. The only genuinely university-specific
pieces were the keyword lists themselves, the subpage hints, the SEO
templates, and the institution_category filter -- all of which now live in
niche_config.py.

university_crawler.py is kept as a thin, backward-compatible wrapper around
NicheCrawler(UNIVERSITY) so existing scripts (crawl_one.py, the
university_crawl_*.log naming, admin tooling that imports
UniversityCrawler) continue to work unchanged.
"""

import logging
import random
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from search_engines import search_web
from database import db_manager
from seo_optimizer import SEOOptimizer
from content_quality import ContentQualityManager
from circuit_breaker import with_circuit_breaker
from error_reporter import error_reporter
from niche_config import NicheConfig, SECTION_KEYS


class NicheCrawler:
    """Crawls and enriches content for any institution niche."""

    # ── Tunables shared across every niche ──────────────────────────────────
    SECTION_CHAR_CAP = 2600
    MIN_BLOCK_LEN = 45
    MAX_BLOCK_LEN = 700
    MAX_SUBPAGES = 10
    PAGE_TIMEOUT = 20

    # Third-party pages must clear the higher bar; the institution's own
    # domain is treated as inherently on-topic. See niche_config.py's module
    # docstring and the classification note below for why.
    MIN_KEYWORD_HITS = 2
    MIN_KEYWORD_HITS_OFFICIAL = 1

    SUBPAGE_EXCLUSIONS = (
        '/news', '/event', '/blog', '/press', '/vacanc', '/career',
        '/tender', '/notice', '/announcement', '/gallery', '/login',
        '/portal', '/webmail', '/search', '/tag/', '/category/',
        '/author/', '/archive', '/feed',
    )

    BOILERPLATE_MARKERS = (
        'cookie', 'javascript', 'all rights reserved', 'copyright',
        'read more', 'click here', 'sign in', 'log in', 'subscribe',
        'follow us', 'privacy policy', 'terms of use', 'skip to content',
    )

    # Encyclopaedia and reference-list artefacts. Wikipedia mirrors are a
    # frequent search result and their citation blocks were being stored as
    # institutional history before this filter existed.
    CITATION_MARKERS = (
        'archived from the original', 'retrieved ', 'citation needed',
        'edit source', 'jump to navigation', 'this article',
        'doi:', 'isbn', 'issn', 'arxiv', 'pmid',
        'wayback machine', 'archived copy', 'original on',
    )

    SENTENCE_ENDINGS = ('. ', '! ', '? ', '." ', '!" ', '?" ', '.\n')

    NON_TERMINAL_ABBREVIATIONS = (
        'prof.', 'dr.', 'mr.', 'mrs.', 'ms.', 'st.', 'no.', 'vol.', 'ed.',
        'e.g.', 'i.e.', 'etc.', 'jr.', 'sr.', 'rev.', 'hon.', 'engr.',
    )

    FIELD_MAP = {
        'history': 'enriched_history',
        'academics': 'enriched_academics',
        'campus': 'enriched_campus_info',
        'student_life': 'enriched_student_life',
    }

    # A section counts as substantive at this length, and a record needs
    # this many substantive sections plus an overall minimum. Measured on
    # real content rather than on generated boilerplate.
    QUALITY_SECTION_CHARS = 200
    QUALITY_MIN_SECTIONS = 2
    QUALITY_TOTAL_CHARS = 600

    # A site this rich is accepted even with one weaker section, which
    # avoids spending search budget on pages that are already substantial.
    SEARCH_SKIP_TOTAL = 6000

    def __init__(self, niche: NicheConfig):
        self.niche = niche
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
        self.seo = SEOOptimizer()
        self.quality = ContentQualityManager()
        self.logger = logging.getLogger(f'niche_crawler.{niche.key}')
        self.stats = {
            'total': 0, 'success': 0, 'failed': 0,
            'website_primary': 0, 'search_only': 0,
            'quality_rejected': 0, 'insufficient': 0,
        }

    # ── Sentence-safe truncation ─────────────────────────────────────────────
    @classmethod
    def _truncate_at_sentence(cls, text: str, limit: int) -> str:
        """
        Trim text to a budget without cutting a sentence in half.

        Slicing on a raw character count left fragments such as
        "...report to Council an" and "...have these facilities: Ayodele Fa"
        on published pages.

        Text already inside the budget is returned untouched. An earlier
        version also required a trailing terminator here, which silently
        discarded most harvested prose because web copy frequently omits a
        final period, dropping yield to zero.
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
        never cut mid-sentence at the section boundary. Blocks that do not
        fit are skipped rather than sliced.
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

        Reading only <p> tags discarded 23 to 56 div elements of over 200
        characters per homepage in measurement, because these sites place
        prose in divs, list items and sections.

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

            if text.startswith(('↑', '^', '[')) or '↑' in text[:40]:
                continue

            if lowered.startswith(('theme:', 'date:', 'venue:', 'time:', 'posted on')):
                continue

            if text.count(' ') < 6:
                continue

            digits = sum(1 for ch in text if ch.isdigit())
            if digits / max(len(text), 1) > 0.25:
                continue

            trimmed = self._truncate_at_sentence(text, self.MAX_BLOCK_LEN)
            if not trimmed:
                continue

            blocks.append(trimmed)

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
        Choose which section a block belongs to, using this niche's
        keyword lists.

        Scores are normalised by keyword-list length so that sections with
        longer vocabularies are not favoured. Ties go to whichever tied
        section holds the least content, which both avoids a fixed bias
        toward one section and improves section breadth.
        """
        lowered = text.lower()
        keyword_sets = self.niche.keywords

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
        # one broad term was enough to file unrelated content under the
        # wrong section. Pages on the institution's own domain are about the
        # institution by definition, so they use a lower bar.
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
        Find internal pages likely to carry section content, using this
        niche's subpage hints.

        A homepage is a landing page; the real descriptive content for most
        institutions lives on dedicated subpages. Crawling only the root was
        the single largest source of missing content when this was first
        measured for universities.
        """
        found: List[str] = []
        try:
            response = self.session.get(base_url, timeout=self.PAGE_TIMEOUT)
            if response.status_code != 200:
                return found

            soup = BeautifulSoup(response.text, 'html.parser')
            base_domain = urlparse(base_url).netloc.lower().replace('www.', '')

            all_hints = [h for hints in self.niche.subpage_hints.values() for h in hints]
            scored = []

            for anchor in soup.find_all('a', href=True):
                href = anchor['href'].strip()
                if href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
                    continue

                absolute = urljoin(base_url, href)
                parsed = urlparse(absolute)

                if parsed.scheme not in ('http', 'https'):
                    continue

                domain = parsed.netloc.lower().replace('www.', '')
                if domain != base_domain:
                    continue

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
        accumulator: Dict[str, List[str]] = {s: [] for s in SECTION_KEYS}
        totals: Dict[str, int] = {s: 0 for s in SECTION_KEYS}
        sources: List[Dict[str, Any]] = []

        if not url:
            return {**{s: '' for s in SECTION_KEYS}, 'sources': []}

        official_hits = self.MIN_KEYWORD_HITS_OFFICIAL

        if self._harvest_page(url, accumulator, totals, official_hits) > 0 or any(totals.values()):
            sources.append({'url': url, 'title': name, 'type': 'official_website'})

        subpages = self._discover_subpages(url)
        if subpages:
            self.logger.info(f"🔗 Found {len(subpages)} candidate subpages")

        for link in subpages:
            if sum(totals.values()) >= self.SECTION_CHAR_CAP * len(SECTION_KEYS):
                break
            if self._harvest_page(link, accumulator, totals, official_hits) > 0:
                sources.append({'url': link, 'title': name, 'type': 'official_website'})
            time.sleep(random.uniform(0.4, 0.9))

        if any(totals.values()):
            self.stats['website_primary'] += 1

        result = {
            s: self._join_blocks(accumulator[s], self.SECTION_CHAR_CAP)
            for s in SECTION_KEYS
        }
        result['sources'] = sources
        return result

    # ── Search engine queries ────────────────────────────────────────────────
    def _build_queries(self, name: str, state: str, city: str) -> List[str]:
        city_or_state = city or state
        return [
            template.format(name=name, state=state, city=city, city_or_state=city_or_state)
            for template in self.niche.query_templates
        ]

    def _search_web(self, name: str, state: str, city: str,
                    totals: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """
        Run search queries and harvest content from the results.

        Accepts the running per-section character totals so that search
        tops up whichever sections the official website left thin, rather
        than refilling sections that are already complete.
        """
        extracted: Dict[str, Any] = {s: [] for s in SECTION_KEYS}
        extracted['sources'] = []
        if totals is None:
            totals = {s: 0 for s in SECTION_KEYS}
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
    def _synthesise(self, web: Dict, search: Dict, name: str) -> Dict[str, Any]:
        """
        Merge website and search content, with the official website first.

        No generated lead-in sentences are added. An earlier version
        prepended boilerplate such as "Academic offerings at X include:" to
        every section; it was identical across every institution and
        inflated the length the quality gate measured, letting a section
        pass on roughly 50 characters of real text.
        """
        merged: Dict[str, Any] = {}

        for section, field_name in self.FIELD_MAP.items():
            candidates: List[str] = []

            website_text = (web.get(section) or '').strip()
            if website_text:
                candidates.append(website_text)

            candidates.extend(search.get(section, []) or [])

            merged[field_name] = self._join_blocks(candidates, self.SECTION_CHAR_CAP)

        merged['content_sources'] = (
            web.get('sources', []) + search.get('sources', [])
        )[:12]

        return merged

    def _section_lengths(self, content: Dict) -> Dict[str, int]:
        return {
            field_name: len((content.get(field_name) or '').strip())
            for field_name in self.FIELD_MAP.values()
        }

    def _meets_quality(self, content: Dict) -> bool:
        lengths = self._section_lengths(content)
        substantive = sum(1 for n in lengths.values() if n >= self.QUALITY_SECTION_CHARS)
        total = sum(lengths.values())
        return substantive >= self.QUALITY_MIN_SECTIONS and total >= self.QUALITY_TOTAL_CHARS

    def _needs_search(self, totals: Dict[str, int]) -> bool:
        """
        Decide whether to supplement with search results.

        Triggering on total word count let a site with words concentrated
        in one section skip search and then fail the quality gate, which
        requires breadth. Breadth is the trigger here: search runs until
        every section is substantive, unless the page is already very rich.
        """
        substantive = sum(1 for n in totals.values() if n >= self.QUALITY_SECTION_CHARS)
        if substantive >= len(SECTION_KEYS):
            return False
        return sum(totals.values()) < self.SEARCH_SKIP_TOTAL

    # ── SEO ──────────────────────────────────────────────────────────────────
    def _build_seo(self, institution: Dict, content: Dict) -> Dict:
        """Generate SEO fields using this niche's templates."""
        name = institution['name']
        city = institution.get('city', '')
        state = institution.get('state', '')
        inst_type = institution.get('type', self.niche.key)

        meta_title = self.niche.seo_title_template.format(
            name=name, type=inst_type.title(), state=state,
            city=city, display_name=self.niche.display_name,
        )[:60]

        meta_desc = self.niche.seo_description_template.format(
            name=name, type=inst_type, state=state, city=city,
            type_label=self.niche.type_label,
        )[:160]

        return {
            'meta_title': meta_title,
            'meta_description': meta_desc,
        }

    # Suffixes that reliably indicate a Nigerian institutional domain rather
    # than a news article, Wikipedia mirror, or social profile about the
    # institution. .gov.ng is deliberately excluded: it matches an
    # institution's overseeing ministry or state government portal just as
    # readily as the institution's own site, and did so incorrectly in
    # testing (University of Abuja resolved to fcta.gov.ng, the Federal
    # Capital Territory Administration's own site, not uniabuja.edu.ng).
    OFFICIAL_DOMAIN_HINTS = ('.edu.ng', '.org.ng')

    # Domains that are never an institution's own site even if they rank
    # first for a query about it.
    EXCLUDED_DISCOVERY_DOMAINS = (
        'wikipedia.org', 'facebook.com', 'twitter.com', 'x.com',
        'instagram.com', 'linkedin.com', 'youtube.com', 'jamb.gov.ng',
        'legit.ng', 'edurank.org',
    )

    # Generic words stripped before comparing an institution's name against
    # a candidate domain, so "University of Abuja" matches "uniabuja" via
    # its distinctive word rather than requiring an exact substring.
    GENERIC_NAME_WORDS = frozenset({
        'university', 'of', 'state', 'federal', 'the', 'and',
        'college', 'institute', 'technology', 'science', 'sciences',
        'national', 'nigeria', 'polytechnic',
    })

    def _domain_matches_name(self, domain: str, name: str) -> bool:
        """
        Require some lexical connection between the institution's name and
        a candidate domain, beyond just carrying an .edu.ng suffix.

        Without this, any .edu.ng result for a loosely-matched query could
        be accepted as a given institution's site. Nigerian institutional
        domains follow a few recognisable patterns and this checks for any
        of them:

          - a distinctive word appears whole in the domain
            ("ibadan" in "ui.edu.ng" -- actually does not apply here, see
            acronym case below; "unilag" contains "lag" from "Lagos")
          - the domain is built from initials of the significant words
            (University of Ibadan -> ui; Ahmadu Bello University -> abu;
            Bayero University Kano -> buk; Lagos University Teaching
            Hospital -> luth)
          - the domain contracts "uni" + a distinctive word
            (University of Benin -> uniben; University of Abuja -> uniabuja)
          - a distinctive word's first few letters appear in the domain
            (Nnamdi Azikiwe University -> unizik, matched on "azikiwe")

        This is deliberately permissive rather than exact, since Nigerian
        institutions do not follow one single naming convention, but it
        still rejects a domain that shares nothing with the name at all.
        """
        # The leading label of the registrable domain, e.g. "uniabuja" from
        # "www.uniabuja.edu.ng". A leading "www" must be dropped first or
        # every www-prefixed result (the normal case for a search engine)
        # is compared against "www" instead of the actual institution name,
        # which rejects correct domains outright -- found when this exact
        # case caused uniabuja.edu.ng itself to be discarded.
        domain_lower = domain.lower()
        if domain_lower.startswith('www.'):
            domain_lower = domain_lower[4:]
        domain_core = domain_lower.split('.')[0]
        words = [w for w in re.split(r'\W+', name.lower()) if w and w not in self.GENERIC_NAME_WORDS]

        if not words:
            return False

        # Whole-word or short-prefix containment for any distinctive word.
        for word in words:
            if word in domain_core:
                return True
            if len(word) >= 4 and word[:4] in domain_core:
                return True

        # Acronym built from the first letter of each word, excluding only
        # filler words ("of", "and") that institutions themselves drop when
        # abbreviating, e.g. "Ahmadu Bello University" -> "abu", "Bayero
        # University Kano" -> "buk", "University of Ibadan" -> "ui".
        filler = {'of', 'and', 'the'}
        all_words = [w for w in re.split(r'\W+', name.lower()) if w and w not in filler]
        acronym = ''.join(w[0] for w in all_words if w)
        if len(acronym) >= 2 and acronym in domain_core:
            return True

        # "uni" + some leading portion of a distinctive word, a very common
        # Nigerian pattern where the word is contracted to 3-6 letters
        # (University of Lagos -> unilag; University of Benin -> uniben).
        # Checking a range of prefix lengths rather than one fixed length
        # avoids guessing exactly how much of the word was kept.
        significant = [w for w in all_words if w not in self.GENERIC_NAME_WORDS]
        for word in significant:
            if not domain_core.startswith('uni'):
                continue
            remainder = domain_core[3:]
            for prefix_len in range(min(3, len(word)), len(word) + 1):
                if remainder.startswith(word[:prefix_len]):
                    return True

        # Leading few letters of any significant word appearing anywhere in
        # the domain, which catches contractions like "Azikiwe" -> "zik" in
        # "unizik" (the "a" is dropped, so this checks interior substrings
        # of the word, not just its own prefix).
        for word in significant:
            if len(word) < 5:
                continue
            for start in range(len(word) - 2):
                fragment = word[start:start + 3]
                if fragment in domain_core:
                    return True

        return False

    def _discover_website(self, name: str, state: str) -> Optional[str]:
        """
        Find and verify an institution's official website when none is on
        record.

        Roughly a third of the seeded university roster had no website at
        all, which meant those records could only ever go through the
        weaker, search-only path -- the opposite of what measurement showed
        works best. A single targeted query plus a liveness check lets most
        of them use the stronger website-first path instead, and the result
        is persisted so future re-crawls skip this step entirely.
        """
        query = f'"{name}" {state} Nigeria official website'
        try:
            results = search_web(query, max_results=5)
        except Exception as exc:
            self.logger.debug(f"Website discovery search failed: {exc}")
            return None

        candidates = [r for r in results if r.confidence >= 0.5 and r.domain]
        candidates.sort(key=lambda r: r.confidence, reverse=True)

        for result in candidates:
            domain = result.domain
            if any(excluded in domain for excluded in self.EXCLUDED_DISCOVERY_DOMAINS):
                continue
            if not any(hint in domain for hint in self.OFFICIAL_DOMAIN_HINTS):
                continue
            if not self._domain_matches_name(domain, name):
                self.logger.debug(f"Discarding unrelated domain {domain} for {name}")
                continue

            # Try both with and without "www.". Some Nigerian institutional
            # sites issue a TLS certificate covering only one form, found
            # when uniabuja.edu.ng (bare) failed with a certificate
            # hostname mismatch while www.uniabuja.edu.ng was valid.
            bare = domain_lower if (domain_lower := domain.lower().replace('www.', '')) else domain
            for candidate_url in (f"https://{bare}", f"https://www.{bare}"):
                try:
                    response = self.session.get(candidate_url, timeout=self.PAGE_TIMEOUT)
                    if response.status_code == 200:
                        self.logger.info(f"🌐 Discovered website: {candidate_url}")
                        return candidate_url
                except Exception:
                    continue

        return None

    def _persist_discovered_website(self, inst_id: int, url: str) -> None:
        """Save a newly discovered website so future crawls do not repeat
        the discovery search for the same institution."""
        conn = db_manager.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE schools SET website = %s, updated_at = NOW() WHERE id = %s",
                    (url, inst_id),
                )
                conn.commit()
        except Exception as exc:
            conn.rollback()
            self.logger.warning(f"Could not persist discovered website: {exc}")
        finally:
            conn.close()

    # ── Main per-institution crawl ───────────────────────────────────────────
    @with_circuit_breaker('network')
    def crawl_institution(self, institution: Dict[str, Any]) -> bool:
        inst_id = institution['id']
        name = institution['name']
        state = institution['state']
        city = institution.get('city', '')
        url = institution.get('website', '')

        self.logger.info(f"🏷️  Processing: {name} ({state})")
        self.stats['total'] += 1

        try:
            if not url:
                url = self._discover_website(name, state) or ''
                if url:
                    self._persist_discovered_website(inst_id, url)

            web_content = self._extract_from_website(url, name) if url else {}
            search_content: Dict[str, Any] = {}

            totals = {
                section: len((web_content.get(section) or '').strip())
                for section in SECTION_KEYS
            }
            self.logger.info(
                "📄 Website yield: " +
                ", ".join(f"{s}={totals[s]}" for s in SECTION_KEYS)
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

            quality = self.quality.process_school_content(inst_id, final)
            if quality['action'] == 'reject':
                self.logger.warning(f"❌ Quality rejected: {name}")
                self.stats['quality_rejected'] += 1
                return False

            # NEW POLICY: Save EVERYTHING that passes basic validation
            # Don't reject based on content length - we can enhance later
            # Just log if content is sparse
            if not self._meets_quality(final):
                self.logger.warning(f"⚠️  Sparse content: {name} (will save anyway)")
                self.stats['insufficient'] += 1

            seo = self._build_seo(institution, final)
            final.update(seo)

            ok = db_manager.update_school_enrichment(inst_id, final)
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
            error_reporter.record_error(
                e, context=f'niche_crawler.{self.niche.key}',
                school_name=name, school_id=inst_id,
            )
            self.stats['failed'] += 1
            return False


# ── Load institutions from DB ────────────────────────────────────────────────
def get_institutions_for_enrichment(niche: NicheConfig, limit: int = 500) -> List[Dict]:
    """Load institutions of this niche that haven't been enriched yet."""
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, slug, type, state, city, area, website,
                       established_year, institution_category
                FROM schools
                WHERE institution_category = %s
                  AND (enriched_history IS NULL OR enriched_history = '')
                  AND (enriched_academics IS NULL OR enriched_academics = '')
                ORDER BY
                    CASE WHEN website IS NOT NULL THEN 0 ELSE 1 END,
                    name
                LIMIT %s
                """,
                (niche.institution_category, limit),
            )
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()
