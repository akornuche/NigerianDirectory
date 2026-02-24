import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="nigerian_directory",
    user="postgres",
    password="devpassword123"
)
cur = conn.cursor()

cur.execute("""
    SELECT slug, name, LENGTH(COALESCE(enriched_history, '')) AS history_len
    FROM schools
    WHERE enriched_history IS NOT NULL AND enriched_history != ''
    ORDER BY name
""")
rows = cur.fetchall()

print(f"Schools with recovered enrichment: {len(rows)}\n")
for slug, name, history_len in rows:
    print(f"{name} ({slug}) - {history_len} chars of enrichment")

cur.close()
conn.close()
