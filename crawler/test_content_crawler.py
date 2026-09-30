#!/usr/bin/env python3
"""
Test the content crawler functionality
"""

from content_crawler_fixed import ContentCrawler
from database import db_manager
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_content_crawler():
    print('Testing new content crawler...')
    print('=' * 50)
    
    # Test database connection
    if db_manager.test_connection():
        print('✅ Database connection OK')
    else:
        print('❌ Database connection failed')
        return False
    
    # Get a test school
    schools = db_manager.get_schools_for_enrichment(limit=1)
    if schools:
        school = schools[0]
        print(f'✅ Found test school: {school["name"]} ({school["state"]})')
        
        # Test crawler on one school
        crawler = ContentCrawler()
        print('\nTesting crawler on one school...')
        print('-' * 30)
        
        success = crawler.crawl_school_content(school)
        
        print('\n' + '-' * 30)
        if success:
            print('✅ Content crawler test successful')
        else:
            print('❌ Content crawler test failed')
            
        print(f'Stats: {crawler.stats}')
        
        return success
    else:
        print('❌ No schools found for testing')
        return False

if __name__ == "__main__":
    test_content_crawler()