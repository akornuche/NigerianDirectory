"""Audit secondary school data quality to understand what needs recrawling."""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import db_manager

conn = db_manager.get_connection()
try:
    with conn.cursor() as cur:
        # Overall picture
        cur.execute("""
            SELECT
                COUNT(*)                                                                     AS total,
                COUNT(*) FILTER (WHERE enriched_history IS NOT NULL AND enriched_history != '')  AS has_history,
                COUNT(*) FILTER (WHERE enriched_academics IS NOT NULL AND enriched_academics != '') AS has_academics,
                COUNT(*) FILTER (WHERE logo_url IS NOT NULL)                                 AS has_logo,
                COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL)                           AS has_hero,
                COUNT(*) FILTER (WHERE website IS NOT NULL AND website != '')                AS has_website,
                COUNT(*) FILTER (WHERE template_summary IS NOT NULL AND template_summary != '') AS has_summary,
                -- "well enriched" = has history AND at least one image
                COUNT(*) FILTER (WHERE
                    enriched_history IS NOT NULL AND enriched_history != ''
                    AND (logo_url IS NOT NULL OR hero_image_url IS NOT NULL)
                )                                                                            AS well_enriched,
                -- "bare minimum" = only the seed fields, nothing crawled
                COUNT(*) FILTER (WHERE
                    (enriched_history IS NULL OR enriched_history = '')
                    AND logo_url IS NULL AND hero_image_url IS NULL
                )                                                                            AS bare_minimum
            FROM schools
            WHERE institution_category = 'school'
        """)
        r = cur.fetchone()
        total = r['total']
        print("=== SECONDARY SCHOOL QUALITY AUDIT ===")
        print(f"  Total schools          : {total}")
        print(f"  Has history content    : {r['has_history']}  ({r['has_history']*100//total}%)")
        print(f"  Has academics content  : {r['has_academics']}  ({r['has_academics']*100//total}%)")
        print(f"  Has logo               : {r['has_logo']}  ({r['has_logo']*100//total}%)")
        print(f"  Has hero image         : {r['has_hero']}  ({r['has_hero']*100//total}%)")
        print(f"  Has website            : {r['has_website']}  ({r['has_website']*100//total}%)")
        print(f"  Has summary            : {r['has_summary']}  ({r['has_summary']*100//total}%)")
        print(f"  Well enriched (content+image): {r['well_enriched']}  ({r['well_enriched']*100//total}%)")
        print(f"  Bare minimum (nothing crawled): {r['bare_minimum']}  ({r['bare_minimum']*100//total}%)")

        # Content length distribution — short = poor quality
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE LENGTH(enriched_history) < 200)   AS very_short,
                COUNT(*) FILTER (WHERE LENGTH(enriched_history) BETWEEN 200 AND 500) AS short,
                COUNT(*) FILTER (WHERE LENGTH(enriched_history) BETWEEN 500 AND 1500) AS medium,
                COUNT(*) FILTER (WHERE LENGTH(enriched_history) > 1500)  AS good
            FROM schools
            WHERE institution_category = 'school'
              AND enriched_history IS NOT NULL AND enriched_history != ''
        """)
        q = cur.fetchone()
        print(f"\n  --- Content length (among {r['has_history']} with history) ---")
        print(f"  Very short (<200 chars)  : {q['very_short']}")
        print(f"  Short (200-500)          : {q['short']}")
        print(f"  Medium (500-1500)        : {q['medium']}")
        print(f"  Good (>1500)             : {q['good']}")

        # Sample of very short / poor content
        cur.execute("""
            SELECT name, state, LENGTH(enriched_history) AS hist_len, LEFT(enriched_history, 120) AS preview
            FROM schools
            WHERE institution_category = 'school'
              AND enriched_history IS NOT NULL AND enriched_history != ''
              AND LENGTH(enriched_history) < 200
            ORDER BY hist_len
            LIMIT 5
        """)
        rows = cur.fetchall()
        if rows:
            print(f"\n  --- Sample very-short content ---")
            for row in rows:
                print(f"  [{row['hist_len']}c] {row['name']} ({row['state']}): {row['preview']!r}")

        # How many would benefit from a recrawl (content OR images missing)
        cur.execute("""
            SELECT COUNT(*) AS needs_recrawl
            FROM schools
            WHERE institution_category = 'school'
              AND (
                enriched_history IS NULL OR enriched_history = ''
                OR LENGTH(enriched_history) < 300
                OR logo_url IS NULL
                OR hero_image_url IS NULL
              )
        """)
        print(f"\n  Candidates for recrawl (thin/missing content OR missing image): {cur.fetchone()['needs_recrawl']}")

finally:
    conn.close()
