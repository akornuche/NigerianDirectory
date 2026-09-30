"""
Test the integrated website extractor with content crawler
"""

import sys
import os
import logging

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from content_crawler_fixed import ContentCrawler
from database import db_manager

def test_website_integration():
    """Test website extraction integrated with content crawler"""
    
    # Initialize crawler
    crawler = ContentCrawler()
    
    # Get a school with a website for testing
    all_schools = db_manager.get_schools_for_enrichment(limit=20)
    schools = [s for s in all_schools if s.get('website')][:2]
    
    print("Testing Website Integration")
    print("=" * 50)
    
    if not schools:
        print("❌ No schools with websites found")
        return
    
    print(f"Found {len(schools)} schools with websites")
    
    for school in schools:
        print(f"\n🧪 Testing: {school['name']} ({school['state']})")
        print(f"   Website: {school['website']}")
        
        # Test the integrated crawler
        success = crawler.crawl_school_content(school)
        
        if success:
            print(f"✅ Integration successful!")
            
            # Check what was saved to database
            try:
                with db_manager.get_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute(
                            "SELECT enriched_history, enriched_academics FROM schools WHERE id = %s",
                            (school['id'],)
                        )
                        enrichment = cursor.fetchone()
                        
                        if enrichment:
                            history = enrichment[0] or ""
                            academics = enrichment[1] or ""
                            print(f"   History content: {len(history)} chars")
                            print(f"   Academic content: {len(academics)} chars")
            except Exception as e:
                print(f"   Database check error: {e}")
        else:
            print(f"❌ Integration failed")
    
    # Print final statistics
    print(f"\n📊 Final Statistics:")
    stats = crawler.stats
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # Print website extractor stats
    website_stats = crawler.website_extractor.get_stats()
    print(f"\n🌐 Website Extractor Stats:")
    for key, value in website_stats.items():
        print(f"   {key}: {value}")

if __name__ == "__main__":
    # Set logging level
    logging.basicConfig(level=logging.INFO)
    
    test_website_integration()