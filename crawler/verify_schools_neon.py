from database import db_manager
conn = db_manager.get_connection()
with conn.cursor() as cur:
    cur.execute("""
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE enriched_history IS NOT NULL AND enriched_history != '') AS enriched,
            COUNT(*) FILTER (WHERE logo_url IS NOT NULL) AS logos,
            COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) AS heroes,
            COUNT(*) FILTER (WHERE website IS NOT NULL AND website != '') AS has_website,
            COUNT(*) FILTER (WHERE template_summary IS NOT NULL AND template_summary != '') AS has_summary
        FROM schools WHERE institution_category = 'school'
    """)
    r = cur.fetchone()
    print("=== SCHOOLS ON NEON (production) ===")
    print(f"  Total    : {r['total']}")
    print(f"  Enriched : {r['enriched']}  ({r['enriched']*100//r['total']}%)")
    print(f"  Logos    : {r['logos']}")
    print(f"  Heroes   : {r['heroes']}")
    print(f"  Websites : {r['has_website']}")
    print(f"  Summary  : {r['has_summary']}")

    # Sample 3 enriched schools
    cur.execute("""
        SELECT name, state, LEFT(enriched_history, 100) AS preview
        FROM schools
        WHERE institution_category = 'school'
          AND enriched_history IS NOT NULL AND enriched_history != ''
        LIMIT 3
    """)
    print("\n  --- Sample enriched schools ---")
    for row in cur.fetchall():
        print(f"  {row['name']} ({row['state']}): {row['preview']!r}...")

conn.close()
