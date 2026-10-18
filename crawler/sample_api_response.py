"""Print a sample of what the API returns for universities — same fields School.findAll selects."""
import sys, os, json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import db_manager

conn = db_manager.get_connection()
try:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, name, slug, institution_category, type, state, city,
                   logo_url, hero_image_url, established_year,
                   LEFT(template_summary, 120) AS summary_preview
            FROM schools
            WHERE institution_category = 'university'
              AND logo_url IS NOT NULL
              AND hero_image_url IS NOT NULL
            ORDER BY name
            LIMIT 5
        """)
        rows = cur.fetchall()
finally:
    conn.close()

for r in rows:
    print(json.dumps(dict(r), indent=2, default=str))
    print()
