"""
Batch image crawl, scoped to one institution_category and to records that
have no image at all yet.

image_crawler_fixed.py's own run_batch_crawl / get_schools_needing_images
has two gaps that make it unsuitable for an unattended, category-scoped
run like this one:

  1. No institution_category filter, so a university-focused run would
     also pick up every unenriched regular school.
  2. The row selection condition is "logo_url IS NULL OR hero_image_url IS
     NULL", meaning a record that already has a logo but failed to find a
     hero (or vice versa) is selected again on every future run forever,
     repeatedly re-querying search engines for an image that was already
     looked for.

This script requires both logo_url and hero_image_url to be missing before
a record is considered "needing images", and takes institution_category as
an explicit argument. It otherwise reuses ImageCrawler.crawl_school_images
and the existing update_school_images save path unchanged.

Usage:
    python crawl_images_batch.py university [--limit 300]
"""
import sys
import os
import time
import random
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from image_crawler_fixed import ImageCrawler


def get_institutions_needing_images(institution_category: str, limit: int = 300):
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, slug, state, city, area, website,
                       institution_category
                FROM schools
                WHERE institution_category = %s
                  AND logo_url IS NULL
                  AND hero_image_url IS NULL
                  AND enriched_history IS NOT NULL
                  AND enriched_history != ''
                ORDER BY name
                LIMIT %s
                """,
                (institution_category, limit),
            )
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('--'):
        print('Usage: python crawl_images_batch.py <institution_category> [--limit N]')
        sys.exit(1)

    category = args[0]
    limit = 300
    if '--limit' in args:
        idx = args.index('--limit')
        limit = int(args[idx + 1])

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s:%(name)s:%(message)s',
    )
    logger = logging.getLogger('crawl_images_batch')

    institutions = get_institutions_needing_images(category, limit=limit)
    total = len(institutions)
    logger.info(f"📚 Found {total} '{category}' institutions needing images")

    if total == 0:
        print("Nothing to do.")
        return

    crawler = ImageCrawler()
    success_count = 0
    failed_count = 0

    for i, institution in enumerate(institutions, 1):
        logger.info(f"[{i}/{total}] {institution['name']} ({institution['state']})")

        try:
            result = crawler.crawl_school_images(institution)
        except Exception as exc:
            logger.error(f"💥 Error: {institution['name']} — {exc}")
            failed_count += 1
            continue

        if result['success']:
            saved = db_manager.update_school_images(
                institution['id'],
                logo_url=result.get('logo_url'),
                hero_image_url=result.get('hero_image_url'),
            )
            if saved:
                logger.info(f"✅ Saved images for {institution['name']}")
                success_count += 1
            else:
                logger.error(f"❌ DB save failed for {institution['name']}")
                failed_count += 1
        else:
            logger.warning(f"❌ No usable images found for {institution['name']}: {result.get('error')}")
            failed_count += 1

        if i % 5 == 0 or i == total:
            logger.info(f"📊 Progress: {i}/{total} — success={success_count} failed={failed_count}")

        time.sleep(random.uniform(1.5, 3.0))

    logger.info("=" * 60)
    logger.info("📊 IMAGE BATCH COMPLETE")
    logger.info(f"   Total      : {total}")
    logger.info(f"   Success    : {success_count}")
    logger.info(f"   Failed     : {failed_count}")
    print(f"\n🎉 Done — {success_count}/{total} institutions got images")


if __name__ == '__main__':
    main()
