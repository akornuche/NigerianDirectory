"""
Quick Integration Test for Bug Fixes
===================================
Test just one school to validate the fixes work.
"""

import sys
import os
import logging
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from content_crawler_fixed import ContentCrawler
from database import db_manager

def quick_test():
    """Test one school quickly to validate fixes"""
    
    print("🔧 QUICK INTEGRATION TEST")
    print("=" * 40)
    print(f"Testing fixes: {datetime.now().strftime('%H:%M:%S')}")
    
    # Set minimal logging
    logging.basicConfig(level=logging.ERROR)
    
    try:
        crawler = ContentCrawler()
        print("✅ Crawler initialized")
        
        # Get one school for quick test
        schools = db_manager.get_schools_for_enrichment(limit=1)
        if not schools:
            print("❌ No schools found")
            return False
        
        school = schools[0]
        print(f"📚 Testing school: {school['name']}")
        
        # Test content crawling
        success = crawler.crawl_school_content(school)
        
        if success:
            print("✅ Content crawling successful!")
            
            # Check if data was saved
            with db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT meta_title, enriched_history 
                        FROM schools WHERE id = %s
                    """, (school['id'],))
                    
                    row = cursor.fetchone()
                    if row and row[0]:  # meta_title exists
                        print("✅ Data saved to database!")
                        print(f"   Title: {row[0][:50]}...")
                        return True
                    else:
                        print("❌ No data saved to database")
                        return False
        else:
            print("❌ Content crawling failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = quick_test()
    exit(0 if success else 1)