#!/usr/bin/env python3
"""
Script to load schools from ministry_schools.json into the database
"""
import json
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from database import get_connection, insert_school

def load_schools_from_json(json_file_path):
    """Load schools from JSON file and insert into database"""
    print(f"Loading schools from {json_file_path}...")

    # Load JSON data
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    schools = data.get('schools', [])
    print(f"Found {len(schools)} schools in JSON file")

    # Connect to database
    conn = get_connection()
    cursor = conn.cursor()

    try:
        inserted_count = 0
        for school in schools:
            # Prepare school data for insertion
            school_data = {
                'name': school['name'],
                'slug': school.get('slug', school['name'].lower().replace(' ', '-').replace('/', '-')),
                'type': school.get('type', 'unknown'),
                'state': school['state'],
                'city': school.get('city', school['state']),
                'area': school.get('area', ''),
                'address': school.get('address', ''),
                'latitude': school.get('latitude'),
                'longitude': school.get('longitude'),
                'curriculum': school.get('curriculum', ''),
                'levels': school.get('levels', ''),
                'boarding': school.get('boarding', False),
                'day_school': school.get('day_school', True),
                'gender': school.get('gender', 'mixed'),
                'phone': school.get('phone', ''),
                'email': school.get('email', ''),
                'website': school.get('website', ''),
                'social_links': json.dumps(school.get('social_links', {})),
                'template_summary': school.get('template_summary', ''),
                'needs_ai_enrichment': True,
                'established_year': school.get('established_year'),
                'principal_name': school.get('principal_name', ''),
                'principal_title': school.get('principal_title', ''),
                'principal_image_url': school.get('principal_image_url', ''),
                'management_info': json.dumps(school.get('management_info', {})),
                'facilities': json.dumps(school.get('facilities', [])),
                'achievements': json.dumps(school.get('achievements', [])),
                'student_life': json.dumps(school.get('student_life', [])),
                'fee_range': school.get('fee_range', ''),
                'student_count': school.get('student_count'),
                'logo_url': school.get('logo_url', ''),
                'hero_image_url': school.get('hero_image_url', ''),
                'gallery_images': json.dumps(school.get('gallery_images', [])),
                'meta_title': school.get('meta_title', ''),
                'meta_description': school.get('meta_description', ''),
                'summary_template_id': school.get('summary_template_id')
            }

            try:
                result = insert_school(conn, school_data)
                inserted_count += 1
                if inserted_count % 10 == 0:
                    print(f"Inserted {inserted_count} schools...")
            except Exception as e:
                print(f"Error inserting school {school['name']}: {e}")
                continue

        print(f"Successfully inserted {inserted_count} schools")
        conn.commit()

    except Exception as e:
        print(f"Error during bulk insert: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    # Set database environment variables for Docker
    os.environ.setdefault('DB_HOST', 'localhost')
    # Local defaults that never override values already in the environment.
    # The password is not defaulted: set DB_PASSWORD before running.
    os.environ.setdefault('DB_PORT', '5433')
    os.environ.setdefault('DB_NAME', 'nigerian_directory')
    os.environ.setdefault('DB_USER', 'postgres')

    json_file_path = os.path.join(os.path.dirname(__file__), 'seeds', 'ministry_schools.json')
    load_schools_from_json(json_file_path)