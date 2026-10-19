#!/usr/bin/env python3
"""
Export schools data from local Docker DB to Neon production database.
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

# Local Docker database
LOCAL_DB = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5433')),
    'database': os.getenv('DB_NAME', 'nigerian_directory'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'devpassword123'),
}

# Production Neon database
NEON_DB_URL = os.getenv('NEON_DATABASE_URL') or os.getenv('DATABASE_URL')

if not NEON_DB_URL:
    print("❌ ERROR: NEON_DATABASE_URL or DATABASE_URL not set")
    sys.exit(1)

try:
    # Connect to local DB
    print("🔌 Connecting to local Docker database...")
    local_conn = psycopg2.connect(**LOCAL_DB)
    local_cursor = local_conn.cursor(cursor_factory=RealDictCursor)
    
    # Fetch schools (not universities)
    print("📥 Fetching schools from local database...")
    local_cursor.execute("""
        SELECT * FROM schools 
        WHERE institution_category = 'school'
        ORDER BY state, name
    """)
    schools = local_cursor.fetchall()
    print(f"✓ Found {len(schools)} schools")
    
    # Connect to Neon
    print("\n🔌 Connecting to Neon production database...")
    neon_conn = psycopg2.connect(NEON_DB_URL)
    neon_cursor = neon_conn.cursor()
    
    # Get column names from first school
    if schools:
        columns = list(schools[0].keys())
        print(f"✓ Columns: {', '.join(columns[:5])}...")
        
        import json
        
        # JSON columns that need serialization
        JSON_COLS = {'subcategories', 'facilities', 'achievements', 'student_life',
                     'gallery_images', 'content_sources', 'management_info',
                     'levels', 'curriculum', 'boarding', 'gender'}

        def serialize(col, val):
            """Serialize dict/list values to JSON strings for psycopg2."""
            if val is None:
                return None
            if isinstance(val, (dict, list)):
                return json.dumps(val)
            return val

        # Build INSERT with full upsert — update all columns on conflict
        col_str = ', '.join(f'"{c}"' for c in columns)
        val_placeholders = ', '.join(['%s'] * len(columns))
        update_str = ', '.join(
            f'"{c}" = EXCLUDED."{c}"'
            for c in columns if c not in ('id', 'uuid', 'created_at')
        )
        insert_sql = f"""
            INSERT INTO schools ({col_str}) VALUES ({val_placeholders})
            ON CONFLICT (id) DO UPDATE SET {update_str}
        """
        
        # Insert schools
        success = 0
        fail = 0
        print(f"\n📤 Uploading {len(schools)} schools to Neon...")
        for i, school in enumerate(schools):
            values = [serialize(col, school[col]) for col in columns]
            try:
                neon_cursor.execute(insert_sql, values)
                success += 1
            except Exception as e:
                print(f"⚠️  School {i+1}/{len(schools)} ({school.get('name', 'Unknown')}): {e}")
                neon_conn.rollback()
                fail += 1
                continue
            
            if (i + 1) % 50 == 0:
                neon_conn.commit()
                print(f"  ✓ {i+1}/{len(schools)} processed (success={success} fail={fail})")
        
        neon_conn.commit()
        print(f"✓ Done — success={success}  fail={fail}")
    
    # Verify counts
    print("\n📊 Verifying counts...")
    
    local_cursor2 = local_conn.cursor()
    local_cursor2.execute("SELECT COUNT(*) FROM schools WHERE institution_category = 'school'")
    local_count = local_cursor2.fetchone()[0]
    print(f"  Local: {local_count} schools")
    
    neon_cursor.execute("SELECT COUNT(*) FROM schools WHERE institution_category = 'school'")
    neon_count = neon_cursor.fetchone()[0]
    print(f"  Neon:  {neon_count} schools")
    
    if local_count == neon_count:
        print("✅ Counts match!")
    else:
        print(f"⚠️  Count mismatch: {local_count} local vs {neon_count} Neon")
    
    local_conn.close()
    neon_conn.close()
    print("\n✅ Migration complete!")

except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
