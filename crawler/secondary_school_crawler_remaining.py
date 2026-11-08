"""
Secondary School Crawler - REMAINING SCHOOLS ONLY
===================================================
Process ONLY the schools that haven't been attempted yet.
Skip the 266 already processed (85 saved + 174 insufficient + 7 rejected).
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
from niche_crawler import NicheCrawler
from database import db_manager
import logging

# ── Graceful shutdown ───────────────────────────────────────────────────────
shutdown_event = Event()


def signal_handler(signum, frame):
    print(f"\nShutdown signal received")
    shutdown_event.set()


# ── Logging setup ────────────────────────────────────────────────────────────
def setup_logging():
    log_filename = f'secondary_school_crawl_remaining_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
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
    """Secondary school crawler using NicheCrawler."""

    def __init__(self):
        super().__init__(SECONDARY_SCHOOL)
        self.logger = logging.getLogger('secondary_school_crawler')


# ── Load ONLY unprocessed schools ──────────────────────────────────────────
def get_unprocessed_secondary_schools(limit: int = 500) -> List[Dict]:
    """
    Load ONLY secondary schools that have NOT been attempted yet.
    Excludes all schools from the previous crawl run.
    """
    # Load list of already-processed schools
    processed_names = set()
    try:
        with open('processed_schools_list.txt', 'r', encoding='utf-8') as f:
            processed_names = {line.strip() for line in f if line.strip()}
    except FileNotFoundError:
        pass
    
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, slug, type, state, city, area, website,
                       established_year, institution_category
                FROM schools
                WHERE institution_category = 'school'
                  AND (enriched_history IS NULL OR enriched_history = '')
                  AND (enriched_academics IS NULL OR enriched_academics = '')
                  AND (enriched_campus_info IS NULL OR enriched_campus_info = '')
                  AND (enriched_student_life IS NULL OR enriched_student_life = '')
                ORDER BY
                    CASE WHEN website IS NOT NULL THEN 0 ELSE 1 END,
                    name
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
            all_schools = [dict(r) for r in rows]
            
            # Filter out schools that were already processed
            remaining_schools = [
                s for s in all_schools 
                if s['name'] not in processed_names
            ]
            
            return remaining_schools
    finally:
        conn.close()


# ── Main orchestrator ────────────────────────────────────────────────────────
def crawl_remaining_secondary_schools():
    print("\n[SECONDARY SCHOOL CRAWLER] NIGERIAN DIRECTORY - REMAINING SCHOOLS ONLY")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger = setup_logging()

    crawler = SecondaryShooolCrawler()

    logger.info("Loading UNPROCESSED secondary schools from database...")
    schools = get_unprocessed_secondary_schools(limit=500)
    if not schools:
        logger.info("No unprocessed schools found - all done!")
        return True

    total = len(schools)
    logger.info(f"Loaded {total} UNPROCESSED secondary schools for processing")

    start_time = datetime.now()
    batch_size = 10

    for i in range(0, total, batch_size):
        if shutdown_event.is_set():
            logger.info("Graceful shutdown requested")
            break

        batch = schools[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        logger.info(f"Batch {batch_num}/{total_batches} ({len(batch)} schools)")

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
                    f"Progress: {processed}/{total} ({pct:.1f}%) "
                    f"- ETA: {eta.strftime('%H:%M:%S')}"
                )

            delay = random.uniform(2.0, 4.0) if success else random.uniform(3.0, 6.0)
            time.sleep(delay)

        logger.info(f"Batch {batch_num} completed")

        if not shutdown_event.is_set() and i + batch_size < total:
            time.sleep(2)

    stats = crawler.stats
    elapsed = datetime.now() - start_time
    rate = stats['success'] / max(1, stats['total']) * 100

    logger.info("\n" + "=" * 60)
    logger.info("SECONDARY SCHOOL CRAWL COMPLETE")
    logger.info("=" * 60)
    logger.info(f"   Total processed     : {stats['total']}")
    logger.info(f"   Success             : {stats['success']} ({rate:.1f}%)")
    logger.info(f"   Failed              : {stats['failed']}")
    logger.info(f"   Quality rejected    : {stats['quality_rejected']}")
    logger.info(f"   Insufficient        : {stats['insufficient']}")
    logger.info(f"   Total time          : {elapsed}")
    logger.info(f"   Avg per school      : {elapsed.total_seconds()/max(1,stats['total']):.1f}s")

    if rate >= 80:
        logger.info("SUCCESS: 80%+ success rate!")
    elif rate >= 60:
        logger.info("PARTIAL: 60-80% success - some issues to review")
    else:
        logger.info("WARNING: <60% success rate")

    print(f"\nDone - {stats['success']}/{stats['total']} unprocessed secondary schools enriched ({rate:.1f}%)")
    return stats['success'] > 0


if __name__ == '__main__':
    crawl_remaining_secondary_schools()
