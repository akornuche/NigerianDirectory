"""
Seed the NUC-sourced new universities (new_universities_to_seed.json,
produced by merge_nuc_roster.py) into the schools table.

Kept in Python rather than routed through seedInstitutions.js because this
is a one-off batch tied to a JSON file on disk rather than a hand-maintained
JS roster module, and crawler/database.py's connection handling (DATABASE_URL
with TLS, configurable timeout) is already proven this session.

Usage: python seed_new_universities.py
"""
import json
import re
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager


def slugify(name: str) -> str:
    """Matches backend/src/seeds/universityData.js's slugify exactly, so
    slugs stay consistent regardless of which seeder touched a row."""
    name = name.lower()
    name = re.sub(r'[,.]', '', name)
    name = re.sub(r'\s+', '-', name)
    return name


def main():
    with open('new_universities_to_seed.json', encoding='utf-8') as f:
        roster = json.load(f)

    conn = db_manager.get_connection()
    inserted = 0
    updated = 0
    failed = 0

    try:
        with conn.cursor() as cur:
            for entry in roster:
                slug = slugify(entry['name'])
                try:
                    cur.execute(
                        """
                        INSERT INTO schools (
                            name, slug, institution_category, type, state, city,
                            website, established_year, needs_ai_enrichment
                        ) VALUES (%s, %s, 'university', %s, %s, %s, %s, %s, TRUE)
                        ON CONFLICT (slug) DO UPDATE SET
                            institution_category = 'university',
                            type                 = EXCLUDED.type,
                            state                = EXCLUDED.state,
                            city                 = EXCLUDED.city,
                            website              = COALESCE(EXCLUDED.website, schools.website),
                            established_year     = COALESCE(EXCLUDED.established_year, schools.established_year),
                            updated_at           = NOW()
                        RETURNING (xmax = 0) AS inserted
                        """,
                        (
                            entry['name'], slug, entry['type'], entry['state'],
                            entry['city'], entry.get('website'),
                            entry.get('established_year'),
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if row['inserted']:
                        inserted += 1
                        print(f"INSERT {entry['name']}")
                    else:
                        updated += 1
                        print(f"UPDATE {entry['name']}")
                except Exception as exc:
                    conn.rollback()
                    failed += 1
                    print(f"FAIL   {entry['name']} :: {exc}")

            cur.execute(
                "SELECT COUNT(*) AS total FROM schools WHERE institution_category = 'university'"
            )
            total = cur.fetchone()['total']
    finally:
        conn.close()

    print(f"\ninserted={inserted} updated={updated} failed={failed} total_in_db={total}")

    if failed > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
