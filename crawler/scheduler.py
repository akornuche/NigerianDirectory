"""
Crawler Scheduler and Batch Processor
Main entry point for the crawling pipeline
"""
import os
import sys
import json
import argparse
from datetime import datetime
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

from database import (
    get_connection, insert_school, insert_crawl_log,
    get_school_by_slug, update_school_summary
)
from fetcher import fetch_url
from parser import parse_school_page
from enrichment import (
    generate_summary, generate_meta_title, generate_meta_description,
    generate_blog_meta_title, generate_blog_meta_description
)
from deep_research_crawler import DeepResearchCrawler

def generate_slug(name, state, area):
    """Generate URL-friendly slug"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_-]+', '-', slug)
    slug = slug.strip('-')
    return slug

def process_seed_school(school_data, conn):
    """
    Process a single school from seed data
    
    Args:
        school_data: dict with school information from seed file
        conn: database connection
        
    Returns:
        dict: result with success status and details
    """
    result = {
        'name': school_data.get('name'),
        'success': False,
        'school_id': None,
        'crawled': False,
        'error': None
    }
    
    try:
        # Generate slug
        slug = generate_slug(
            school_data['name'],
            school_data['state'],
            school_data.get('area', '')
        )
        
        # Generate template summary
        summary, template_id = generate_summary(school_data)
        
        # Prepare school record
        school_record = {
            'name': school_data['name'],
            'slug': slug,
            'type': school_data.get('type'),
            'state': school_data['state'],
            'city': school_data.get('city'),
            'area': school_data.get('area'),
            'address': school_data.get('address'),
            'latitude': school_data.get('latitude'),
            'longitude': school_data.get('longitude'),
            'curriculum': school_data.get('curriculum'),
            'levels': school_data.get('levels'),
            'boarding': school_data.get('boarding', False),
            'day_school': school_data.get('day_school', True),
            'gender': school_data.get('gender', 'co-ed'),
            'phone': school_data.get('phone'),
            'email': school_data.get('email'),
            'website': school_data.get('website'),
            'social_links': json.dumps(school_data.get('social_links', {})),
            'template_summary': summary,
            'needs_ai_enrichment': True,
            'established_year': school_data.get('established_year'),
            'principal_name': school_data.get('principal_name'),
            'principal_title': school_data.get('principal_title'),
            'principal_image_url': school_data.get('principal_image_url'),
            'management_info': json.dumps(school_data.get('management_info', [])),
            'facilities': json.dumps(school_data.get('facilities', [])),
            'achievements': json.dumps(school_data.get('achievements', [])),
            'student_life': json.dumps(school_data.get('student_life', {})),
            'fee_range': school_data.get('fee_range'),
            'student_count': school_data.get('student_count'),
            'logo_url': school_data.get('logo_url'),
            'hero_image_url': school_data.get('hero_image_url'),
            'gallery_images': json.dumps(school_data.get('gallery_images', [])),
            'meta_title': generate_meta_title(school_data),
            'meta_description': generate_meta_description(school_data),
            'summary_template_id': template_id
        }
        
        # Insert into database
        db_result = insert_school(conn, school_record)
        school_id = db_result[0]
        result['school_id'] = school_id
        result['slug'] = db_result[1]
        
        # Optionally crawl the website for additional data
        source_url = school_data.get('source_url') or school_data.get('website')
        
        if source_url and source_url != 'ministry_list':
            crawl_result = crawl_school_website(school_id, source_url, conn)
            result['crawled'] = crawl_result.get('success', False)
            
            # Update school with crawled data if successful
            if crawl_result.get('success'):
                from typing import Dict, Any
                raw_data = crawl_result.get('data')
                crawled_data: Dict[str, Any] = raw_data if isinstance(raw_data, dict) else {}
                
                # Update any missing fields from crawl
                updates = {}
                if not school_record.get('phone') and crawled_data.get('phone'):
                    updates['phone'] = crawled_data['phone']
                if not school_record.get('email') and crawled_data.get('email'):
                    updates['email'] = crawled_data['email']
                if not school_record.get('address') and crawled_data.get('address'):
                    updates['address'] = crawled_data['address']
                if crawled_data.get('logo_url'):
                    updates['logo_url'] = crawled_data['logo_url']
                if crawled_data.get('hero_image_url'):
                    updates['hero_image_url'] = crawled_data['hero_image_url']
                if crawled_data.get('facilities'):
                    # Merge facilities
                    existing = school_data.get('facilities', [])
                    updates['facilities'] = json.dumps(list(set(existing + crawled_data['facilities'])))
                if crawled_data.get('social_links'):
                    updates['social_links'] = json.dumps(crawled_data['social_links'])
                if crawled_data.get('gallery_images'):
                    updates['gallery_images'] = json.dumps(crawled_data['gallery_images'])
                if crawled_data.get('principal_name'):
                    updates['principal_name'] = crawled_data['principal_name']
                if crawled_data.get('about_text') and not school_record.get('about_text'):
                    updates['about_text'] = crawled_data['about_text']
                
                # Apply updates to database
                if updates:
                    from database import update_school_details
                    update_school_details(conn, school_id, updates)
                    print(f"    ✨ Updated school record with {len(updates)} crawled fields")
        else:
            # Log as seed-only entry
            log_data = {
                'school_id': school_id,
                'source_url': source_url or 'ministry_list',
                'source_name': 'seed_file',
                'crawl_status': 'success',
                'raw_data': json.dumps(school_data),
                'parsed_data': json.dumps({}),
                'confidence_score': 0.5,  # Lower confidence for seed-only
                'error_message': None
            }
            insert_crawl_log(conn, log_data)
            
        # 3. Deep Research (Bing, DuckDuckGo, Wikipedia)
        try:
            print(f"    🔍 Performing deep research for {school_data['name']}...")
            researcher = DeepResearchCrawler()
            research_school = {
                'id': school_id,
                'name': school_data['name'],
                'state': school_data['state'],
                'city': school_data.get('city', ''),
                'website': school_data.get('website', '')
            }
            researcher.enrich_school(research_school)
        except Exception as e:
            print(f"    ⚠️ Deep research failed for {school_data['name']}: {e}")
            
        result['success'] = True
        
    except Exception as e:
        result['error'] = str(e)
        print(f"  ✗ Error processing {school_data.get('name')}: {e}")
    
    return result


def crawl_school_website(school_id, url, conn):
    """
    Crawl a school's website and extract additional information
    
    Args:
        school_id: database ID of the school
        url: URL to crawl
        conn: database connection
        
    Returns:
        dict with crawl results
    """
    result = {
        'success': False,
        'data': None,
        'confidence': 0.0,
        'error': None
    }
    
    try:
        print(f"    🌐 Fetching {url}...")
        fetch_result = fetch_url(url)
        
        if not fetch_result['success']:
            # Log failed crawl
            log_data = {
                'school_id': school_id,
                'source_url': url,
                'source_name': 'website',
                'crawl_status': 'failure',
                'raw_data': json.dumps({}),
                'parsed_data': json.dumps({}),
                'confidence_score': 0.0,
                'error_message': fetch_result['error']
            }
            insert_crawl_log(conn, log_data)
            
            result['error'] = fetch_result['error']
            return result
        
        # Parse the HTML
        print(f"    📄 Parsing content...")
        parsed_data, confidence = parse_school_page(fetch_result['html'], url)
        
        # Log successful crawl
        log_data = {
            'school_id': school_id,
            'source_url': fetch_result['url'],
            'source_name': 'website',
            'crawl_status': 'success' if confidence > 0.3 else 'partial',
            'raw_data': json.dumps({'html_length': len(fetch_result['html'])}),
            'parsed_data': json.dumps(parsed_data),
            'confidence_score': confidence,
            'error_message': None
        }
        insert_crawl_log(conn, log_data)
        
        result['success'] = True
        result['data'] = parsed_data
        result['confidence'] = confidence
        
    except Exception as e:
        result['error'] = str(e)
        
        # Log error
        log_data = {
            'school_id': school_id,
            'source_url': url,
            'source_name': 'website',
            'crawl_status': 'failure',
            'raw_data': json.dumps({}),
            'parsed_data': json.dumps({}),
            'confidence_score': 0.0,
            'error_message': str(e)
        }
        insert_crawl_log(conn, log_data)
    
    return result


def run_initial_batch(count=200):
    """
    Run initial batch processing of seed schools
    
    Args:
        count: maximum number of schools to process
    """
    print("\n" + "="*60)
    print("🇳🇬 NigerianDirectory.com - Initial Crawler Batch")
    print("="*60 + "\n")
    
    # Load seed data
    seed_file = os.path.join(os.path.dirname(__file__), 'seeds', 'ministry_schools.json')
    
    if not os.path.exists(seed_file):
        print(f"❌ Seed file not found: {seed_file}")
        sys.exit(1)
    
    with open(seed_file, 'r', encoding='utf-8') as f:
        seed_data = json.load(f)
    
    schools = seed_data.get('schools', [])[:count]
    
    print(f"📚 Loaded {len(schools)} schools from seed file")
    print(f"📅 Source: {seed_data.get('metadata', {}).get('sources', ['Unknown'])}")
    print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n" + "-"*60 + "\n")
    
    # Connect to database
    try:
        conn = get_connection()
        print("✅ Database connected\n")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    # Process schools
    from typing import Dict, Any
    results: Dict[str, Any] = {
        'success': 0,
        'failed': 0,
        'crawled': 0,
        'schools': []
    }
    
    for i, school in enumerate(schools, 1):
        print(f"[{i}/{len(schools)}] Processing: {school['name']}")
        
        result = process_seed_school(school, conn)
        
        if result['success']:
            results['success'] += 1
            if result['crawled']:
                results['crawled'] += 1
            print(f"  ✓ Added (ID: {result['school_id']}, Slug: {result.get('slug', 'N/A')})")
        else:
            results['failed'] += 1
            print(f"  ✗ Failed: {result['error']}")
        
        results['schools'].append(result)
    
    # Close connection
    conn.close()
    
    # Print summary
    print("\n" + "="*60)
    print("📊 BATCH COMPLETE")
    print("="*60)
    print(f"  ✓ Successful: {results['success']}")
    print(f"  ✗ Failed: {results['failed']}")
    print(f"  🌐 Websites crawled: {results['crawled']}")
    print(f"  ⏰ Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    return results


def regenerate_summaries(limit=100):
    """Regenerate template summaries for existing schools"""
    print("\n" + "="*60)
    print("🔄 Regenerating Template Summaries")
    print("="*60 + "\n")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get schools needing summary regeneration
    cursor.execute("""
        SELECT id, name, type, state, city, area, curriculum, levels,
               boarding, day_school, gender, principal_name, principal_title,
               facilities, achievements
        FROM schools
        WHERE needs_ai_enrichment = TRUE
        ORDER BY created_at ASC
        LIMIT %s
    """, (limit,))
    
    schools = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    
    print(f"📚 Found {len(schools)} schools to process\n")
    
    updated = 0
    for row in schools:
        school_dict = dict(zip(columns, row))
        school_dict['facilities'] = school_dict.get('facilities') or []
        school_dict['achievements'] = school_dict.get('achievements') or []
        
        summary, template_id = generate_summary(school_dict)
        update_school_summary(conn, school_dict['id'], summary, template_id)
        
        print(f"  ✓ Updated: {school_dict['name']} (Template: {template_id})")
        updated += 1
    
    conn.close()
    
    print(f"\n✅ Updated {updated} school summaries")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='NigerianDirectory Crawler')
    parser.add_argument('--batch', choices=['initial', 'refresh'], default='initial',
                       help='Batch type to run')
    parser.add_argument('--count', type=int, default=200,
                       help='Number of schools to process')
    parser.add_argument('--regenerate-summaries', action='store_true',
                       help='Regenerate template summaries')
    parser.add_argument('--crawl-images', action='store_true',
                       help='Crawl images for schools')
    parser.add_argument('--force-images', action='store_true',
                       help='Force recrawl images even if they exist')
    parser.add_argument('--school', type=str,
                       help='Specific school ID or slug to process')
    
    args = parser.parse_args()
    
    if args.crawl_images:
        from image_crawler import crawl_images_for_all_schools, crawl_images_for_school
        if args.school:
            crawl_images_for_school(args.school)
        else:
            crawl_images_for_all_schools(limit=args.count, force_recrawl=args.force_images)
    elif args.regenerate_summaries:
        regenerate_summaries(args.count)
    elif args.batch == 'initial':
        run_initial_batch(args.count)
    else:
        print(f"Unknown batch type: {args.batch}")
        sys.exit(1)


if __name__ == '__main__':
    main()
