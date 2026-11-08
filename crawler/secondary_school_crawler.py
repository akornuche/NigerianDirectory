"""
Secondary School Crawler for Nigerian Directory
================================================
Backward-compatible wrapper around the generic NicheCrawler, fixed to the
SECONDARY_SCHOOL niche config (see niche_config.py).

This replaces the old ContentCrawler with a configuration-driven approach,
leveraging the same robust extraction and synthesis logic that powers the
universities crawler.

SecondaryShooolCrawler is kept here with a similar API to UniversityCrawler
so that existing scripts and logging conventions continue to work unchanged.
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

from niche_config import SECONDARY_SCHOOL
from niche_crawler import NicheCrawler, get_institutions_for_enrichment
import logging

# ── Graceful shutdown ───────────────────────────────────────────────────────
shutdown_event = Event()


def signal_handler(signum, frame):
    print(f"\nShutdown signal received")
    shutdown_event.set()


# ── Logging setup ────────────────────────────────────────────────────────────
def setup_logging():
    log_filename = f'secondary_school_crawl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
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
    print(f'Logging to: {log_filename}', flush=True)
    return logging.getLogger('secondary_school_crawler')


class SecondaryShooolCrawler(NicheCrawler):
    """
    Secondary school-flavoured NicheCrawler.

    HISTORY_KW / ACADEMIC_KW / CAMPUS_KW / LIFE_KW are exposed as plain
    attributes (similar to UniversityCrawler) for compatibility with any
    legacy code that accesses them directly.
    """

    def __init__(self):
        super().__init__(SECONDARY_SCHOOL)
        self.logger = logging.getLogger('secondary_school_crawler')

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

    def crawl_school(self, school: Dict) -> bool:
        """Alias for backward compatibility."""
        return self.crawl_institution(school)


# ── Load secondary schools from DB ──────────────────────────────────────────
def get_secondary_schools_for_enrichment(limit: int = 500) -> List[Dict]:
    """Load secondary schools that haven't been enriched yet."""
    return get_institutions_for_enrichment(SECONDARY_SCHOOL, limit=limit)


# ── Main orchestrator ────────────────────────────────────────────────────────
def crawl_all_secondary_schools():
    print("[SECONDARY SCHOOL CRAWLER] NIGERIAN DIRECTORY - SECONDARY SCHOOL CRAWLER (RECRAWL)")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger = setup_logging()

    crawler = SecondaryShooolCrawler()

    logger.info("🏫 Loading secondary schools from database...")
    schools = get_secondary_schools_for_enrichment(limit=500)
    if not schools:
        logger.info("✅ All secondary schools already enriched — nothing to do.")
        return True

    total = len(schools)
    logger.info(f"✅ Loaded {total} secondary schools for reprocessing")

    start_time = datetime.now()
    batch_size = 10

    for i in range(0, total, batch_size):
        if shutdown_event.is_set():
            logger.info("🛑 Graceful shutdown requested")
            break

        batch = schools[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        logger.info(f"📦 Batch {batch_num}/{total_batches} ({len(batch)} schools)")

        for school in batch:
            if shutdown_event.is_set():
                break

            success = crawler.crawl_institution(school)

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
    logger.info("📊 SECONDARY SCHOOL RECRAWL COMPLETE")
    logger.info("=" * 60)
    logger.info(f"   Total processed     : {stats['total']}")
    logger.info(f"   Success             : {stats['success']} ({rate:.1f}%)")
    logger.info(f"   Failed              : {stats['failed']}")
    logger.info(f"   Quality rejected    : {stats['quality_rejected']}")
    logger.info(f"   Insufficient        : {stats['insufficient']}")
    logger.info(f"   Total time          : {elapsed}")
    logger.info(f"   Avg per school      : {elapsed.total_seconds()/max(1,stats['total']):.1f}s")

    if rate >= 80:
        logger.info("🎯 SUCCESS: ≥80% success rate!")
    elif rate >= 60:
        logger.info("⚠️  PARTIAL: 60-80% success — some issues to review")
    else:
        logger.info("❌ NEEDS ATTENTION: <60% success rate")

    print(f"\nDone — {stats['success']}/{stats['total']} secondary schools reprocessed ({rate:.1f}%)")
    return stats['success'] > 0


if __name__ == '__main__':
    crawl_all_secondary_schools()
