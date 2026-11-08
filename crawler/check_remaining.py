import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import db_manager

db = db_manager
conn = db.get_connection()
cur = conn.cursor()

# Check how many still need enrichment
cur.execute("""
    SELECT COUNT(*) as count
    FROM schools
    WHERE institution_category = 'school'
      AND (enriched_history IS NULL OR enriched_history = '')
      AND (enriched_academics IS NULL OR enriched_academics = '')
""")
result = cur.fetchone()
print(f"Schools still needing enrichment: {result['count']}")

# Check how many have been enriched
cur.execute("""
    SELECT COUNT(*) as count
    FROM schools
    WHERE institution_category = 'school'
      AND ((enriched_history IS NOT NULL AND enriched_history != '')
           OR (enriched_academics IS NOT NULL AND enriched_academics != ''))
""")
result = cur.fetchone()
print(f"Schools already enriched: {result['count']}")

cur.close()
conn.close()
