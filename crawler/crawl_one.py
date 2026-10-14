"""
Enrich a single institution and report the result.

Used to validate crawler changes against the live database before running a
full batch.

Connection comes from DATABASE_URL when set, otherwise the usual DB_*
variables, so the same script works locally and against a managed database.

Usage:
    python crawl_one.py "University of Ibadan"
    python crawl_one.py --slug university-of-ibadan
"""

import os
import sys
import logging
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from university_crawler import UniversityCrawler, setup_logging

FIELDS = (
    'enriched_history',
    'enriched_academics',
    'enriched_campus_info',
    'enriched_student_life',
)


def load_target(identifier: str, by_slug: bool) -> dict:
    column = 'slug' if by_slug else 'name'
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name, slug, type, state, city, area, website,
                       established_year, institution_category
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
            import json
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

    if not args:
        print('Provide an institution name or --slug <slug>.')
        sys.exit(1)

    identifier = args[0]

    setup_logging()
    logging.getLogger('university_crawler').setLevel(logging.INFO)

    target = load_target(identifier, by_slug)
    if not target:
        print(f'No institution matched: {identifier}')
        sys.exit(1)

    print('=' * 68)
    print(f"CRAWLING ONE INSTITUTION")
    print('=' * 68)
    print(f"  name    : {target['name']}")
    print(f"  website : {target.get('website') or '(none)'}")
    print(f"  started : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    crawler = UniversityCrawler()
    ok = crawler.crawl_university(target)

    print()
    print(f"  result  : {'SAVED' if ok else 'NOT SAVED'}")
    print(f"  stats   : {crawler.stats}")

    if ok:
        report_saved(target['id'])

    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
