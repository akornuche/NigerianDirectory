#!/usr/bin/env python3
"""
Direct database seeder for schools - bypasses npm dependencies
"""
import json
import os
import psycopg2
from slugify import slugify
import sys

# Database connection. Credentials come from the environment rather than the
# source file; the defaults match the local docker-compose database except
# for the password, which must be supplied.
password = os.environ.get("DB_PASSWORD")
if not password:
    print("Set DB_PASSWORD (and optionally DB_HOST, DB_PORT, DB_NAME, DB_USER).")
    sys.exit(1)

conn = psycopg2.connect(
    host=os.environ.get("DB_HOST", "localhost"),
    port=int(os.environ.get("DB_PORT", "5433")),
    database=os.environ.get("DB_NAME", "nigerian_directory"),
    user=os.environ.get("DB_USER", "postgres"),
    password=password,
)
cur = conn.cursor()

# Read seed data (path relative to this file, so it works on any machine)
seed_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crawler", "seeds", "ministry_schools.json")
try:
    with open(seed_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"Error reading seed file: {e}")
    sys.exit(1)

schools = data['schools']
print(f"🏫 Seeding {len(schools)} schools from ministry_schools.json")
print(f"Source: {data['metadata']['description']}\n")

inserted = 0
updated = 0
failed = 0

for school in schools:
    try:
        slug = slugify(school['name'], lowercase=True)

        # Build a meaningful template_summary from available fields
        parts = []
        if school.get('levels'):
            parts.append(f"{school['levels']} school")
        if school.get('curriculum'):
            parts.append(f"offering {school['curriculum']} curriculum")
        if school.get('boarding'):
            parts.append("with boarding facilities")
        if school.get('gender') and school['gender'] != 'co-ed':
            parts.append(f"({school['gender']})")
        summary = f"{school['name']} is a {school.get('type', 'private')} {', '.join(parts)} located in {school.get('area', '')}, {school['state']}, Nigeria."

        cur.execute("""
            INSERT INTO schools (
                name, slug, type, state, city, area,
                curriculum, levels, boarding, day_school, gender,
                website, established_year, needs_ai_enrichment,
                template_summary, meta_title, meta_description
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s
            )
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                state = EXCLUDED.state,
                city = EXCLUDED.city,
                area = EXCLUDED.area,
                curriculum = EXCLUDED.curriculum,
                levels = EXCLUDED.levels,
                boarding = EXCLUDED.boarding,
                day_school = EXCLUDED.day_school,
                gender = EXCLUDED.gender,
                website = COALESCE(EXCLUDED.website, schools.website),
                established_year = COALESCE(EXCLUDED.established_year, schools.established_year),
                template_summary = EXCLUDED.template_summary,
                updated_at = NOW()
            RETURNING (xmax = 0) AS is_insert
        """, [
            school['name'],
            slug,
            school.get('type', 'private'),
            school['state'],
            school.get('city', ''),
            school.get('area', ''),
            school.get('curriculum'),
            school.get('levels'),
            school.get('boarding', False),
            school.get('day_school', True),
            school.get('gender', 'co-ed'),
            school.get('website'),
            school.get('established_year'),
            True,  # needs_ai_enrichment
            summary,
            f"{school['name']} - {school.get('area', '')}, {school['state']} | NigerianDirectory",
            f"Find {school['name']} in {school.get('area', '')}, {school['state']}. {school.get('curriculum', 'Nigerian')} curriculum {school.get('type', '')} school. View details, contacts and more."
        ])
        
        is_insert = cur.fetchone()[0]
        if is_insert:
            inserted += 1
        else:
            updated += 1
            
    except Exception as e:
        failed += 1
        print(f"  Error seeding {school['name']}: {e}")

conn.commit()
cur.close()
conn.close()

print(f"\n✓ Seeding complete!")
print(f"  • Inserted: {inserted}")
print(f"  • Updated: {updated}")
print(f"  • Failed: {failed}")
