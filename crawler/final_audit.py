"""Final audit of the universities table before declaring crawl complete."""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import db_manager

conn = db_manager.get_connection()
try:
    with conn.cursor() as cur:
        # Overall counts
        cur.execute("""
            SELECT
                COUNT(*)                                                         AS total,
                COUNT(*) FILTER (WHERE enriched_history IS NOT NULL AND enriched_history != '') AS content,
                COUNT(*) FILTER (WHERE logo_url IS NOT NULL)                     AS logos,
                COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL)               AS heroes,
                COUNT(*) FILTER (WHERE logo_url IS NOT NULL AND hero_image_url IS NOT NULL) AS both_images,
                COUNT(*) FILTER (WHERE slug IS NULL OR slug = '')                AS null_slugs,
                COUNT(*) FILTER (WHERE state IS NULL OR state = '')              AS null_states,
                COUNT(*) FILTER (WHERE name IS NULL OR name = '')                AS null_names
            FROM schools WHERE institution_category = 'university'
        """)
        r = cur.fetchone()
        print("=== UNIVERSITY TABLE AUDIT ===")
        print(f"  Total rows          : {r['total']}")
        print(f"  Enriched (content)  : {r['content']}  ({r['content']*100//r['total']}%)")
        print(f"  With logo           : {r['logos']}  ({r['logos']*100//r['total']}%)")
        print(f"  With hero image     : {r['heroes']}  ({r['heroes']*100//r['total']}%)")
        print(f"  Both images         : {r['both_images']}  ({r['both_images']*100//r['total']}%)")
        print(f"  Null/empty slugs    : {r['null_slugs']}")
        print(f"  Null states         : {r['null_states']}")
        print(f"  Null names          : {r['null_names']}")

        # Duplicate slugs
        cur.execute("""
            SELECT slug, COUNT(*) AS n FROM schools
            WHERE institution_category = 'university'
            GROUP BY slug HAVING COUNT(*) > 1
        """)
        dupes = cur.fetchall()
        print(f"\n  Duplicate slugs     : {len(dupes)}")
        for d in dupes:
            print(f"    '{d['slug']}' x{d['n']}")

        # Breakdown by type
        cur.execute("""
            SELECT type, COUNT(*) AS n,
                   COUNT(*) FILTER (WHERE enriched_history IS NOT NULL AND enriched_history != '') AS enriched,
                   COUNT(*) FILTER (WHERE logo_url IS NOT NULL) AS logos
            FROM schools WHERE institution_category = 'university'
            GROUP BY type ORDER BY type
        """)
        print("\n  --- By type ---")
        for row in cur.fetchall():
            print(f"  {row['type']:10}  total={row['n']:3}  enriched={row['enriched']:3}  logos={row['logos']:3}")

finally:
    conn.close()
