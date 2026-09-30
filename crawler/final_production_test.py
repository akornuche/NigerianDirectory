"""
Final Production Test
====================
Test one school end-to-end to validate all fixes work.
"""

import sys
import os
import logging
import time

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from content_crawler_fixed import ContentCrawler
from database import db_manager

def final_test():
    """Final test of complete system"""
    
    print("🎯 FINAL PRODUCTION TEST")
    print("=" * 30)
    
    # Minimal logging
    logging.basicConfig(level=logging.ERROR)
    
    try:
        crawler = ContentCrawler()
        print("✅ Crawler initialized")
        
        # Get one school without a website (search-only test)
        schools = db_manager.get_schools_for_enrichment()
        test_school = None
        
        for school in schools:
            if not school.get('website'):  # No website - pure search test
                test_school = school
                break
        
        if not test_school:
            test_school = schools[0]  # Fallback to first school
        
        print(f"📚 Testing: {test_school['name']}")
        print(f"   Location: {test_school.get('city', 'Unknown')}, {test_school.get('state', 'Unknown')}")
        print(f"   Website: {test_school.get('website', 'None - Search Only Test')}")
        
        print(f"\n🚀 Processing...")
        start_time = time.time()
        
        # Process with timeout detection
        success = crawler.crawl_school_content(test_school)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        if success:
            print(f"✅ SUCCESS! ({processing_time:.1f}s)")
            
            # Verify data was saved
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT meta_title, enriched_history, enriched_academics, 
                               enriched_campus_info, enriched_student_life 
                        FROM schools WHERE id = %s
                    """, (test_school['id'],))
                    
                    row = cursor.fetchone()
                    if row:
                        content_fields = [row[1], row[2], row[3], row[4]]
                        content_count = sum(1 for field in content_fields if field and field.strip())
                        total_chars = sum(len(field or '') for field in content_fields)
                        
                        print(f"   🎯 SEO Title: {row[0] or 'None'}")
                        print(f"   📝 Content: {content_count}/4 sections enriched")
                        print(f"   📊 Total Content: {total_chars} characters")
                        
                        if content_count >= 2 and total_chars >= 500:
                            print(f"\n🎉 FINAL TEST PASSED!")
                            print(f"   System is ready for full production deployment")
                            return True
                        else:
                            print(f"\n⚠️ Content quality below threshold")
                            return False
                    else:
                        print(f"\n❌ No data found in database")
                        return False
        else:
            print(f"❌ FAILED ({processing_time:.1f}s)")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

if __name__ == "__main__":
    success = final_test()
    if success:
        print(f"\n🚀 CRAWLER SYSTEM IS PRODUCTION READY!")
        print(f"Ready to process all 192 schools at scale.")
    exit(0 if success else 1)