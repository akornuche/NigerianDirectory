"""
University Crawler for Nigerian Directory
==========================================
Backward-compatible wrapper around the generic NicheCrawler, fixed to the
UNIVERSITY niche config (see niche_config.py).

This file used to contain the entire crawling engine with "university"
hardcoded throughout -- keyword lists, subpage hints, SEO templates, and the
institution_category filter all mixed in with logic that was actually
generic (sentence-safe truncation, div/li/p harvesting, tie-break
classification, subpage discovery, search retry/backoff). That logic has
moved to niche_crawler.py, and the university-specific data has moved to
niche_config.py's UNIVERSITY config, so a hospital, restaurant, or any other
future vertical becomes a ~30-line config entry rather than a second copy of
this ~500-line file.

UniversityCrawler is kept here, with the same public API, purely so that
existing scripts (crawl_one.py, diagnose_enrichment.py, test_truncation.py)
and the university_crawl_*.log naming convention keep working unchanged.
New niches should use NicheCrawler(get_niche('...')) directly rather than
adding another wrapper like this one.
"""

import os
import random
import signal
import sys
import time
from datetime import datetime, timedelta
from threading import Event
from typing import Dict, List

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from niche_config import UNIVERSITY
from niche_crawler import NicheCrawler, get_institutions_for_enrichment
import logging

# ── Graceful shutdown ───────────────────────────────────────────────────────
shutdown_event = Event()


def signal_handler(signum, frame):
    print(f"\n🛑 Shutdown signal received")
    shutdown_event.set()


# ── Logging setup ────────────────────────────────────────────────────────────
def setup_logging():
    log_filename = f'university_crawl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    file_handler = logging.FileHandler(log_filename, mode='w', encoding='utf-8')
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


class UniversityCrawler(NicheCrawler):
    """
    University-flavoured NicheCrawler.

    HISTORY_KW / ACADEMIC_KW / CAMPUS_KW / LIFE_KW are exposed as plain
    attributes (rather than requiring callers to reach into
    self.niche.keywords) because diagnose_enrichment.py reads them directly
    to reproduce classification scoring for its own reporting.
    """

    def __init__(self):
        super().__init__(UNIVERSITY)
        self.logger = logging.getLogger('university_crawler')

    @property
    def HISTORY_KW(self) -> List[str]:
        return self.niche.keywords['history']

    @property
    def ACADEMIC_KW(self) -> List[str]:
        return self.niche.keywords['academics']

    @property
    def CAMPUS_KW(self) -> List[str]:
        return self.niche.keywords['campus']

    @property
    def LIFE_KW(self) -> List[str]:
        return self.niche.keywords['student_life']

    def crawl_university(self, uni: Dict) -> bool:
        """Alias retained for callers written against the old method name."""
        return self.crawl_institution(uni)


# ── Load universities from DB ────────────────────────────────────────────────
def get_universities_for_enrichment(limit: int = 500) -> List[Dict]:
    """Load universities that haven't been enriched yet."""
    return get_institutions_for_enrichment(UNIVERSITY, limit=limit)


# ── Main orchestrator ────────────────────────────────────────────────────────
def crawl_all_universities():
    print("🎓 NIGERIAN DIRECTORY — UNIVERSITY CRAWLER")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    signal.signal(signal.SIGINT, signal_handler)
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

        batch = universities[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        logger.info(f"📦 Batch {batch_num}/{total_batches} ({len(batch)} universities)")

        for uni in batch:
            if shutdown_event.is_set():
                break

            success = crawler.crawl_institution(uni)

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

        if not shutdown_event.is_set() and i + batch_size < total:
            time.sleep(2)

    stats = crawler.stats
    elapsed = datetime.now() - start_time
    rate = stats['success'] / max(1, stats['total']) * 100

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
