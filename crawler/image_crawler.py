"""
Image Crawler for School Websites
Fetches and processes school logos, hero images, and galleries
"""
import os
import re
import json
import hashlib
import requests
from urllib.parse import urljoin, urlparse
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

from fetcher import fetch_url, Fetcher
from parser import SchoolParser
from database import (
    get_connection, 
    update_school_images, 
    get_schools_without_images,
    get_all_schools_with_websites
)

# Configuration
CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET', '')
USE_CLOUDINARY = all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET])

# Minimum image dimensions
MIN_LOGO_SIZE = 32
MIN_HERO_WIDTH = 400
MIN_HERO_HEIGHT = 200
MIN_GALLERY_SIZE = 100


class ImageCrawler:
    def __init__(self):
        self.fetcher = Fetcher()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'NigerianDirectory Bot/1.0 (Image Crawler)',
            'Accept': 'image/*, */*'
        })
    
    def validate_image_url(self, url):
        """Check if URL points to a valid, accessible image"""
        try:
            response = self.session.head(url, timeout=10, allow_redirects=True)
            content_type = response.headers.get('content-type', '')
            
            if response.status_code == 200 and 'image' in content_type:
                return True
            
            # Some servers don't respond properly to HEAD, try GET
            if response.status_code in [200, 405]:
                response = self.session.get(url, timeout=10, stream=True)
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    return True
                    
        except Exception as e:
            print(f"    ⚠️  Could not validate image {url}: {e}")
        
        return False
    
    def get_image_dimensions(self, url):
        """Get image dimensions without downloading the full image"""
        try:
            response = self.session.get(url, timeout=15, stream=True)
            if response.status_code == 200:
                # Read just enough to get dimensions
                img_data = BytesIO()
                for chunk in response.iter_content(chunk_size=8192):
                    img_data.write(chunk)
                    if img_data.tell() > 50000:  # 50KB should be enough for headers
                        break
                
                img_data.seek(0)
                try:
                    img = Image.open(img_data)
                    return img.size  # (width, height)
                except Exception:
                    pass
        except Exception as e:
            print(f"    ⚠️  Could not get dimensions for {url}: {e}")
        
        return None
    
    def upload_to_cloudinary(self, url, folder, public_id=None):
        """Upload an image to Cloudinary from URL"""
        if not USE_CLOUDINARY:
            return url  # Return original URL if Cloudinary not configured
        
        try:
            import cloudinary
            import cloudinary.uploader
            
            cloudinary.config(
                cloud_name=CLOUDINARY_CLOUD_NAME,
                api_key=CLOUDINARY_API_KEY,
                api_secret=CLOUDINARY_API_SECRET
            )
            
            upload_options = {
                'folder': f'nigerian-directory/{folder}',
                'resource_type': 'image',
                'overwrite': True
            }
            
            if public_id:
                upload_options['public_id'] = public_id
            
            result = cloudinary.uploader.upload(url, **upload_options)
            return result.get('secure_url', url)
            
        except Exception as e:
            print(f"    ⚠️  Cloudinary upload failed: {e}")
            return url
    
    def crawl_school_images(self, school_id, school_name, website_url, existing_logo=None, existing_hero=None):
        """
        Crawl a school's website for images
        
        Returns:
            dict with logo_url, hero_image_url, gallery_images
        """
        result = {
            'success': False,
            'logo_url': None,
            'hero_image_url': None,
            'gallery_images': [],
            'error': None
        }
        
        if not website_url:
            result['error'] = 'No website URL'
            return result
        
        # Normalize URL
        if not website_url.startswith('http'):
            website_url = 'https://' + website_url
        
        print(f"  🖼️  Crawling images from {website_url}")
        
        try:
            # Fetch the webpage
            fetch_result = fetch_url(website_url)
            
            if not fetch_result['success']:
                result['error'] = fetch_result.get('error', 'Failed to fetch page')
                return result
            
            # Parse the HTML for images
            parser = SchoolParser(fetch_result['html'], website_url)
            parser._extract_images()
            
            extracted = parser.data
            
            # Process logo
            if extracted.get('logo_url') and not existing_logo:
                logo_url = extracted['logo_url']
                if self.validate_image_url(logo_url):
                    # Optionally upload to CDN
                    slug = self._generate_slug(school_name)
                    result['logo_url'] = self.upload_to_cloudinary(logo_url, 'logos', f'{slug}-logo')
                    print(f"    ✓ Found logo: {logo_url}")
                else:
                    print(f"    ⚠️  Invalid logo URL: {logo_url}")
            
            # Process hero image
            if extracted.get('hero_image_url') and not existing_hero:
                hero_url = extracted['hero_image_url']
                if self.validate_image_url(hero_url):
                    # Check dimensions
                    dimensions = self.get_image_dimensions(hero_url)
                    if dimensions and dimensions[0] >= MIN_HERO_WIDTH and dimensions[1] >= MIN_HERO_HEIGHT:
                        slug = self._generate_slug(school_name)
                        result['hero_image_url'] = self.upload_to_cloudinary(hero_url, 'heroes', f'{slug}-hero')
                        print(f"    ✓ Found hero image: {hero_url}")
                    else:
                        print(f"    ⚠️  Hero image too small: {dimensions}")
                else:
                    print(f"    ⚠️  Invalid hero URL: {hero_url}")
            
            # Process gallery images
            if extracted.get('gallery_images'):
                valid_gallery = []
                for img_url in extracted['gallery_images'][:10]:
                    if self.validate_image_url(img_url):
                        valid_gallery.append(img_url)
                        if len(valid_gallery) >= 6:
                            break
                
                if valid_gallery:
                    result['gallery_images'] = valid_gallery
                    print(f"    ✓ Found {len(valid_gallery)} gallery images")
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
            print(f"    ✗ Error crawling images: {e}")
        
        return result
    
    def _generate_slug(self, name):
        """Generate URL-friendly slug from school name"""
        slug = name.lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s_-]+', '-', slug)
        return slug.strip('-')


