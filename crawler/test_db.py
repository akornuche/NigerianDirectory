#!/usr/bin/env python3
"""
Test database connection and operations
"""
from database import get_connection

def test_database():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Test read
            cur.execute('SELECT COUNT(*) FROM schools')
            count = cur.fetchone()[0]
            print(f'✅ Database connection successful! Found {count} schools.')

            # Test write
            cur.execute("UPDATE schools SET enrichment_status = 'testing' WHERE slug = 'green-springs-school'")
            conn.commit()
            print('✅ Database write successful!')

            # Verify the change
            cur.execute("SELECT enrichment_status FROM schools WHERE slug = 'green-springs-school'")
            status = cur.fetchone()[0]
            print(f'✅ Status changed to: {status}')

            # Reset
            cur.execute("UPDATE schools SET enrichment_status = 'completed' WHERE slug = 'green-springs-school'")
            conn.commit()
            print('✅ Database operations working perfectly!')

    finally:
        conn.close()

if __name__ == '__main__':
    test_database()