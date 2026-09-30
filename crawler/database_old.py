"""
Database connection and operations for the crawler
"""
import os
import json
import psycopg2  # type: ignore
from psycopg2.extras import RealDictCursor  # type: ignore
from datetime import datetime

def get_connection():
    """Create database connection"""
    # When running locally (not in Docker), use localhost and host port
    # When running in Docker, use service name and container port
    is_in_docker = os.path.exists('/.dockerenv')
    
    if is_in_docker:
        # In Docker, use environment variables or defaults
        db_host = os.getenv('DB_HOST', 'postgres')
        db_port = os.getenv('DB_PORT', '5432')
    else:
        # Running on host, ignore Docker-specific env vars and use host config
        db_host = 'localhost'
        db_port = '5433'
    
    return psycopg2.connect(
        host=db_host,
        port=int(db_port),
        database=os.getenv('DB_NAME', 'nigerian_directory'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'devpassword123')
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
        -- NOTE: The ON CONFLICT clause intentionally EXCLUDES enriched content columns
        -- (enriched_history, enriched_academics, enriched_campus_info, enriched_student_life,
        --  enriched_notable_alumni, enriched_recent_news, enriched_at, enrichment_status,
        --  content_sources, featured) to prevent the crawler from wiping data that was
        -- added by the enrichment pipeline. Use update_school_enrichment() for those fields.
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            state = EXCLUDED.state,
            city = EXCLUDED.city,
            area = EXCLUDED.area,
            address = EXCLUDED.address,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            curriculum = EXCLUDED.curriculum,
            levels = EXCLUDED.levels,
            boarding = EXCLUDED.boarding,
            day_school = EXCLUDED.day_school,
            gender = EXCLUDED.gender,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            website = EXCLUDED.website,
            social_links = EXCLUDED.social_links,
            template_summary = EXCLUDED.template_summary,
            needs_ai_enrichment = EXCLUDED.needs_ai_enrichment,
            established_year = EXCLUDED.established_year,
            principal_name = EXCLUDED.principal_name,
            principal_title = EXCLUDED.principal_title,
            principal_image_url = EXCLUDED.principal_image_url,
            management_info = EXCLUDED.management_info,
            facilities = EXCLUDED.facilities,
            achievements = EXCLUDED.achievements,
            student_life = EXCLUDED.student_life,
            fee_range = EXCLUDED.fee_range,
            student_count = EXCLUDED.student_count,
            logo_url = EXCLUDED.logo_url,
            hero_image_url = EXCLUDED.hero_image_url,
            gallery_images = EXCLUDED.gallery_images,
            meta_title = EXCLUDED.meta_title,
            meta_description = EXCLUDED.meta_description,
            summary_template_id = EXCLUDED.summary_template_id,
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


def update_school_enrichment(conn, school_id, enrichment_data):
    """Update enriched content columns for a school.
    
    This is the ONLY function that should write to enriched_* columns.
    The main insert_school() function intentionally excludes these columns
    to prevent the crawler from overwriting enrichment data.
    
    Args:
        conn: Database connection
        school_id: School ID to update
        enrichment_data: Dict with keys like enriched_history, enriched_academics, etc.
    """
    cursor = conn.cursor()
    
    allowed_fields = [
        'enriched_history', 'enriched_academics', 'enriched_campus_info',
        'enriched_student_life', 'enriched_notable_alumni', 'enriched_recent_news',
        'enriched_at', 'enrichment_status', 'content_sources', 'needs_ai_enrichment'
    ]
    
    updates = []
    params = []
    
    for field in allowed_fields:
        if field in enrichment_data:
            value = enrichment_data[field]
            if isinstance(value, (list, dict)):
                value = json.dumps(value)
            updates.append(f"{field} = %s")
            params.append(value)
    
    if not updates:
        cursor.close()
        return
    
    updates.append("updated_at = NOW()")
    params.append(school_id)
    
    query = f"UPDATE schools SET {', '.join(updates)} WHERE id = %s"
    
    try:
        cursor.execute(query, params)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()

def update_school_details(conn, school_id, school_data):
    """Update general school details (phone, email, etc.) from crawler.
    
    Args:
        conn: Database connection
        school_id: School ID to update
        school_data: Dict with fields to update
    """
    cursor = conn.cursor()
    
    # Define which fields the crawler is allowed to update
    allowed_fields = [
        'phone', 'email', 'address', 'logo_url', 'hero_image_url', 
        'facilities', 'social_links', 'principal_name', 'about_text'
    ]
    
    updates = []
    params = []
    
    for field in allowed_fields:
        if field in school_data:
            value = school_data[field]
            if isinstance(value, (list, dict)):
                value = json.dumps(value)
            updates.append(f"{field} = %s")
            params.append(value)
    
    if not updates:
        cursor.close()
        return
    
    updates.append("updated_at = NOW()")
    params.append(school_id)
    
    query = f"UPDATE schools SET {', '.join(updates)} WHERE id = %s"
    
    try:
        cursor.execute(query, params)
        conn.commit()
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
