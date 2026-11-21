import os
import psycopg2
import json

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="nigerian_directory",
    user="postgres",
    password=os.environ["DB_PASSWORD"]  # set DB_PASSWORD; not stored in source
)

cur = conn.cursor()

# Check schools
schools = [
    "federal-government-girls-college-abuja",
    "kings-college-lagos"
]

for slug in schools:
    cur.execute("""
        SELECT name, 
               CASE WHEN content_sources IS NOT NULL THEN 'YES' ELSE 'NO' END as has_sources,
               CASE WHEN enriched_history IS NOT NULL THEN 'YES' ELSE 'NO' END as has_history,
               CASE WHEN enriched_academics IS NOT NULL THEN 'YES' ELSE 'NO' END as has_academics,
               content_sources
        FROM schools 
        WHERE slug = %s
    """, (slug,))
    
    result = cur.fetchone()
    if result:
        print(f"\n=== {result[0]} ===")
        print(f"Has content_sources: {result[1]}")
        print(f"Has enriched_history: {result[2]}")
        print(f"Has enriched_academics: {result[3]}")
        if result[4]:
            print(f"Content sources: {json.dumps(result[4], indent=2)}")
    else:
        print(f"\n=== {slug} NOT FOUND ===")

# Count schools with content sources
cur.execute("SELECT COUNT(*) FROM schools WHERE content_sources IS NOT NULL")
print(f"\n\nSchools with content_sources: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM schools WHERE enriched_history IS NOT NULL")
print(f"Schools with enriched_history: {cur.fetchone()[0]}")

cur.close()
conn.close()
