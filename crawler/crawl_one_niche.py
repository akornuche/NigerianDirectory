"""
Enrich a single institution of any niche and report the result.

Generalises crawl_one.py (which is fixed to the university niche) so that
hospitals and future verticals can be validated against the live database
one record at a time, without a dedicated script per niche.

crawl_one.py is kept as-is for university, since diagnose_enrichment.py and
test_truncation.py already depend on its exact shape; this script covers
every niche, including university, through the same NicheCrawler engine.

Usage:
    python crawl_one_niche.py university "University of Ibadan"
    python crawl_one_niche.py hospital "Lagos University Teaching Hospital"
    python crawl_one_niche.py hospital --slug lagos-university-teaching-hospital
"""

import json
import os
import sys
import logging
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from niche_config import get_niche
from niche_crawler import NicheCrawler

FIELDS = (
    'enriched_history',
    'enriched_academics',
    'enriched_campus_info',
    'enriched_student_life',
)


def load_target(institution_category: str, identifier: str, by_slug: bool) -> dict:
    column = 'slug' if by_slug else 'name'
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name, slug, type, state, city, area, website,
                       established_year, institution_category
                FROM schools
                WHERE institution_category = %s AND {column} = %s
                LIMIT 1
                """,
                (institution_category, identifier),
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
                """
                SELECT name, slug, state, city, area, enriched_at,
                       meta_title, meta_description,
                       enriched_history, enriched_academics,
                       enriched_campus_info, enriched_student_life,
                       content_sources
                FROM schools
                WHERE id = %s
                """,
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
    print('SAVED CONTENT')
    print('=' * 68)
    print(f"  name           : {record['name']}")
    print(f"  slug           : {record['slug']}")
    print(f"  location       : {record.get('area') or '-'} / {record['city']} / {record['state']}")
    print(f"  enriched_at    : {record['enriched_at']}")
    print(f"  meta_title     : {record.get('meta_title')}")
    print(f"  meta_desc      : {record.get('meta_description')}")
    print()

    total = 0
    for field in FIELDS:
        value = record.get(field) or ''
        total += len(value)
        print(f"  {field:24} {len(value):5} chars")
    print(f"  {'TOTAL':24} {total:5} chars")

    sources = record.get('content_sources')
    if sources:
        try:
            parsed = json.loads(sources) if isinstance(sources, str) else sources
            print(f"  sources        : {len(parsed)}")
            for source in parsed[:6]:
                print(f"    - {source.get('url')}")
        except Exception:
            pass

    print()
    preview_field = max(FIELDS, key=lambda f: len(record.get(f) or ''))
    preview = (record.get(preview_field) or '')[:400]
    print(f"  longest section preview ({preview_field}):")
    print(f"    {preview}...")


def main():
    args = [a for a in sys.argv[1:] if a != '--slug']
    by_slug = '--slug' in sys.argv

    if len(args) < 2:
        print('Usage: python crawl_one_niche.py <niche> <name-or-slug> [--slug]')
        sys.exit(1)

    niche_key, identifier = args[0], args[1]

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s:%(name)s:%(message)s',
    )

    niche = get_niche(niche_key)

    target = load_target(niche.institution_category, identifier, by_slug)
    if not target:
        print(f"No '{niche_key}' institution matched: {identifier}")
        sys.exit(1)

    print('=' * 68)
    print(f"CRAWLING ONE {niche_key.upper()} INSTITUTION")
    print('=' * 68)
    print(f"  name    : {target['name']}")
    print(f"  website : {target.get('website') or '(none)'}")
    print(f"  started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    crawler = NicheCrawler(niche)
    ok = crawler.crawl_institution(target)

    print()
    print(f"  result  : {'SAVED' if ok else 'NOT SAVED'}")
    print(f"  stats   : {crawler.stats}")

    if ok:
        report_saved(target['id'])

    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
