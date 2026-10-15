"""
Quick count of institutions by niche in the live database, used to confirm
seed/crawl results without fighting PowerShell's handling of inline
COUNT(*) syntax.

Usage: python check_niche_counts.py
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
                SELECT institution_category,
                       COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE enriched_history IS NOT NULL AND enriched_history != '') AS enriched
                FROM schools
                GROUP BY institution_category
                ORDER BY total DESC
                """
            )
            for row in cur.fetchall():
                print(f"{row['institution_category']:12} total={row['total']:4}  enriched={row['enriched']}")
    finally:
        conn.close()


if __name__ == '__main__':
    main()
