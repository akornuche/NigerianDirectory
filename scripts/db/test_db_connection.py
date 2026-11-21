import os
import psycopg2
try:
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="nigerian_directory",
        user="postgres",
        password=os.environ["DB_PASSWORD"]  # set DB_PASSWORD; not stored in source
    )
    conn.close()
    print("✅ Connection to local database successful.")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
