"""
Fixed Database Operations for Nigerian Directory Crawler
======================================================
Handles database connections and operations with proper schema alignment,
error handling, and data validation.
"""

import os
import json
import logging
import psycopg2
import psycopg2.extras
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dotenv import load_dotenv

# Import retry handler
from retry_handler import retry_handler, retry_on_database_error

load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages database connections and operations for the crawler
    """
    
    def __init__(self):
        self.connection_pool = None
        self._connection = None
    
    @retry_on_database_error(max_retries=5)
    def get_connection(self):
        """Create database connection with proper environment detection"""
        # Detect if running in Docker container
        is_in_docker = os.path.exists('/.dockerenv')
        
        if is_in_docker:
            # In Docker, use service names and container ports
            db_host = os.getenv('DB_HOST', 'postgres')
            db_port = os.getenv('DB_PORT', '5432')
        else:
            # Running on host, use localhost and mapped ports
            db_host = 'localhost'
            db_port = '5433'  # Docker mapped port
        
        db_config = {
            'host': db_host,
            'port': int(db_port),
            'database': os.getenv('DB_NAME', 'nigerian_directory'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'devpassword123'),
            'cursor_factory': psycopg2.extras.RealDictCursor
        }
        
        logger.info(f"Connecting to database at {db_host}:{db_port}")
        
        try:
            connection = psycopg2.connect(**db_config)
            connection.set_session(autocommit=False)
            return connection
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def validate_json_field(self, data: Any) -> str:
        """Validate and serialize JSON data"""
        if data is None:
            return None
        
        if isinstance(data, str):
            try:
                # Test if it's valid JSON
                json.loads(data)
                return data
            except json.JSONDecodeError:
                # If not valid JSON, treat as string and wrap
                return json.dumps([data])
        
        if isinstance(data, (list, dict)):
            return json.dumps(data)
        
        # For other types, convert to string and wrap in array
        return json.dumps([str(data)])
    
    def prepare_school_data(self, school_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare school data with proper field mapping and validation
        """
        # Define field mappings (crawler_field -> database_field)
        field_mappings = {
            'school_name': 'name',
            'school_type': 'type',
            'school_state': 'state',
            'school_city': 'city',
            'school_area': 'area',
        }
        
        # Apply field mappings
        prepared_data = {}
        for key, value in school_data.items():
            db_field = field_mappings.get(key, key)
            prepared_data[db_field] = value
        
        # Ensure required fields have defaults
        defaults = {
            'institution_category': 'school',
            'boarding': False,
            'day_school': True,
            'needs_ai_enrichment': True,
            'social_links': {},
            'management_info': [],
            'facilities': [],
            'achievements': [],
            'student_life': {},
            'gallery_images': [],
            'enriched_notable_alumni': [],
            'enriched_recent_news': [],
            'content_sources': [],
            'claimed': False,
            'verified': False,
            'featured': False
        }
        
        for field, default_value in defaults.items():
            if field not in prepared_data or prepared_data[field] is None:
                prepared_data[field] = default_value
        
        # Validate and serialize JSON fields
        json_fields = [
            'social_links', 'management_info', 'facilities', 'achievements',
            'student_life', 'gallery_images', 'enriched_notable_alumni',
            'enriched_recent_news', 'content_sources'
        ]
        
        for field in json_fields:
            if field in prepared_data:
                prepared_data[field] = self.validate_json_field(prepared_data[field])
        
        return prepared_data
    
    def insert_school(self, school_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Insert a new school with proper error handling and conflict resolution
        """
        conn = self.get_connection()
        
        try:
            prepared_data = self.prepare_school_data(school_data)
            
            # Build dynamic INSERT query based on available fields
            fields = []
            placeholders = []
            values = []
            
            # Define all possible school fields in correct order
            all_fields = [
                'name', 'slug', 'institution_category', 'type', 'state', 'city', 'area',
                'address', 'latitude', 'longitude', 'curriculum', 'levels',
                'boarding', 'day_school', 'gender', 'phone', 'email', 'website',
                'social_links', 'template_summary', 'ai_summary', 'needs_ai_enrichment',
                'summary_template_id', 'content_sources', 'established_year',
                'principal_name', 'principal_title', 'principal_image_url',
                'management_info', 'facilities', 'achievements', 'student_life',
                'fee_range', 'student_count', 'logo_url', 'hero_image_url',
                'gallery_images', 'meta_title', 'meta_description',
                'claimed', 'verified', 'featured'
            ]
            
            for field in all_fields:
                if field in prepared_data:
                    fields.append(field)
                    placeholders.append('%s')
                    values.append(prepared_data[field])
            
            # Build the query
            fields_str = ', '.join(fields)
            placeholders_str = ', '.join(placeholders)
            
            # Create ON CONFLICT update clause (excluding enrichment fields)
            update_fields = []
            for field in fields:
                if not field.startswith('enriched_') and field not in ['id', 'uuid', 'slug', 'created_at']:
                    update_fields.append(f"{field} = EXCLUDED.{field}")
            
            update_fields.append("updated_at = NOW()")
            update_clause = ', '.join(update_fields)
            
            query = f"""
                INSERT INTO schools ({fields_str})
                VALUES ({placeholders_str})
                ON CONFLICT (slug) DO UPDATE SET
                    {update_clause}
                RETURNING id, slug, name
            """
            
            with conn.cursor() as cursor:
                cursor.execute(query, values)
                result = cursor.fetchone()
                conn.commit()
                
                logger.info(f"School saved: {result['name']} (ID: {result['id']})")
                return dict(result)
                
        except Exception as e:
            conn.rollback()
            logger.error(f"Error inserting school: {e}")
            logger.error(f"School data: {school_data}")
            raise
        finally:
            conn.close()
    
    @retry_on_database_error(max_retries=3)
    def update_school_enrichment(self, school_id: int, enrichment_data: Dict[str, Any]) -> bool:
        """
        Update enriched content for a school
        """
        conn = self.get_connection()
        
        try:
            # Prepare enrichment data
            allowed_fields = [
                'enriched_history', 'enriched_academics', 'enriched_campus_info',
                'enriched_student_life', 'enriched_notable_alumni', 'enriched_recent_news',
                'content_sources', 'enriched_at', 'enrichment_status', 'needs_ai_enrichment',
                'template_summary', 'ai_summary',
                # SEO fields — these are the actual column names in the DB
                'meta_title', 'meta_description',
            ]
            
            updates = []
            values = []
            
            for field in allowed_fields:
                if field in enrichment_data and enrichment_data[field] is not None:
                    updates.append(f"{field} = %s")
                    
                    # Handle JSON fields
                    if field in ['enriched_notable_alumni', 'enriched_recent_news', 'content_sources']:
                        values.append(self.validate_json_field(enrichment_data[field]))
                    else:
                        values.append(enrichment_data[field])
            
            if not updates:
                logger.warning("No valid enrichment data to update")
                return False
            
            # Add enriched_at timestamp
            if 'enriched_at' not in enrichment_data:
                updates.append("enriched_at = NOW()")
            
            updates.append("updated_at = NOW()")
            values.append(school_id)
            
            query = f"""
                UPDATE schools
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING id, name
            """
            
            with conn.cursor() as cursor:
                cursor.execute(query, values)
                result = cursor.fetchone()
                
                if result:
                    conn.commit()
                    logger.info(f"Enrichment updated for school: {result['name']} (ID: {result['id']})")
                    return True
                else:
                    logger.warning(f"No school found with ID: {school_id}")
                    return False
                    
        except Exception as e:
            conn.rollback()
            logger.error(f"Error updating enrichment for school {school_id}: {e}")
            raise
        finally:
            conn.close()
    
    def update_school_images(self, school_id: int, logo_url: str = None, 
                           hero_image_url: str = None, gallery_images: List[str] = None) -> bool:
        """
        Update school images
        """
        conn = self.get_connection()
        
        try:
            updates = []
            values = []
            
            if logo_url:
                updates.append("logo_url = %s")
                values.append(logo_url)
            
            if hero_image_url:
                updates.append("hero_image_url = %s")
                values.append(hero_image_url)
            
            if gallery_images:
                updates.append("gallery_images = %s")
                values.append(json.dumps(gallery_images))
            
            if not updates:
                return False
            
            updates.append("updated_at = NOW()")
            values.append(school_id)
            
            query = f"""
                UPDATE schools
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING id, name
            """
            
            with conn.cursor() as cursor:
                cursor.execute(query, values)
                result = cursor.fetchone()
                
                if result:
                    conn.commit()
                    logger.info(f"Images updated for school: {result['name']} (ID: {result['id']})")
                    return True
                else:
                    logger.warning(f"No school found with ID: {school_id}")
                    return False
                    
        except Exception as e:
            conn.rollback()
            logger.error(f"Error updating images for school {school_id}: {e}")
            raise
        finally:
            conn.close()
    
    @retry_on_database_error(max_retries=3)
    def get_schools_for_enrichment(self, limit: int = 500, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get schools that need enrichment — skips already-crawled schools
        """
        conn = self.get_connection()
        
        try:
            query = """
                SELECT id, name, slug, type, state, city, area, website,
                       established_year, curriculum, levels, boarding, gender,
                       facilities, achievements, enriched_history, enriched_academics,
                       content_sources, needs_ai_enrichment
                FROM schools
                WHERE (enriched_history IS NULL OR enriched_history = '')
                   AND (enriched_academics IS NULL OR enriched_academics = '')
                ORDER BY verified DESC, claimed DESC, name
                LIMIT %s OFFSET %s
            """
            
            with conn.cursor() as cursor:
                cursor.execute(query, (limit, offset))
                results = cursor.fetchall()
                
                # Convert RealDictRow to regular dicts
                schools = []
                for row in results:
                    school = dict(row)
                    
                    # Parse JSON fields
                    json_fields = ['facilities', 'achievements', 'content_sources']
                    for field in json_fields:
                        if school[field] and isinstance(school[field], str):
                            try:
                                school[field] = json.loads(school[field])
                            except json.JSONDecodeError:
                                school[field] = []
                    
                    schools.append(school)
                
                return schools
                
        except Exception as e:
            logger.error(f"Error fetching schools for enrichment: {e}")
            raise
        finally:
            conn.close()
    
    def insert_crawl_log(self, log_data: Dict[str, Any]) -> Optional[int]:
        """
        Insert a crawl log entry
        """
        conn = self.get_connection()
        
        try:
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
            
            # Prepare log data
            prepared_log = {
                'school_id': log_data.get('school_id'),
                'source_url': log_data.get('source_url'),
                'source_name': log_data.get('source_name'),
                'crawl_status': log_data.get('crawl_status', 'pending'),
                'raw_data': self.validate_json_field(log_data.get('raw_data')),
                'parsed_data': self.validate_json_field(log_data.get('parsed_data')),
                'confidence_score': log_data.get('confidence_score'),
                'error_message': log_data.get('error_message')
            }
            
            with conn.cursor() as cursor:
                cursor.execute(query, prepared_log)
                result = cursor.fetchone()
                conn.commit()
                
                return result['id'] if result else None
                
        except Exception as e:
            conn.rollback()
            logger.error(f"Error inserting crawl log: {e}")
            raise
        finally:
            conn.close()
    
    def test_connection(self) -> bool:
        """
        Test database connection
        """
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1 as test")
                result = cursor.fetchone()
                conn.close()
                
                if result and result['test'] == 1:
                    logger.info("✅ Database connection test successful")
                    return True
                else:
                    logger.error("❌ Database connection test failed")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Database connection test failed: {e}")
            return False


# Global database manager instance
db_manager = DatabaseManager()

# Convenience functions for backward compatibility
def get_connection():
    """Get database connection (backward compatibility)"""
    return db_manager.get_connection()

def insert_school(conn, school_data):
    """Insert school (backward compatibility)"""
    # Close the provided connection since we'll use our own
    if conn:
        conn.close()
    return db_manager.insert_school(school_data)

def update_school_enrichment(conn, school_id, enrichment_data):
    """Update school enrichment (backward compatibility)"""
    if conn:
        conn.close()
    return db_manager.update_school_enrichment(school_id, enrichment_data)

def update_school_images(conn, school_id, logo_url=None, hero_image_url=None, gallery_images=None):
    """Update school images (backward compatibility)"""
    if conn:
        conn.close()
    return db_manager.update_school_images(school_id, logo_url, hero_image_url, gallery_images)

def insert_crawl_log(conn, log_data):
    """Insert crawl log (backward compatibility)"""
    if conn:
        conn.close()
    return db_manager.insert_crawl_log(log_data)


if __name__ == "__main__":
    # Test the database connection and operations
    print("Testing database connection and operations...")
    print("=" * 60)
    
    # Test connection
    if db_manager.test_connection():
        print("✅ Database connection successful")
    else:
        print("❌ Database connection failed")
        exit(1)
    
    # Test getting schools for enrichment
    try:
        schools = db_manager.get_schools_for_enrichment(limit=3)
        print(f"✅ Found {len(schools)} schools needing enrichment")
        
        for school in schools[:2]:
            print(f"  - {school['name']} ({school['state']}, {school['area']})")
    
    except Exception as e:
        print(f"❌ Error getting schools: {e}")
    
    print("\n" + "=" * 60)
    print("Database operations test complete!")