def crawl_images_for_all_schools(limit=None, force_recrawl=False):
    """
    Crawl images for all schools that need them
    
    Args:
        limit: Maximum number of schools to process
        force_recrawl: If True, recrawl even if images exist
    """
    conn = get_connection()
    crawler = ImageCrawler()
    
    if force_recrawl:
        schools = get_all_schools_with_websites(conn)
    else:
        schools = get_schools_without_images(conn, limit=limit or 100)
    
    if limit:
        schools = schools[:limit]
    
    print(f"\n🖼️  Starting image crawl for {len(schools)} schools\n")
    
    success_count = 0
    error_count = 0
    
    for i, school in enumerate(schools):
        print(f"\n[{i+1}/{len(schools)}] {school['name']}")
        
        result = crawler.crawl_school_images(
            school['id'],
            school['name'],
            school['website'],
            existing_logo=school.get('logo_url') if not force_recrawl else None,
            existing_hero=school.get('hero_image_url') if not force_recrawl else None
        )
        
        if result['success']:
            # Update database with found images
            has_updates = False
            
            if result['logo_url'] or result['hero_image_url'] or result['gallery_images']:
                update_school_images(
                    conn,
                    school['id'],
                    logo_url=result['logo_url'],
                    hero_image_url=result['hero_image_url'],
                    gallery_images=result['gallery_images'] if result['gallery_images'] else None
                )
                has_updates = True
                success_count += 1
                print(f"  ✓ Updated images for {school['name']}")
            else:
                print(f"  ⚠️  No new images found for {school['name']}")
        else:
            error_count += 1
            print(f"  ✗ Failed: {result.get('error')}")
    
    conn.close()
    
    print(f"\n" + "="*50)
    print(f"✅ Image crawl complete!")
    print(f"   Schools updated: {success_count}")
    print(f"   Errors: {error_count}")
    print("="*50 + "\n")
    
    return {
        'total': len(schools),
        'success': success_count,
        'errors': error_count
    }


def crawl_images_for_school(school_id_or_slug):
    """Crawl images for a specific school by ID or slug"""
    conn = get_connection()
    crawler = ImageCrawler()
    
    from psycopg2.extras import RealDictCursor
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Try to find by ID or slug
    try:
        school_id = int(school_id_or_slug)
        cursor.execute("SELECT * FROM schools WHERE id = %s", (school_id,))
    except ValueError:
        cursor.execute("SELECT * FROM schools WHERE slug = %s", (school_id_or_slug,))
    
    school = cursor.fetchone()
    cursor.close()
    
    if not school:
        print(f"School not found: {school_id_or_slug}")
        conn.close()
        return None
    
    school = dict(school)
    print(f"\n🖼️  Crawling images for: {school['name']}")
    
    result = crawler.crawl_school_images(
        school['id'],
        school['name'],
        school['website'],
        existing_logo=None,  # Force recrawl for single school
        existing_hero=None
    )
    
    if result['success'] and (result['logo_url'] or result['hero_image_url'] or result['gallery_images']):
        update_school_images(
            conn,
            school['id'],
            logo_url=result['logo_url'],
            hero_image_url=result['hero_image_url'],
            gallery_images=result['gallery_images'] if result['gallery_images'] else None
        )
        print(f"✓ Updated images for {school['name']}")
    
    conn.close()
    return result


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Crawl images for Nigerian schools')
    parser.add_argument('--limit', type=int, help='Maximum number of schools to process')
    parser.add_argument('--school', type=str, help='Specific school ID or slug to crawl')
    parser.add_argument('--force', action='store_true', help='Force recrawl even if images exist')
    
    args = parser.parse_args()
    
    if args.school:
        crawl_images_for_school(args.school)
    else:
        crawl_images_for_all_schools(limit=args.limit, force_recrawl=args.force)
