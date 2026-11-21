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

cur.execute("""
    SELECT slug, name, content_sources, enriched_history, enriched_academics, enriched_campus_info, enriched_student_life, enrichment_status
    FROM schools
    ORDER BY name
""")

rows = cur.fetchall()

with open("all_schools_enrichment.json", "w", encoding="utf-8") as f:
    for row in rows:
        record = {
            "slug": row[0],
            "name": row[1],
            "has_content_sources": bool(row[2]),
            "has_enriched_history": bool(row[3]),
            "has_enriched_academics": bool(row[4]),
            "has_enriched_campus_info": bool(row[5]),
            "has_enriched_student_life": bool(row[6]),
            "enrichment_status": row[7],
            "content_sources": row[2],
            "enriched_history": row[3],
            "enriched_academics": row[4],
            "enriched_campus_info": row[5],
            "enriched_student_life": row[6],
        }
        f.write(json.dumps(record, ensure_ascii=False, indent=2) + "\n")

print(f"Exported {len(rows)} school records to all_schools_enrichment.json")

cur.close()
conn.close()
