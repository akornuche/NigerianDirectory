"""
Database connection and operations for the crawler
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def get_connection():
    """Create database connection"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', 5432),
        database=os.getenv('DB_NAME', 'nigerian_directory'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

def insert_school(conn, school_data):
    """Insert a new school into the database"""
    cursor = conn.cursor()
    
    query = """
        INSERT INTO schools (
            name, slug, type, state, city, area, address,
            latitude, longitude, curriculum, levels,
            boarding, day_school, gender, phone, email, website,
            social_links, template_summary, needs_ai_enrichment,
            established_year, principal_name, principal_title, principal_image_url,
            management_info, facilities, achievements, student_life,
            fee_range, student_count, logo_url, hero_image_url, gallery_images,
            meta_title, meta_description, summary_template_id
        ) VALUES (
            %(name)s, %(slug)s, %(type)s, %(state)s, %(city)s, %(area)s, %(address)s,
            %(latitude)s, %(longitude)s, %(curriculum)s, %(levels)s,
            %(boarding)s, %(day_school)s, %(gender)s, %(phone)s, %(email)s, %(website)s,
            %(social_links)s, %(template_summary)s, %(needs_ai_enrichment)s,
            %(established_year)s, %(principal_name)s, %(principal_title)s, %(principal_image_url)s,
            %(management_info)s, %(facilities)s, %(achievements)s, %(student_life)s,
            %(fee_range)s, %(student_count)s, %(logo_url)s, %(hero_image_url)s, %(gallery_images)s,
            %(meta_title)s, %(meta_description)s, %(summary_template_id)s
        )
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            curriculum = EXCLUDED.curriculum,
            levels = EXCLUDED.levels,
            boarding = EXCLUDED.boarding,
            day_school = EXCLUDED.day_school,
            template_summary = EXCLUDED.template_summary,
            updated_at = NOW()
        RETURNING id, slug
    """
    
    try:
        cursor.execute(query, school_data)
        result = cursor.fetchone()
        conn.commit()
        return result
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()

def insert_crawl_log(conn, log_data):
    """Insert a crawl log entry"""
    cursor = conn.cursor()
    
    query = """
        INSERT INTO crawl_logs (
            school_id, source_url, source_name, crawl_status,
            raw_data, parsed_data, confidence_score, error_message
        ) VALUES (
            %(school_id)s, %(source_url)s, %(source_name)s, %(crawl_status)s,
            %(raw_data)s, %(parsed_data)s, %(confidence_score)s, %(error_message)s
        )
        RETURNING id
    """
    
    try:
        cursor.execute(query, log_data)
        result = cursor.fetchone()
        conn.commit()
        return result[0]
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()

def get_school_by_slug(conn, slug):
    """Get school by slug"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM schools WHERE slug = %s", (slug,))
    result = cursor.fetchone()
    cursor.close()
    return dict(result) if result else None

def get_schools_for_enrichment(conn, limit=50):
    """Get schools needing AI enrichment"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT * FROM schools 
        WHERE needs_ai_enrichment = TRUE 
        ORDER BY claimed DESC, created_at ASC
        LIMIT %s
    """, (limit,))
    results = cursor.fetchall()
    cursor.close()
    return [dict(r) for r in results]

def update_school_summary(conn, school_id, summary, template_id):
    """Update school summary"""
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE schools SET
            template_summary = %s,
            summary_template_id = %s,
            updated_at = NOW()
        WHERE id = %s
    """, (summary, template_id, school_id))
    conn.commit()
    cursor.close()


def update_school_images(conn, school_id, logo_url=None, hero_image_url=None, gallery_images=None):
    """Update school images"""
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if logo_url:
        updates.append("logo_url = %s")
        params.append(logo_url)
    
    if hero_image_url:
        updates.append("hero_image_url = %s")
        params.append(hero_image_url)
    
    if gallery_images is not None:
        updates.append("gallery_images = %s")
        params.append(json.dumps(gallery_images))
    
    if updates:
        updates.append("updated_at = NOW()")
        params.append(school_id)
        
        query = f"UPDATE schools SET {', '.join(updates)} WHERE id = %s"
        cursor.execute(query, params)
        conn.commit()
    
    cursor.close()


def get_schools_without_images(conn, limit=100):
    """Get schools that don't have images but have websites"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT id, name, slug, website, logo_url, hero_image_url
        FROM schools 
        WHERE website IS NOT NULL 
          AND website != ''
          AND (logo_url IS NULL OR logo_url = '' OR hero_image_url IS NULL OR hero_image_url = '')
        ORDER BY claimed DESC, verified DESC, created_at DESC
        LIMIT %s
    """, (limit,))
    results = cursor.fetchall()
    cursor.close()
    return [dict(r) for r in results]


def get_all_schools_with_websites(conn):
    """Get all schools with websites for image crawling"""
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT id, name, slug, website, logo_url, hero_image_url, gallery_images
        FROM schools 
        WHERE website IS NOT NULL AND website != ''
        ORDER BY claimed DESC, verified DESC
    """)
    results = cursor.fetchall()
    cursor.close()
    return [dict(r) for r in results]
