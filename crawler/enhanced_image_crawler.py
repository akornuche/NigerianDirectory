"""
Enhanced Image Crawler with Search Engine Fallback
Tries: 1) School website, 2) Google/DuckDuckGo image search, 3) Bing search
"""
import os
import re
import json
import time
import random
import requests
from urllib.parse import urljoin, urlparse, quote_plus
from io import BytesIO
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

# Try to import PIL for image validation
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("⚠️  PIL not available, skipping image dimension checks")


class EnhancedImageCrawler:
    def __init__(self):
        self.fetcher = Fetcher()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        
        # Stats tracking
        self.stats = {
            'total': 0,
            'website_success': 0,
            'search_success': 0,
            'failed': 0,
            'schools_with_logo': 0,
            'schools_with_hero': 0,
            'details': []
        }
    
    def search_duckduckgo_images(self, query, num_results=5):
        """Search DuckDuckGo for images"""
        images = []
        
        try:
            # DuckDuckGo image search
            search_url = f"https://duckduckgo.com/?q={quote_plus(query)}&iax=images&ia=images"
            
            # First get the vqd token
            response = self.session.get(
                f"https://duckduckgo.com/?q={quote_plus(query)}",
                timeout=10
            )
            
            # Extract vqd token
            vqd_match = re.search(r'vqd=([^&]+)', response.text)
            if not vqd_match:
                vqd_match = re.search(r"vqd='([^']+)'", response.text)
            
            if vqd_match:
                vqd = vqd_match.group(1)
                
                # Get images
                img_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={quote_plus(query)}&vqd={vqd}&f=,,,,,&p=1"
                
                time.sleep(0.5)
                img_response = self.session.get(img_url, timeout=10)
                
                if img_response.status_code == 200:
                    data = img_response.json()
                    results = data.get('results', [])
                    
                    for r in results[:num_results]:
                        img_url = r.get('image')
                        if img_url and self._is_valid_image_url(img_url):
                            images.append({
                                'url': img_url,
                                'title': r.get('title', ''),
                                'source': r.get('source', '')
                            })
        except Exception as e:
            print(f"      DuckDuckGo search error: {e}")
        
        return images
    
    def search_bing_images(self, query, num_results=5):
        """Search Bing for images (scraping method)"""
        images = []
        
        try:
            search_url = f"https://www.bing.com/images/search?q={quote_plus(query)}&first=1"
            
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                # Extract image URLs from page
                # Look for murl parameter in links
                matches = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', response.text)
                
                if matches:
                    print(f"        → Bing found {len(matches)} raw images")
                
                for url in matches[:num_results]:
                    url = url.replace('\\u002f', '/')
                    if self._is_valid_image_url(url):
                        images.append({
                            'url': url,
                            'title': '',
                            'source': 'bing'
                        })
            else:
                print(f"        → Bing returned status {response.status_code}")
        except Exception as e:
            print(f"      Bing search error: {e}")
        
        return images
    
    def search_google_images(self, query, num_results=5):
        """Search Google for images (basic scraping - may be rate limited)"""
        images = []
        
        try:
            # Use Google Images search
            search_url = f"https://www.google.com/search?q={quote_plus(query)}&tbm=isch&hl=en"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            }
            
            response = self.session.get(search_url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                # Extract image URLs - Google encodes them in data attributes
                # Look for full-size image URLs
                patterns = [
                    r'\["(https?://[^"]+\.(?:jpg|jpeg|png|webp))",[0-9]+,[0-9]+\]',
                    r'"ou":"(https?://[^"]+)"',
                    r'data-src="(https?://[^"]+)"',
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, response.text)
                    for url in matches:
                        if self._is_valid_image_url(url) and 'google' not in url.lower() and 'gstatic' not in url.lower():
                            images.append({
                                'url': url,
                                'title': '',
                                'source': 'google'
                            })
                            if len(images) >= num_results:
                                break
                    if len(images) >= num_results:
                        break
                        
        except Exception as e:
            print(f"      Google search error: {e}")
        
        return images
    
    def validate_image_url(self, url):
        """Check if URL points to a valid, accessible image"""
        if not url:
            return False
            
        try:
            response = self.session.head(url, timeout=8, allow_redirects=True)
            content_type = response.headers.get('content-type', '')
            
            if response.status_code == 200 and 'image' in content_type:
                return True
            
            # Some servers don't respond to HEAD, try GET with stream
            if response.status_code in [200, 405, 403]:
                response = self.session.get(url, timeout=8, stream=True)
                content_type = response.headers.get('content-type', '')
                # Read first chunk to verify it's an image
                chunk = next(response.iter_content(chunk_size=1024), None)
                if chunk and ('image' in content_type or chunk[:8].startswith(b'\x89PNG') or chunk[:2] == b'\xff\xd8'):
                    return True
                    
        except Exception as e:
            pass
        
        return False
    
    def _is_valid_image_url(self, url):
        """Quick check if URL looks like an image URL"""
        if not url:
            return False
        
        # Skip data URIs
        if url.startswith('data:'):
            return False
        
        # Skip common non-image patterns
        skip_patterns = ['pixel', 'tracking', 'analytics', 'logo.clearbit', 'favicon.ico', '1x1', 'spacer']
        if any(p in url.lower() for p in skip_patterns):
            return False
        
        # Check for image extensions
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
        url_lower = url.lower().split('?')[0]
        
        if any(url_lower.endswith(ext) for ext in image_extensions):
            return True
        
        # Allow CDN URLs
        image_hosts = ['cloudinary', 'imgix', 'unsplash', 'amazonaws', 'googleusercontent', 
                       'wp-content/uploads', 'media', 'images', 'photos', 'img']
        if any(host in url.lower() for host in image_hosts):
            return True
        
        return True
    
    def find_best_image(self, images, school_name, image_type='logo'):
        """Find the best matching image from a list"""
        if not images:
            return None
        
        school_words = set(school_name.lower().split())
        
        # Score each image
        scored = []
        for img in images:
            score = 0
            url_lower = img['url'].lower()
            title_lower = img.get('title', '').lower()
            
            # Prefer images with school name in URL or title
            for word in school_words:
                if len(word) > 3:
                    if word in url_lower:
                        score += 10
                    if word in title_lower:
                        score += 5
            
            # Prefer certain keywords based on type
            if image_type == 'logo':
                if 'logo' in url_lower or 'logo' in title_lower:
                    score += 20
                if 'emblem' in url_lower or 'crest' in url_lower or 'badge' in url_lower:
                    score += 15
            else:  # hero/building image
                if 'building' in url_lower or 'campus' in url_lower or 'school' in url_lower:
                    score += 15
                if 'aerial' in url_lower or 'front' in url_lower:
                    score += 10
            
            # Penalize stock photo sites
            stock_sites = ['shutterstock', 'gettyimages', 'istockphoto', 'dreamstime', 'alamy']
            if any(s in url_lower for s in stock_sites):
                score -= 50
            
            scored.append((score, img))
        
        # Sort by score descending
        scored.sort(key=lambda x: x[0], reverse=True)
        
        # Validate top candidates
        for score, img in scored[:5]:
            if self.validate_image_url(img['url']):
                return img['url']
        
        return None
    
    def crawl_school_images(self, school_id, school_name, website_url, state, city=None):
        """
        Crawl images for a school using multiple methods
        
        Returns:
            dict with logo_url, hero_image_url, method used, etc.
        """
        result = {
            'success': False,
            'logo_url': None,
            'hero_image_url': None,
            'gallery_images': [],
            'method': None,
            'error': None
        }
        
        print(f"  🔍 Searching for images...")
        
        # Method 1: Try school website first
        if website_url:
            print(f"    [1/3] Trying website: {website_url}")
            website_result = self._try_website(website_url, school_name)
            
            if website_result['logo_url'] or website_result['hero_image_url']:
                result.update(website_result)
                result['method'] = 'website'
                result['success'] = True
                print(f"    ✓ Found via website!")
                return result
            else:
                print(f"    ✗ Website failed or no images found")
        
        # Small delay between methods
        time.sleep(1)
        
        # Method 2: Try Bing image search
        print(f"    [2/3] Trying Bing image search...")
        search_result = self._try_search_engines(school_name, state, city)
        
        if search_result['logo_url'] or search_result['hero_image_url']:
            result.update(search_result)
            result['method'] = 'search'
            result['success'] = True
            print(f"    ✓ Found via search engine!")
            return result
        else:
            print(f"    ✗ Search engines failed")
        
        # Method 3: Try with different search queries
        time.sleep(1)
        print(f"    [3/3] Trying alternative search queries...")
        alt_result = self._try_alternative_searches(school_name, state)
        
        if alt_result['logo_url'] or alt_result['hero_image_url']:
            result.update(alt_result)
            result['method'] = 'alt_search'
            result['success'] = True
            print(f"    ✓ Found via alternative search!")
            return result
        
        print(f"    ✗ All methods failed")
        result['error'] = 'No images found via any method'
        return result
    
    def _try_website(self, website_url, school_name):
        """Try to get images from the school's website"""
        result = {'logo_url': None, 'hero_image_url': None, 'gallery_images': []}
        
        if not website_url:
            return result
        
        # Normalize URL
        if not website_url.startswith('http'):
            website_url = 'https://' + website_url
        
        try:
            fetch_result = fetch_url(website_url)
            
            if fetch_result['success']:
                parser = SchoolParser(fetch_result['html'], website_url)
                parser._extract_images()
                
                extracted = parser.data
                
                # Validate found images
                if extracted.get('logo_url') and self.validate_image_url(extracted['logo_url']):
                    result['logo_url'] = extracted['logo_url']
                
                if extracted.get('hero_image_url') and self.validate_image_url(extracted['hero_image_url']):
                    result['hero_image_url'] = extracted['hero_image_url']
                
                if extracted.get('gallery_images'):
                    valid_gallery = [url for url in extracted['gallery_images'][:6] 
                                    if self.validate_image_url(url)]
                    result['gallery_images'] = valid_gallery
                    
        except Exception as e:
            pass
        
        return result
    
    def _try_search_engines(self, school_name, state, city=None):
        """Try search engines to find school images"""
        result = {'logo_url': None, 'hero_image_url': None, 'gallery_images': []}
        
        # Build search query
        location = f"{city}, {state}" if city else state
        
        # Search for logo first with Bing (more reliable)
        logo_query = f"{school_name} {state} Nigeria school logo"
        print(f"      Bing search: {logo_query}")
        
        logo_images = self.search_bing_images(logo_query, 15)
        print(f"        → {len(logo_images)} valid images found")
        
        if logo_images:
            best_logo = self.find_best_image(logo_images, school_name, 'logo')
            if best_logo:
                result['logo_url'] = best_logo
                print(f"        → Selected logo: {best_logo[:60]}...")
        
        time.sleep(1)
        
        # Search for building/campus image
        building_query = f"{school_name} {state} Nigeria school building"
        print(f"      Bing search: {building_query}")
        
        building_images = self.search_bing_images(building_query, 15)
        print(f"        → {len(building_images)} valid images found")
        
        if building_images:
            best_building = self.find_best_image(building_images, school_name, 'hero')
            if best_building:
                result['hero_image_url'] = best_building
                print(f"        → Selected hero: {best_building[:60]}...")
        
        return result
    
    def _try_alternative_searches(self, school_name, state):
        """Try alternative search queries"""
        result = {'logo_url': None, 'hero_image_url': None, 'gallery_images': []}
        
        # Try variations of school name with simpler queries
        variations = [
            f'"{school_name}" Nigeria',
            f'{school_name} school photo',
            f'{school_name} campus',
        ]
        
        for query in variations:
            if result['logo_url'] and result['hero_image_url']:
                break
                
            print(f"      Trying: {query}")
            time.sleep(1.5)
            
            images = self.search_bing_images(query, 10)
            
            if images and not result['logo_url']:
                logo = self.find_best_image(images, school_name, 'logo')
                if logo:
                    result['logo_url'] = logo
            
            if images and not result['hero_image_url']:
                hero = self.find_best_image(images, school_name, 'hero')
                if hero:
                    result['hero_image_url'] = hero
        
        return result
    
    def get_stats_summary(self):
        """Generate summary report"""
        return self.stats


def run_enhanced_image_crawl(limit=None):
    """
    Run enhanced image crawl for all schools
    """
    conn = get_connection()
    crawler = EnhancedImageCrawler()
    
    # Get ALL schools (not just ones without images or with websites)
    from psycopg2.extras import RealDictCursor
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT id, name, slug, website, state, city, area, logo_url, hero_image_url
        FROM schools
        ORDER BY claimed DESC, verified DESC, name
    """)
    schools = [dict(r) for r in cursor.fetchall()]
    cursor.close()
    
    if limit:
        schools = schools[:limit]
    
    total = len(schools)
    crawler.stats['total'] = total
    
    print("\n" + "="*70)
    print("🖼️  ENHANCED IMAGE CRAWLER - Nigerian Schools Directory")
    print("="*70)
    print(f"📊 Total schools to process: {total}")
    print(f"🔍 Methods: Website → DuckDuckGo → Bing → Alternative queries")
    print("="*70 + "\n")
    
    for i, school in enumerate(schools, 1):
        school_name = school['name']
        has_logo = bool(school.get('logo_url'))
        has_hero = bool(school.get('hero_image_url'))
        
        print(f"\n[{i}/{total}] {school_name}")
        print(f"  📍 {school.get('area', '')}, {school.get('city', '')}, {school['state']}")
        print(f"  🌐 Website: {school.get('website') or 'None'}")
        print(f"  📸 Current: Logo={'Yes' if has_logo else 'No'}, Hero={'Yes' if has_hero else 'No'}")
        
        # Skip if already has both images
        if has_logo and has_hero:
            print(f"  ⏭️  Skipping - already has images")
            crawler.stats['schools_with_logo'] += 1
            crawler.stats['schools_with_hero'] += 1
            crawler.stats['details'].append({
                'name': school_name,
                'status': 'skipped',
                'reason': 'already has images',
                'logo': True,
                'hero': True
            })
            continue
        
        # Crawl for images
        result = crawler.crawl_school_images(
            school['id'],
            school_name,
            school.get('website'),
            school['state'],
            school.get('city')
        )
        
        detail = {
            'name': school_name,
            'website': school.get('website'),
            'status': 'failed',
            'method': result.get('method'),
            'logo': has_logo,
            'hero': has_hero,
            'logo_found': None,
            'hero_found': None
        }
        
        if result['success']:
            # Determine what to update
            update_logo = result['logo_url'] if not has_logo else None
            update_hero = result['hero_image_url'] if not has_hero else None
            
            if update_logo or update_hero:
                update_school_images(
                    conn,
                    school['id'],
                    logo_url=update_logo,
                    hero_image_url=update_hero,
                    gallery_images=result.get('gallery_images') if result.get('gallery_images') else None
                )
                
                if result.get('method') == 'website':
                    crawler.stats['website_success'] += 1
                else:
                    crawler.stats['search_success'] += 1
                
                detail['status'] = 'success'
                detail['method'] = result.get('method')
                
                if update_logo:
                    detail['logo'] = True
                    detail['logo_found'] = update_logo
                    crawler.stats['schools_with_logo'] += 1
                    print(f"  ✓ Logo: {update_logo[:60]}...")
                elif has_logo:
                    crawler.stats['schools_with_logo'] += 1
                
                if update_hero:
                    detail['hero'] = True
                    detail['hero_found'] = update_hero
                    crawler.stats['schools_with_hero'] += 1
                    print(f"  ✓ Hero: {update_hero[:60]}...")
                elif has_hero:
                    crawler.stats['schools_with_hero'] += 1
            else:
                if has_logo:
                    crawler.stats['schools_with_logo'] += 1
                if has_hero:
                    crawler.stats['schools_with_hero'] += 1
        else:
            crawler.stats['failed'] += 1
            detail['error'] = result.get('error')
            print(f"  ✗ Failed: {result.get('error', 'Unknown error')}")
            
            # Still count existing images
            if has_logo:
                crawler.stats['schools_with_logo'] += 1
            if has_hero:
                crawler.stats['schools_with_hero'] += 1
        
        crawler.stats['details'].append(detail)
        
        # Rate limiting
        time.sleep(random.uniform(1.5, 3.0))
    
    conn.close()
    
    # Print summary report
    stats = crawler.stats
    
    print("\n" + "="*70)
    print("📊 CRAWL SUMMARY REPORT")
    print("="*70)
    print(f"\n📈 Overall Statistics:")
    print(f"   Total schools processed: {stats['total']}")
    print(f"   Found via website:       {stats['website_success']}")
    print(f"   Found via search:        {stats['search_success']}")
    print(f"   Failed to find images:   {stats['failed']}")
    print(f"\n📸 Image Coverage:")
    print(f"   Schools with logo:       {stats['schools_with_logo']}/{stats['total']} ({100*stats['schools_with_logo']//max(stats['total'],1)}%)")
    print(f"   Schools with hero image: {stats['schools_with_hero']}/{stats['total']} ({100*stats['schools_with_hero']//max(stats['total'],1)}%)")
    
    # Breakdown by status
    success_count = len([d for d in stats['details'] if d['status'] == 'success'])
    skipped_count = len([d for d in stats['details'] if d['status'] == 'skipped'])
    failed_count = len([d for d in stats['details'] if d['status'] == 'failed'])
    
    print(f"\n📋 Processing Breakdown:")
    print(f"   Successfully updated:    {success_count}")
    print(f"   Skipped (had images):    {skipped_count}")
    print(f"   Failed (no images):      {failed_count}")
    
    # List schools without images
    no_images = [d for d in stats['details'] if not d['logo'] and not d['hero']]
    if no_images:
        print(f"\n❌ Schools without ANY images ({len(no_images)}):")
        for d in no_images[:20]:
            print(f"   - {d['name']}")
        if len(no_images) > 20:
            print(f"   ... and {len(no_images) - 20} more")
    
    # List schools with only partial images
    partial = [d for d in stats['details'] if (d['logo'] and not d['hero']) or (not d['logo'] and d['hero'])]
    if partial:
        print(f"\n⚠️  Schools with partial images ({len(partial)}):")
        for d in partial[:10]:
            status = "logo only" if d['logo'] else "hero only"
            print(f"   - {d['name']} ({status})")
        if len(partial) > 10:
            print(f"   ... and {len(partial) - 10} more")
    
    print("\n" + "="*70)
    print("✅ CRAWL COMPLETE")
    print("="*70 + "\n")
    
    return stats


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Enhanced Image Crawler for Nigerian Schools')
    parser.add_argument('--limit', type=int, help='Maximum number of schools to process')
    parser.add_argument('--school', type=str, help='Specific school slug to process')
    
    args = parser.parse_args()
    
    if args.school:
        # Process single school
        conn = get_connection()
        from psycopg2.extras import RealDictCursor
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM schools WHERE slug = %s", (args.school,))
        school = cursor.fetchone()
        cursor.close()
        
        if school:
            school = dict(school)
            crawler = EnhancedImageCrawler()
            result = crawler.crawl_school_images(
                school['id'],
                school['name'],
                school.get('website'),
                school['state'],
                school.get('city')
            )
            
            if result['success']:
                update_school_images(
                    conn,
                    school['id'],
                    logo_url=result.get('logo_url'),
                    hero_image_url=result.get('hero_image_url'),
                    gallery_images=result.get('gallery_images')
                )
                print(f"\n✓ Updated {school['name']}")
                print(f"  Logo: {result.get('logo_url', 'None')}")
                print(f"  Hero: {result.get('hero_image_url', 'None')}")
            else:
                print(f"\n✗ Failed for {school['name']}: {result.get('error')}")
        else:
            print(f"School not found: {args.school}")
        
        conn.close()
    else:
        run_enhanced_image_crawl(limit=args.limit)
