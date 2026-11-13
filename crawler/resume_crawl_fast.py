"""
Fast Resume Script for Secondary School Recrawl
================================================
Skips database filtering and directly resumes the crawler
on unprocessed schools using a more efficient query.
"""

import os
import sys
import logging
import time
from datetime import datetime, timedelta
from threading import Event
import random
import signal

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from niche_config import SECONDARY_SCHOOL
from niche_crawler import NicheCrawler
from database import db_manager
from dotenv import load_dotenv

# ── Graceful shutdown ───────────────────────────────────────────────────────
shutdown_event = Event()

def signal_handler(signum, frame):
    print(f"\nShutdown signal received")
    shutdown_event.set()

# ── Logging setup ────────────────────────────────────────────────────────────
def setup_logging():
    log_filename = f'secondary_school_crawl_resume_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
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
    return logging.getLogger('resume_crawler')

def get_unprocessed_secondary_schools(limit=500):
    """Load only secondary schools that haven't been enriched yet."""
    load_dotenv()
    logger = logging.getLogger('resume_crawler')
    
    logger.info("Fetching unprocessed secondary schools from database...")
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
                ORDER BY
                    CASE WHEN website IS NOT NULL THEN 0 ELSE 1 END,
                    name
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
            schools = [dict(r) for r in rows]
            logger.info(f"Found {len(schools)} unprocessed schools")
            return schools
    finally:
        conn.close()

def crawl_remaining():
    """Resume crawling remaining secondary schools."""
    print("[RESUME] SECONDARY SCHOOL CRAWLER - RESUMING CRAWL")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger = setup_logging()

    crawler = NicheCrawler(SECONDARY_SCHOOL)
    crawler.logger = logging.getLogger('resume_crawler')

    logger.info("Loading unprocessed secondary schools...")
    schools = get_unprocessed_secondary_schools(limit=500)
    
    if not schools:
        logger.info("No more schools to process - crawl complete!")
        return True

    total = len(schools)
    logger.info(f"Loaded {total} schools for processing")

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
                avg = elapsed.total_seconds() / processed if processed > 0 else 0
                eta = start_time + timedelta(seconds=avg * total)
                logger.info(
                    f"Progress: {processed}/{total} ({pct:.1f}%) - ETA: {eta.strftime('%H:%M:%S')}"
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
    logger.info("SECONDARY SCHOOL RESUME - COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Total processed  : {stats['total']}")
    logger.info(f"Success          : {stats['success']} ({rate:.1f}%)")
    logger.info(f"Failed           : {stats['failed']}")
    logger.info(f"Quality rejected : {stats['quality_rejected']}")
    logger.info(f"Insufficient     : {stats['insufficient']}")
    logger.info(f"Total time       : {elapsed}")
    logger.info(f"Avg per school   : {elapsed.total_seconds()/max(1,stats['total']):.1f}s")

    if rate >= 80:
        logger.info("SUCCESS: >= 80% success rate!")
    elif rate >= 60:
        logger.info("PARTIAL: 60-80% success")
    else:
        logger.info("NEEDS ATTENTION: < 60% success rate")

    print(f"\nDone - {stats['success']}/{stats['total']} schools processed ({rate:.1f}%)")
    return stats['success'] > 0

if __name__ == '__main__':
    crawl_remaining()
