"""
Fixed Image Crawler for Nigerian Schools
========================================
Robust image discovery, validation, and storage system with multiple fallback strategies.
Integrates with the fixed search engine and database modules.
"""

import os
import re
import json
import time
import random
import hashlib
import requests
import logging
from urllib.parse import urljoin, urlparse, quote_plus, unquote
from io import BytesIO
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

# Import our fixed modules
from search_engines import search_web, RobustSearchEngine
from database import db_manager
from retry_handler import retry_handler, retry_on_network_error

# Try to import PIL for image validation
try:
    from PIL import Image, ImageFile
    ImageFile.LOAD_TRUNCATED_IMAGES = True  # Handle truncated images
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    Image = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('image_crawler.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ImageCrawler:
    """
    Robust image crawler with multiple discovery methods and validation
    """
    
    def __init__(self, storage_path: str = "images"):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site'
        })
        
        # Image storage configuration
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Image validation settings
        self.min_width = 50
        self.min_height = 50
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.allowed_formats = {'JPEG', 'PNG', 'WEBP', 'GIF'}
        
        # Quality thresholds for image types
        self.logo_min_size = (80, 80)
        self.logo_max_size = (800, 800)
        self.hero_min_size = (300, 200)
        self.hero_max_size = (2000, 1500)
        
        # Statistics tracking
        self.stats = {
            'total_processed': 0,
            'logos_found': 0,
            'heroes_found': 0,
            'website_images': 0,
            'search_images': 0,
            'failed': 0,
            'invalid_images': 0
        }
        
        # Common logo indicators
        self.logo_indicators = [
            'logo', 'brand', 'emblem', 'crest', 'seal', 'badge', 'symbol',
            'header-logo', 'site-logo', 'school-logo', 'nav-logo'
        ]
        
        # Common hero/banner indicators  
        self.hero_indicators = [
            'hero', 'banner', 'header', 'main', 'featured', 'cover', 'splash',
            'campus', 'building', 'school-image', 'main-image'
        ]
    
    def validate_image_url(self, url: str) -> bool:
        """Basic URL validation for images"""
        if not url or not isinstance(url, str):
            return False
        
        try:
            parsed = urlparse(url)
            if not parsed.scheme in ['http', 'https']:
                return False
            
            # Check if URL looks like an image
            path = parsed.path.lower()
            image_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
            
            if any(path.endswith(ext) for ext in image_extensions):
                return True
            
            # Some images don't have extensions, allow if domain looks legitimate
            domain = parsed.netloc.lower()
            spam_indicators = ['bit.ly', 'tinyurl', 'goo.gl', 'short.link']
            
            return not any(spam in domain for spam in spam_indicators)
            
        except Exception:
            return False
    
    @retry_on_network_error(max_retries=3)
    def download_and_validate_image(self, url: str, image_type: str = 'unknown') -> Optional[Dict[str, Any]]:
        """
        Download image and validate its properties
        """
        try:
            # Download image
            response = self.session.get(url, timeout=15, stream=True)
            
            if response.status_code != 200:
                return None
            
            # Check content type
            content_type = response.headers.get('content-type', '').lower()
            if not any(img_type in content_type for img_type in ['image/', 'jpeg', 'png', 'webp']):
                return None
            
            # Check file size
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > self.max_file_size:
                return None
            
            # Download image data
            image_data = BytesIO()
            downloaded_size = 0
            
            for chunk in response.iter_content(chunk_size=8192):
                downloaded_size += len(chunk)
                if downloaded_size > self.max_file_size:
                    return None
                image_data.write(chunk)
            
            image_data.seek(0)
            
            # Validate with PIL if available
            if HAS_PIL:
                try:
                    img = Image.open(image_data)
                    img.verify()  # Verify the image is valid
                    
                    # Get image dimensions
                    image_data.seek(0)
                    img = Image.open(image_data)
                    width, height = img.size
                    format_name = img.format
                    
                    # Basic size validation
                    if width < self.min_width or height < self.min_height:
                        return None
                    
                    # Type-specific validation
                    if image_type == 'logo':
                        if not (self.logo_min_size[0] <= width <= self.logo_max_size[0] and 
                               self.logo_min_size[1] <= height <= self.logo_max_size[1]):
                            return None
                    elif image_type == 'hero':
                        if not (self.hero_min_size[0] <= width <= self.hero_max_size[0] and 
                               self.hero_min_size[1] <= height <= self.hero_max_size[1]):
                            return None
                    
                    # Calculate quality score
                    quality_score = self.calculate_image_quality(width, height, len(image_data.getvalue()), image_type)
                    
                    return {
                        'url': url,
                        'width': width,
                        'height': height,
                        'format': format_name,
                        'size_bytes': len(image_data.getvalue()),
                        'quality_score': quality_score,
                        'type': image_type,
                        'data': image_data.getvalue()
                    }
                    
                except Exception as e:
                    logger.debug(f"PIL validation failed for {url}: {e}")
                    return None
            else:
                # Basic validation without PIL
                data = image_data.getvalue()
                if len(data) < 1024:  # Too small
                    return None
                
                return {
                    'url': url,
                    'width': None,
                    'height': None,
                    'format': 'unknown',
                    'size_bytes': len(data),
                    'quality_score': 0.5,  # Default score
                    'type': image_type,
                    'data': data
                }
        
        except Exception as e:
            logger.debug(f"Download failed for {url}: {e}")
            return None
    
    def calculate_image_quality(self, width: int, height: int, file_size: int, image_type: str) -> float:
        """Calculate image quality score (0-1)"""
        score = 0.5  # Base score
        
        # Resolution score
        resolution = width * height
        
        if image_type == 'logo':
            if 10000 <= resolution <= 250000:  # 100x100 to 500x500
                score += 0.3
            elif resolution > 250000:
                score += 0.1  # Too large for logo
        elif image_type == 'hero':
            if 100000 <= resolution <= 2000000:  # 400x250 to 1600x1250  
                score += 0.3
            elif resolution > 2000000:
                score += 0.1  # Very large, might be too big
        
        # Aspect ratio score
        aspect_ratio = width / height if height > 0 else 1
        
        if image_type == 'logo':
            if 0.5 <= aspect_ratio <= 2.0:  # Square-ish logos preferred
                score += 0.2
        elif image_type == 'hero':
            if 1.2 <= aspect_ratio <= 2.5:  # Wide hero images preferred
                score += 0.2
        
        # File size efficiency score
        bytes_per_pixel = file_size / resolution if resolution > 0 else 0
        if 0.1 <= bytes_per_pixel <= 2.0:  # Reasonable compression
            score += 0.1
        
        return min(1.0, max(0.0, score))
    
    def save_image_locally(self, image_data: bytes, school_slug: str, image_type: str, 
                          file_format: str = 'jpg') -> Optional[str]:
        """Save image to local storage and return file path"""
        try:
            # Create filename
            timestamp = int(time.time())
            filename = f"{school_slug}_{image_type}_{timestamp}.{file_format.lower()}"
            filepath = self.storage_path / filename
            
            # Save file
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            # Return relative path for storage in database
            return str(filepath.relative_to(Path.cwd()))
            
        except Exception as e:
            logger.error(f"Error saving image: {e}")
            return None
    
    def extract_images_from_website(self, url: str, school_name: str) -> Dict[str, List[str]]:
        """Extract potential logo and hero images from school website"""
        images = {'logo': [], 'hero': [], 'gallery': []}
        
        try:
            response = self.session.get(url, timeout=15)
            if response.status_code != 200:
                return images
            
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            
            base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
            
            # Find all image elements
            img_elements = soup.find_all('img')
            
            for img in img_elements:
                src = img.get('src') or img.get('data-src')
                if not src:
                    continue
                
                # Convert relative URLs to absolute
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    src = base_url + src
                elif not src.startswith('http'):
                    src = urljoin(url, src)
                
                if not self.validate_image_url(src):
                    continue
                
                # Classify image based on attributes
                img_class = (img.get('class') or [])
                img_id = img.get('id', '')
                img_alt = img.get('alt', '').lower()
                img_src_lower = src.lower()
                
                # Check for logo indicators
                is_logo = (
                    any(indicator in ' '.join(img_class).lower() for indicator in self.logo_indicators) or
                    any(indicator in img_id.lower() for indicator in self.logo_indicators) or
                    any(indicator in img_alt for indicator in self.logo_indicators) or
                    any(indicator in img_src_lower for indicator in self.logo_indicators)
                )
                
                # Check for hero/banner indicators
                is_hero = (
                    any(indicator in ' '.join(img_class).lower() for indicator in self.hero_indicators) or
                    any(indicator in img_id.lower() for indicator in self.hero_indicators) or
                    any(indicator in img_alt for indicator in self.hero_indicators) or
                    any(indicator in img_src_lower for indicator in self.hero_indicators)
                )
                
                if is_logo:
                    images['logo'].append(src)
                elif is_hero:
                    images['hero'].append(src)
                else:
                    images['gallery'].append(src)
            
            logger.info(f"Website extraction: {len(images['logo'])} logos, {len(images['hero'])} heroes, {len(images['gallery'])} gallery")
            
        except Exception as e:
            logger.error(f"Error extracting images from {url}: {e}")
        
        return images
    
    def search_for_school_images(self, school_name: str, state: str, city: str = None) -> Dict[str, List[str]]:
        """Search for school images using search engines"""
        images = {'logo': [], 'hero': []}
        
        # Create targeted search queries
        queries = [
            f'"{school_name}" {state} Nigeria logo',
            f'"{school_name}" Nigeria school logo',
            f'"{school_name}" {state} building campus',
            f'"{school_name}" Nigeria school image'
        ]
        
        search_engine = RobustSearchEngine()
        
        for query in queries:
            try:
                logger.info(f"🔍 Image search: {query}")
                
                # Use DuckDuckGo image search
                results = search_engine.search_duckduckgo_images(query, num_results=5)
                
                for result in results:
                    url = result.get('url')
                    title = result.get('title', '').lower()
                    
                    if not self.validate_image_url(url):
                        continue
                    
                    # Classify based on search context
                    if 'logo' in query.lower():
                        images['logo'].append(url)
                    elif any(keyword in query.lower() for keyword in ['building', 'campus', 'school']):
                        images['hero'].append(url)
                
                time.sleep(random.uniform(1.0, 2.0))  # Rate limiting
                
            except Exception as e:
                logger.error(f"Image search error for '{query}': {e}")
        
        return images
    
    def find_best_images(self, candidates: Dict[str, List[str]], school_name: str) -> Dict[str, Optional[str]]:
        """Find the best logo and hero images from candidates"""
        result = {'logo_url': None, 'hero_image_url': None}
        
        # Process logo candidates
        if candidates.get('logo'):
            best_logo = None
            best_logo_score = 0
            
            for url in candidates['logo'][:5]:  # Limit to top 5
                image_info = self.download_and_validate_image(url, 'logo')
                if image_info and image_info['quality_score'] > best_logo_score:
                    best_logo = url
                    best_logo_score = image_info['quality_score']
                    
                time.sleep(0.5)  # Small delay between downloads
            
            result['logo_url'] = best_logo
            if best_logo:
                self.stats['logos_found'] += 1
        
        # Process hero candidates  
        if candidates.get('hero'):
            best_hero = None
            best_hero_score = 0
            
            for url in candidates['hero'][:5]:  # Limit to top 5
                image_info = self.download_and_validate_image(url, 'hero')
                if image_info and image_info['quality_score'] > best_hero_score:
                    best_hero = url
                    best_hero_score = image_info['quality_score']
                    
                time.sleep(0.5)
            
            result['hero_image_url'] = best_hero
            if best_hero:
                self.stats['heroes_found'] += 1
        
        return result
    
    def crawl_school_images(self, school: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main method to crawl images for a school
        """
        school_id = school['id']
        school_name = school['name']
        school_slug = school['slug']
        state = school['state']
        city = school.get('city', '')
        website = school.get('website')
        
        logger.info(f"🖼️  Crawling images for: {school_name} ({state})")
        
        result = {
            'success': False,
            'logo_url': None,
            'hero_image_url': None,
            'method': None,
            'error': None
        }
        
        try:
            all_candidates = {'logo': [], 'hero': [], 'gallery': []}
            
            # Method 1: Extract from school website
            if website:
                logger.info(f"🌐 Extracting from website: {website}")
                website_images = self.extract_images_from_website(website, school_name)
                
                for img_type in ['logo', 'hero']:
                    all_candidates[img_type].extend(website_images.get(img_type, []))
                
                self.stats['website_images'] += len(website_images.get('logo', [])) + len(website_images.get('hero', []))
            
            # Method 2: Search engines if website didn't yield enough results
            if len(all_candidates['logo']) < 3 or len(all_candidates['hero']) < 3:
                logger.info(f"🔍 Searching for additional images")
                search_images = self.search_for_school_images(school_name, state, city)
                
                for img_type in ['logo', 'hero']:
                    all_candidates[img_type].extend(search_images.get(img_type, []))
                
                self.stats['search_images'] += len(search_images.get('logo', [])) + len(search_images.get('hero', []))
            
            # Find the best images from all candidates
            best_images = self.find_best_images(all_candidates, school_name)
            
            if best_images['logo_url'] or best_images['hero_image_url']:
                result.update(best_images)
                result['success'] = True
                result['method'] = 'website' if website else 'search'
                
                logger.info(f"✅ Found images - Logo: {'✓' if best_images['logo_url'] else '✗'}, Hero: {'✓' if best_images['hero_image_url'] else '✗'}")
            else:
                result['error'] = 'No valid images found'
                logger.warning(f"❌ No valid images found for {school_name}")
            
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"❌ Error crawling images for {school_name}: {e}")
        
        self.stats['total_processed'] += 1
        return result
    
    def run_batch_crawl(self, limit: int = None, offset: int = 0) -> Dict[str, int]:
        """
        Run image crawling for multiple schools
        """
        logger.info("🖼️  Starting image crawler")
        logger.info("=" * 60)
        
        # Get schools without images
        schools = self.get_schools_needing_images(limit=limit or 50, offset=offset)
        
        if not schools:
            logger.info("✅ All schools have images!")
            return self.stats
        
        logger.info(f"📊 Found {len(schools)} schools needing images")
        
        for i, school in enumerate(schools, 1):
            logger.info(f"\n[{i}/{len(schools)}] Processing school...")
            
            try:
                result = self.crawl_school_images(school)
                
                # Save images to database if found
                if result['success']:
                    success = db_manager.update_school_images(
                        school['id'],
                        logo_url=result.get('logo_url'),
                        hero_image_url=result.get('hero_image_url')
                    )
                    
                    if success:
                        logger.info(f"💾 Images saved to database")
                    else:
                        logger.error(f"❌ Failed to save images to database")
                        self.stats['failed'] += 1
                else:
                    self.stats['failed'] += 1
                
                # Rate limiting
                time.sleep(random.uniform(2.0, 4.0))
                
            except KeyboardInterrupt:
                logger.info("🛑 Image crawling interrupted by user")
                break
            except Exception as e:
                logger.error(f"❌ Unexpected error: {e}")
                self.stats['failed'] += 1
        
        # Print final statistics
        logger.info("\n" + "=" * 60)
        logger.info("📊 IMAGE CRAWLING COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Total Processed: {self.stats['total_processed']}")
        logger.info(f"Logos Found: {self.stats['logos_found']}")
        logger.info(f"Heroes Found: {self.stats['heroes_found']}")
        logger.info(f"Website Images: {self.stats['website_images']}")
        logger.info(f"Search Images: {self.stats['search_images']}")
        logger.info(f"Failed: {self.stats['failed']}")
        
        return self.stats
    
    def get_schools_needing_images(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get schools that need images"""
        conn = db_manager.get_connection()
        
        try:
            query = """
                SELECT id, name, slug, state, city, area, website, logo_url, hero_image_url
                FROM schools
                WHERE logo_url IS NULL OR hero_image_url IS NULL
                ORDER BY verified DESC, claimed DESC, name
                LIMIT %s OFFSET %s
            """
            
            with conn.cursor() as cursor:
                cursor.execute(query, (limit, offset))
                results = cursor.fetchall()
                
                return [dict(row) for row in results]
                
        except Exception as e:
            logger.error(f"Error fetching schools needing images: {e}")
            return []
        finally:
            conn.close()


# Add image search capability to RobustSearchEngine
def search_duckduckgo_images(self, query: str, num_results: int = 10) -> List[Dict[str, Any]]:
    """Search DuckDuckGo for images"""
    images = []
    
    try:
        # Use ddgs for image search
        from ddgs import DDGS
        
        with DDGS() as ddgs:
            results = ddgs.images(query, max_results=num_results)
            
            for result in results:
                images.append({
                    'url': result.get('image'),
                    'title': result.get('title', ''),
                    'source': result.get('source', ''),
                    'width': result.get('width'),
                    'height': result.get('height')
                })
        
        logger.info(f"DuckDuckGo Images: {len(images)} results")
        
    except Exception as e:
        logger.error(f"DuckDuckGo image search failed: {e}")
    
    return images

# Monkey patch the method into RobustSearchEngine
RobustSearchEngine.search_duckduckgo_images = search_duckduckgo_images


if __name__ == "__main__":
    # Test the image crawler
    crawler = ImageCrawler()
    
    # Test with a few schools
    crawler.run_batch_crawl(limit=3)