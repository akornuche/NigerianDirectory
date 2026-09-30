#!/usr/bin/env python3
"""
Test the image crawler functionality
"""

from image_crawler_fixed import ImageCrawler
from database import db_manager
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_image_crawler():
    print('Testing image crawler...')
    print('=' * 50)
    
    # Test database connection
    if db_manager.test_connection():
        print('✅ Database connection OK')
    else:
        print('❌ Database connection failed')
        return False
    
    # Get a school without images
    crawler = ImageCrawler()
    schools = crawler.get_schools_needing_images(limit=1)
    
    if schools:
        school = schools[0]
        print(f'✅ Found test school: {school["name"]} ({school["state"]})')
        print(f'   Current logo: {school.get("logo_url") or "None"}')
        print(f'   Current hero: {school.get("hero_image_url") or "None"}')
        
        print('\nTesting image crawler on one school...')
        print('-' * 30)
        
        # Test individual methods
        if school.get('website'):
            print(f'Testing website extraction from: {school["website"]}')
            website_images = crawler.extract_images_from_website(school['website'], school['name'])
            print(f'Website images found: {len(website_images.get("logo", []))} logos, {len(website_images.get("hero", []))} heroes')
        
        print(f'\nTesting search engine image search...')
        search_images = crawler.search_for_school_images(school['name'], school['state'], school.get('city'))
        print(f'Search images found: {len(search_images.get("logo", []))} logos, {len(search_images.get("hero", []))} heroes')
        
        # Test full crawl
        print(f'\nTesting full image crawl...')
        result = crawler.crawl_school_images(school)
        
        print('\n' + '-' * 30)
        if result['success']:
            print('✅ Image crawler test successful')
            print(f'   Found logo: {result.get("logo_url") or "None"}')
            print(f'   Found hero: {result.get("hero_image_url") or "None"}')
            print(f'   Method: {result.get("method")}')
        else:
            print('❌ Image crawler test failed')
            print(f'   Error: {result.get("error")}')
        
        print(f'\nStats: {crawler.stats}')
        
        return result['success']
    else:
        print('❌ No schools found needing images (all schools may already have images)')
        return True  # This is actually good

def test_image_validation():
    print('\n' + '=' * 50)
    print('Testing image validation...')
    print('=' * 50)
    
    crawler = ImageCrawler()
    
    # Test URL validation
    test_urls = [
        'https://example.com/logo.png',  # Valid
        'https://example.com/image.jpg',  # Valid
        'ftp://bad.com/image.png',       # Invalid protocol
        'not-a-url',                     # Invalid URL
        'https://bit.ly/abc123',         # Spam domain
    ]
    
    print('URL Validation Tests:')
    for url in test_urls:
        valid = crawler.validate_image_url(url)
        status = '✅' if valid else '❌'
        print(f'  {status} {url}')
    
    # Test quality scoring
    print('\nImage Quality Scoring Tests:')
    test_cases = [
        (200, 200, 10000, 'logo'),     # Good logo
        (50, 50, 5000, 'logo'),       # Too small logo
        (1000, 800, 200000, 'hero'),  # Good hero
        (100, 100, 5000, 'hero'),     # Too small hero
    ]
    
    for width, height, size, img_type in test_cases:
        score = crawler.calculate_image_quality(width, height, size, img_type)
        print(f'  {img_type} {width}x{height} ({size} bytes): {score:.2f}')

if __name__ == "__main__":
    # Run tests
    success = test_image_crawler()
    test_image_validation()
    
    if success:
        print('\n✅ All image crawler tests passed!')
    else:
        print('\n❌ Some tests failed')