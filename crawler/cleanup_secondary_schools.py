"""
Cleanup Script for Secondary School Enrichment Data
====================================================
Clears the old poor-quality enrichment data from secondary schools
before recrawling with the improved NicheCrawler.

This resets enriched_history, enriched_academics, enriched_campus_info,
and enriched_student_life for all schools with institution_category='school'
"""

import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager

# ── Logging setup ────────────────────────────────────────────────────────────
def setup_logging():
    log_filename = f'cleanup_secondary_schools_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
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
    return logging.getLogger('cleanup')


def cleanup_secondary_schools():
    """
    Clear enrichment data for all secondary schools.
    This allows them to be recrawled with the improved NicheCrawler.
    """
    load_dotenv()
    logger = setup_logging()

    print("\n⚠️  SECONDARY SCHOOL ENRICHMENT CLEANUP")
    print("=" * 60)
    print("This will DELETE enrichment data from all secondary schools:")
    print("  - enriched_history")
    print("  - enriched_academics")
    print("  - enriched_campus_info")
    print("  - enriched_student_life")
    print()

    # Confirm before proceeding
    response = input("Are you sure? Type 'YES' to proceed: ").strip().upper()
    if response != 'YES':
        print("❌ Cleanup cancelled.")
        return False

    print()
    logger.info("🧹 Starting cleanup of secondary school enrichment data...")

    try:
        conn = db_manager.get_connection()
        cur = conn.cursor()

        # First, get the count of schools to be cleaned
        logger.info("📊 Counting secondary schools with enrichment data...")
        cur.execute(
            """
            SELECT COUNT(*) as count
            FROM schools
            WHERE institution_category = 'school'
              AND (
                enriched_history IS NOT NULL
                OR enriched_academics IS NOT NULL
                OR enriched_campus_info IS NOT NULL
                OR enriched_student_life IS NOT NULL
              )
            """
        )
        result = cur.fetchone()
        count_to_clean = result['count'] if result else 0

        logger.info(f"📋 Found {count_to_clean} secondary schools with enrichment data")

        if count_to_clean == 0:
            logger.info("✅ No secondary schools need cleanup (already clean)")
            cur.close()
            conn.close()
            return True

        # Clear the enrichment data
        logger.info("🧹 Clearing enrichment data...")
        cur.execute(
            """
            UPDATE schools
            SET
              enriched_history = NULL,
              enriched_academics = NULL,
              enriched_campus_info = NULL,
              enriched_student_life = NULL,
              updated_at = NOW()
            WHERE institution_category = 'school'
              AND (
                enriched_history IS NOT NULL
                OR enriched_academics IS NOT NULL
                OR enriched_campus_info IS NOT NULL
                OR enriched_student_life IS NOT NULL
              )
            """
        )

        conn.commit()
        cleaned_count = cur.rowcount

        logger.info(f"✅ Cleaned {cleaned_count} secondary schools")

        # Verify the cleanup
        logger.info("🔍 Verifying cleanup...")
        cur.execute(
            """
            SELECT COUNT(*) as count
            FROM schools
            WHERE institution_category = 'school'
              AND (
                enriched_history IS NOT NULL
                OR enriched_academics IS NOT NULL
                OR enriched_campus_info IS NOT NULL
                OR enriched_student_life IS NOT NULL
              )
            """
        )
        result = cur.fetchone()
        remaining_count = result['count'] if result else 0

        if remaining_count == 0:
            logger.info("✅ Verification complete - all enrichment data cleared")
        else:
            logger.warning(f"⚠️  {remaining_count} schools still have enrichment data")

        # Count total secondary schools available for recrawl
        cur.execute(
            """
            SELECT COUNT(*) as count
            FROM schools
            WHERE institution_category = 'school'
            """
        )
        result = cur.fetchone()
        total_schools = result['count'] if result else 0

        logger.info(f"📊 Total secondary schools in database: {total_schools}")
        logger.info(f"📊 Secondary schools ready for recrawl: {total_schools - remaining_count}")

        cur.close()
        conn.close()

        print("\n" + "=" * 60)
        print("✅ CLEANUP COMPLETE")
        print("=" * 60)
        print(f"Cleaned:        {cleaned_count} schools")
        print(f"Total schools:  {total_schools}")
        print()
        print("Next step: Run the secondary school recrawler")
        print("  python secondary_school_crawler.py")
        print()

        return True

    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}", exc_info=True)
        print(f"\n❌ Error: {e}")
        return False


if __name__ == '__main__':
    success = cleanup_secondary_schools()
    sys.exit(0 if success else 1)
