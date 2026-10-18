"""
List all universities with their enrichment and website status, used to
plan a batch crawl.

Usage: python check_university_status.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager


def main():
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT name, state, website,
                       CASE WHEN enriched_history IS NOT NULL AND enriched_history != ''
                            THEN true ELSE false END AS enriched
                FROM schools
                WHERE institution_category = 'university'
                ORDER BY enriched DESC, name
                """
            )
            rows = [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

    enriched = [r for r in rows if r['enriched']]
    unenriched = [r for r in rows if not r['enriched']]
    with_website = [r for r in unenriched if r['website']]
    without_website = [r for r in unenriched if not r['website']]

    print(f"Total universities    : {len(rows)}")
    print(f"Already enriched      : {len(enriched)}")
    for r in enriched:
        print(f"  - {r['name']} ({r['state']})")
    print(f"Not yet enriched      : {len(unenriched)}")
    print(f"  with website        : {len(with_website)}")
    print(f"  without website     : {len(without_website)}")


if __name__ == '__main__':
    main()
