#!/usr/bin/env python3
"""
Test script to verify crawler can save enriched data to database
"""
import json
from database import get_connection

def test_database_save():
    """Test saving enriched data to database"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Test saving some mock enriched data
            cur.execute('''
                UPDATE schools SET
                    enriched_history = %s,
                    enriched_academics = %s,
                    enriched_campus_info = %s,
                    enriched_student_life = %s,
                    content_sources = %s::jsonb,
                    enrichment_status = 'completed',
                    last_enriched = NOW()
                WHERE slug = 'abeokuta-grammar-school'
            ''', [
                'Abeokuta Grammar School was established in 1908 as one of Nigeria\'s oldest secondary schools.',
                'The school offers a comprehensive curriculum including sciences, arts, and commercial subjects.',
                'Located in Abeokuta, Ogun State, the school features traditional colonial architecture.',
                'Students participate in various extracurricular activities and maintain a rich cultural heritage.',
                json.dumps([{'name': 'Test Source', 'url': 'https://example.com'}])
            ])
            conn.commit()
            print('✅ Successfully saved test enriched data to database!')

            # Verify the data was saved
            cur.execute('SELECT enriched_history, enrichment_status FROM schools WHERE slug = \'abeokuta-grammar-school\'')
            result = cur.fetchone()
            if result:
                print(f'✅ Verified: status={result[1]}, has_history={bool(result[0])}')
            else:
                print('❌ Could not verify saved data')
    finally:
        conn.close()

if __name__ == '__main__':
    test_database_save()