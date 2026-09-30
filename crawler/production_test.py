"""
Production Test Run
==================
Test the production crawler on a limited set of schools first.
"""

import sys
import os
import logging
import time
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from content_crawler_fixed import ContentCrawler
from database import db_manager

def production_test_run():
    """Test production crawler on limited schools"""
    
    print("🚀 PRODUCTION TEST RUN")
    print("=" * 40)
    print(f"Testing production crawler: {datetime.now().strftime('%H:%M:%S')}")
    
    # Set minimal logging to reduce noise
    logging.basicConfig(level=logging.WARNING)
    
    try:
        # Initialize crawler
        crawler = ContentCrawler()
        print("✅ Crawler initialized")
        
        # Get limited schools for testing
        schools = db_manager.get_schools_for_enrichment(limit=3)
        if not schools:
            print("❌ No schools found")
            return False
        
        print(f"📚 Testing on {len(schools)} schools:")
        for i, school in enumerate(schools, 1):
            print(f"  {i}. {school['name']} ({school.get('state', 'Unknown')})")
        
        # Process schools
        results = {'success': 0, 'failed': 0, 'total': len(schools)}
        
        for i, school in enumerate(schools, 1):
            print(f"\n[{i}/{len(schools)}] Processing: {school['name']}")
            
            start_time = time.time()
            success = crawler.crawl_school_content(school)
            end_time = time.time()
            
            if success:
                results['success'] += 1
                print(f"✅ SUCCESS ({end_time - start_time:.1f}s)")
                
                # Check if data was saved
                with db_manager.get_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            SELECT meta_title, enriched_history, enriched_academics 
                            FROM schools WHERE id = %s
                        """, (school['id'],))
                        
                        row = cursor.fetchone()
                        if row and (row[1] or row[2]):  # Has enriched content
                            print(f"   ✅ Data saved to database")
                            if row[0]:  # Has meta title
                                print(f"   🎯 SEO optimized: {row[0][:40]}...")
                        else:
                            print(f"   ⚠️ No enriched content found")
            else:
                results['failed'] += 1
                print(f"❌ FAILED ({end_time - start_time:.1f}s)")
        
        # Final results
        success_rate = results['success'] / results['total'] * 100
        print(f"\n📊 PRODUCTION TEST RESULTS:")
        print(f"   Success: {results['success']}/{results['total']} ({success_rate:.1f}%)")
        print(f"   Failed: {results['failed']}/{results['total']}")
        
        if success_rate >= 66:  # 2/3 success rate
            print(f"✅ Production test PASSED - Ready for full deployment!")
            return True
        else:
            print(f"❌ Production test FAILED - Need more fixes")
            return False
            
    except Exception as e:
        print(f"❌ Production test error: {e}")
        return False

if __name__ == "__main__":
    success = production_test_run()
    exit(0 if success else 1)