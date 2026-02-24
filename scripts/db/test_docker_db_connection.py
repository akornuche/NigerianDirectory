import psycopg2
try:
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="nigerian_directory",
        user="postgres",
        password="devpassword123"
    )
    conn.close()
    print("✅ Connection to Docker database successful.")
except Exception as e:
    print(f"❌ Docker database connection failed: {e}")
