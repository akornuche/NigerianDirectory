import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import db_manager

conn = db_manager.get_connection()
cur = conn.cursor()

# Count: all four fields must be empty (completely unprocessed)
cur.execute("""
    SELECT COUNT(*) as count
    FROM schools
    WHERE institution_category = 'school'
      AND (enriched_history IS NULL OR enriched_history = '')
      AND (enriched_academics IS NULL OR enriched_academics = '')
      AND (enriched_campus_info IS NULL OR enriched_campus_info = '')
      AND (enriched_student_life IS NULL OR enriched_student_life = '')
""")
result = cur.fetchone()
unprocessed = result['count']

# Count: at least one field has been filled (partially or fully processed)
cur.execute("""
    SELECT COUNT(*) as count
    FROM schools
    WHERE institution_category = 'school'
      AND (
        (enriched_history IS NOT NULL AND enriched_history != '')
        OR (enriched_academics IS NOT NULL AND enriched_academics != '')
        OR (enriched_campus_info IS NOT NULL AND enriched_campus_info != '')
        OR (enriched_student_life IS NOT NULL AND enriched_student_life != '')
      )
""")
result = cur.fetchone()
processed = result['count']

print(f"COMPLETELY UNPROCESSED (all 4 fields empty): {unprocessed}")
print(f"ALREADY PROCESSED (at least 1 field filled): {processed}")
print(f"Total secondary schools: {unprocessed + processed}")
print()
print(f"Expected: {unprocessed} should equal 408 - 266 = 142")

cur.close()
conn.close()
