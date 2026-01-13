"""
Quick script to add test content sources to a school
"""
import psycopg2
import json

conn = psycopg2.connect(
    host='localhost',
    port=5433,
    database='nigerian_directory',
    user='postgres',
    password='postgres'
)

cursor = conn.cursor()

# Test content sources
content_sources = [
    {"url": "https://en.wikipedia.org/wiki/Kings_College_Lagos", "title": "Kings College Lagos - Wikipedia", "type": "reference"},
    {"url": "https://kingscollege.ng", "title": "Kings College Lagos Official Website", "type": "official"},
    {"url": "https://www.educeleb.com/kings-college-lagos", "title": "Kings College Lagos - History and Facts", "type": "reference"},
    {"url": "https://www.nairaland.com/topic/kings-college-lagos", "title": "Kings College Lagos Discussion", "type": "reference"},
    {"url": "https://en.wikipedia.org/wiki/Secondary_education_in_Nigeria", "title": "Secondary Education in Nigeria", "type": "reference"}
]

# Update Kings College Lagos
cursor.execute("""
    UPDATE schools 
    SET content_sources = %s
    WHERE slug = 'kings-college-lagos'
""", (json.dumps(content_sources),))

print(f"Updated {cursor.rowcount} row(s)")

conn.commit()
cursor.close()
conn.close()

print("Done!")
