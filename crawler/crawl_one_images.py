"""
Crawl and upload images for a single institution, then report the result.

Mirrors crawl_one.py (content enrichment) so image enrichment can be
validated against the live database for one record before running a batch.

Usage:
    python crawl_one_images.py "University of Ibadan"
    python crawl_one_images.py --slug university-of-ibadan
"""

import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from image_crawler_fixed import ImageCrawler


def load_target(identifier: str, by_slug: bool) -> dict:
    column = 'slug' if by_slug else 'name'
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name, slug, state, city, area, website,
                       institution_category, logo_url, hero_image_url
                FROM schools
                WHERE {column} = %s
                LIMIT 1
                """,
                (identifier,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def report_saved(school_id: int):
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name, slug, logo_url, hero_image_url FROM schools WHERE id = %s",
                (school_id,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        print('No row found after save.')
        return

    record = dict(row)
    print()
    print('=' * 68)
    print('SAVED IMAGES')
    print('=' * 68)
    print(f"  name           : {record['name']}")
    print(f"  slug           : {record['slug']}")
    print(f"  logo_url       : {record.get('logo_url') or '(none)'}")
    print(f"  hero_image_url : {record.get('hero_image_url') or '(none)'}")


def main():
    args = [a for a in sys.argv[1:] if a != '--slug']
    by_slug = '--slug' in sys.argv

    if not args:
        print('Provide an institution name or --slug <slug>.')
        sys.exit(1)

    identifier = args[0]

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s:%(name)s:%(message)s',
    )

    target = load_target(identifier, by_slug)
    if not target:
        print(f'No institution matched: {identifier}')
        sys.exit(1)

    print('=' * 68)
    print('CRAWLING IMAGES FOR ONE INSTITUTION')
    print('=' * 68)
    print(f"  name    : {target['name']}")
    print(f"  website : {target.get('website') or '(none)'}")
    print(f"  before  : logo={bool(target.get('logo_url'))} hero={bool(target.get('hero_image_url'))}")
    print()

    crawler = ImageCrawler()
    result = crawler.crawl_school_images(target)

    print()
    print(f"  result  : {'SUCCESS' if result['success'] else 'FAILED'}")
    print(f"  method  : {result.get('method')}")
    print(f"  error   : {result.get('error')}")
    print(f"  stats   : {crawler.stats}")

    if result['success']:
        saved = db_manager.update_school_images(
            target['id'],
            logo_url=result.get('logo_url'),
            hero_image_url=result.get('hero_image_url'),
        )
        print(f"  db save : {'OK' if saved else 'FAILED'}")
        if saved:
            report_saved(target['id'])

    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
