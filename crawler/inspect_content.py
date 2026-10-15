"""
Print the stored enrichment for one institution so content quality can be
reviewed without opening the database by hand.

Usage:
    python inspect_content.py "University of Ibadan" [--chars 320]
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager

FIELDS = (
    ('enriched_history', 'HISTORY'),
    ('enriched_academics', 'ACADEMICS'),
    ('enriched_campus_info', 'CAMPUS'),
    ('enriched_student_life', 'STUDENT LIFE'),
)


def main():
    args = [a for a in sys.argv[1:] if a != '--ends']
    chars = 320
    if '--chars' in args:
        idx = args.index('--chars')
        chars = int(args[idx + 1])
        args = args[:idx] + args[idx + 2:]

    if not args:
        print('Provide an institution name.')
        sys.exit(1)

    name = args[0]

    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT name, slug, state, city, area, enriched_at,
                       meta_title, meta_description,
                       enriched_history, enriched_academics,
                       enriched_campus_info, enriched_student_life
                FROM schools
                WHERE name = %s
                """,
                (name,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        print(f'No institution matched: {name}')
        sys.exit(1)

    record = dict(row)

    print('=' * 70)
    print(f"{record['name']}  ({record['slug']})")
    print('=' * 70)
    print(f"location    : {record.get('area') or '-'} / {record['city']} / {record['state']}")
    print(f"enriched_at : {record['enriched_at']}")
    print(f"meta_title  : {record.get('meta_title')}")
    print(f"meta_desc   : {(record.get('meta_description') or '')[:160]}")
    print()

    show_ends = '--ends' in sys.argv

    for field, label in FIELDS:
        value = (record.get(field) or '').strip()
        print('-' * 70)
        print(f"{label}  ({len(value)} chars)")
        print('-' * 70)
        if not value:
            print('  (empty)')
        elif show_ends:
            # Verifying that stored text closes on a complete sentence.
            print('  STARTS: ' + value[:140].replace('\n', ' ') + '...')
            print('  ENDS  : ...' + value[-140:].replace('\n', ' '))
            closes = value.endswith(('.', '!', '?', '"', ')', '…'))
            print(f"  CLOSES CLEANLY: {'yes' if closes else 'NO'}")
        else:
            print('  ' + value[:chars].replace('\n', ' ') + ('...' if len(value) > chars else ''))
        print()


if __name__ == '__main__':
    main()
