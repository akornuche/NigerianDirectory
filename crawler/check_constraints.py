"""
One-off check of CHECK constraints on the schools table, used to confirm
that a new institution_category/type value (e.g. 'hospital') is legal
before seeding a test row.

Usage: python check_constraints.py
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
                SELECT conname, pg_get_constraintdef(c.oid) AS definition
                FROM pg_constraint c
                WHERE conrelid = 'schools'::regclass AND contype = 'c'
                ORDER BY conname
                """
            )
            rows = cur.fetchall()
            for row in rows:
                print(row['conname'], '::', row['definition'])
    finally:
        conn.close()


if __name__ == '__main__':
    main()
