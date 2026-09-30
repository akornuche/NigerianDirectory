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

    # ── Website extraction ───────────────────────────────────────────────────
    def _extract_from_website(self, url: str, name: str) -> Dict[str, Any]:
        """Extract content from the university's own website."""
        result = {'history': '', 'academics': '', 'campus': '', 'student_life': '', 'sources': []}
        try:
            r = self.session.get(url, timeout=15)
            if r.status_code != 200:
                return result
            soup = BeautifulSoup(r.text, 'html.parser')
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'menu']):
                tag.decompose()
            body = soup.find('main') or soup.find('article') or soup.find('body')
            if not body:
                return result
            paras = [
                p.get_text(' ', strip=True)
                for p in body.find_all('p')
                if len(p.get_text(' ', strip=True)) > 60
            ]
            for para in paras:
                lo = para.lower()
                scores = {
                    'history':     sum(1 for k in self.HISTORY_KW  if k in lo),
                    'academics':   sum(1 for k in self.ACADEMIC_KW if k in lo),
                    'campus':      sum(1 for k in self.CAMPUS_KW   if k in lo),
                    'student_life':sum(1 for k in self.LIFE_KW     if k in lo),
                }
                best = max(scores, key=scores.get)
                if scores[best] > 0 and len(result[best]) < 800:
                    result[best] += (' ' + para[:400]).strip()
            result['sources'].append({'url': url, 'title': name, 'type': 'official_website'})
            self.stats['website_primary'] += 1
        except Exception as e:
            self.logger.debug(f"Website extract error {url}: {e}")
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

    def _search_web(self, name: str, state: str, city: str) -> Dict[str, Any]:
        """Run search queries and extract content from results."""
        extracted = {'history': [], 'academics': [], 'campus': [], 'student_life': [], 'sources': []}
        seen_urls = set()

        for query in self._build_queries(name, state, city):
            try:
                self.logger.info(f"🔍 Searching: {query}")
                results = search_web(query, max_results=5)
                for r in results:
                    if r.confidence < 0.5 or r.url in seen_urls:
                        continue
                    seen_urls.add(r.url)
                    # Fetch page
                    try:
                        resp = self.session.get(r.url, timeout=10)
                        if resp.status_code != 200:
                            continue
                        s = BeautifulSoup(resp.text, 'html.parser')
                        for tag in s(['script','style','nav','footer','header','aside']):
                            tag.decompose()
                        body = s.find('main') or s.find('article') or s.find('body')
                        if not body:
                            continue
                        paras = [
                            p.get_text(' ', strip=True)
                            for p in body.find_all('p')
                            if len(p.get_text(' ', strip=True)) > 60
                        ]
                        for para in paras:
                            lo = para.lower()
                            scores = {
                                'history':     sum(1 for k in self.HISTORY_KW  if k in lo),
                                'academics':   sum(1 for k in self.ACADEMIC_KW if k in lo),
                                'campus':      sum(1 for k in self.CAMPUS_KW   if k in lo),
                                'student_life':sum(1 for k in self.LIFE_KW     if k in lo),
                            }
                            best = max(scores, key=scores.get)
                            if scores[best] > 0:
                                current = ' '.join(extracted[best])
                                if len(current) < 800:
                                    extracted[best].append(para[:400])
                        extracted['sources'].append({
                            'url': r.url, 'title': r.title,
                            'type': 'web_search', 'confidence': r.confidence,
                        })
                        time.sleep(random.uniform(0.5, 1.0))
                    except Exception:
                        pass
                time.sleep(random.uniform(1.0, 2.0))
            except Exception as e:
                self.logger.debug(f"Search error: {e}")

        return extracted

    # ── Synthesise ───────────────────────────────────────────────────────────
    def _synthesise(self, web: Dict, search: Dict, name: str) -> Dict[str, Any]:
        """Merge website and search content, website takes priority."""
        def join(field_key, search_key, prefix):
            parts = []
            if web.get(field_key):
                parts.append(web[field_key])
            remaining = 800 - len(' '.join(parts))
            if remaining > 100 and search.get(search_key):
                parts.extend(search[search_key][:3])
            text = ' '.join(parts)[:800]
            return f"{prefix}{text}" if text else ''

        return {
            'enriched_history':     join('history',     'history',     f'{name} has a rich academic heritage. '),
            'enriched_academics':   join('academics',   'academics',   f'Academic offerings at {name} include: '),
            'enriched_campus_info': join('campus',      'campus',      f'The {name} campus provides: '),
            'enriched_student_life':join('student_life','student_life',f'Student life at {name} encompasses: '),
            'content_sources': (web.get('sources', []) + search.get('sources', []))[:10],
        }

    def _meets_quality(self, content: Dict) -> bool:
        """At least 2 sections must have >100 chars."""
        fields = [
            content.get('enriched_history', ''),
            content.get('enriched_academics', ''),
            content.get('enriched_campus_info', ''),
            content.get('enriched_student_life', ''),
        ]
        return sum(1 for f in fields if len(f) > 100) >= 2

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
            web_content    = self._extract_from_website(url, name) if url else {}
            search_content = {}

            # Judge if website was enough
            web_words = sum(len(web_content.get(k, '').split())
                            for k in ('history','academics','campus','student_life'))
            if web_words < 150:
                self.logger.info("🔎 Supplementing with search engine content")
                search_content = self._search_web(name, state, city)
                if not url:
                    self.stats['search_only'] += 1

            final = self._synthesise(web_content, search_content, name)

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
