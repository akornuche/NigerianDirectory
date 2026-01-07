"""
HTML Parser for extracting school information
"""
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin

class SchoolParser:
    """Parse school information from HTML"""
    
    def __init__(self, html, base_url=None):
        self.soup = BeautifulSoup(html, 'lxml')
        self.base_url = base_url
        self.data = {}
        self.confidence = 0.0
    
    def parse(self):
        """Parse all available information"""
        self._extract_basic_info()
        self._extract_contact_info()
        self._extract_images()
        self._extract_facilities()
        self._extract_social_links()
        self._calculate_confidence()
        
        return self.data, self.confidence
    
    def _extract_basic_info(self):
        """Extract basic school information"""
        # Try to find school name
        name = None
        
        # Try title tag
        title_tag = self.soup.find('title')
        if title_tag:
            name = self._clean_text(title_tag.get_text())
            # Remove common suffixes
            for suffix in [' - Home', ' | Home', ' - Official', ' | Official']:
                name = name.replace(suffix, '')
        
        # Try h1
        h1 = self.soup.find('h1')
        if h1 and len(h1.get_text().strip()) < 100:
            name = self._clean_text(h1.get_text())
        
        if name:
            self.data['extracted_name'] = name
        
        # Try to find description/about text
        about_patterns = [
            'about', 'overview', 'introduction', 'mission', 'vision',
            'who we are', 'about us', 'school profile'
        ]
        
        for pattern in about_patterns:
            section = self.soup.find(['div', 'section', 'article'], 
                                    class_=re.compile(pattern, re.I))
            if section:
                text = self._clean_text(section.get_text())
                if len(text) > 100:
                    self.data['about_text'] = text[:1000]
                    break
        
        # Find principal/headmaster info
        principal_patterns = ['principal', 'headmaster', 'headmistress', 'director', 'head teacher']
        for elem in self.soup.find_all(['div', 'section', 'p', 'span']):
            text = elem.get_text().lower()
            for pattern in principal_patterns:
                if pattern in text:
                    # Try to extract name
                    name_match = re.search(r'(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', elem.get_text())
                    if name_match:
                        self.data['principal_name'] = name_match.group(0)
                        break
    
    def _extract_contact_info(self):
        """Extract contact information"""
        text = self.soup.get_text()
        
        # Phone numbers (Nigerian format)
        phone_patterns = [
            r'\+234\s*\d{3}\s*\d{3}\s*\d{4}',
            r'0[789][01]\d{8}',
            r'0[789][01]\s*\d{4}\s*\d{4}',
        ]
        for pattern in phone_patterns:
            match = re.search(pattern, text)
            if match:
                self.data['phone'] = self._normalize_phone(match.group())
                break
        
        # Email
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        email_match = re.search(email_pattern, text)
        if email_match:
            self.data['email'] = email_match.group().lower()
        
        # Address
        address_patterns = [
            r'(?:address|location|situated|located)[\s:]+([^.]{20,100})',
        ]
        for pattern in address_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                self.data['address'] = self._clean_text(match.group(1))
                break
    
    def _extract_images(self):
        """Extract relevant images (logo, hero, gallery)"""
        images = []
        logo_found = False
        hero_found = False
        
        # Patterns for identifying different image types
        logo_patterns = ['logo', 'brand', 'emblem', 'crest', 'badge', 'seal', 'coat']
        hero_patterns = ['hero', 'banner', 'slider', 'featured', 'main', 'cover', 'header-img', 'carousel']
        skip_patterns = ['icon', 'button', 'arrow', 'social', 'facebook', 'twitter', 'instagram', 'loading', 'spinner', 'pixel', 'tracking', 'ad-']
        
        # ====== FIND LOGO ======
        # Priority 1: Look for img tags with logo in src/alt/class
        for img in self.soup.find_all('img'):
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            img_class = ' '.join(img.get('class', [])).lower()
            
            if not src or not self._is_valid_image_url(src):
                continue
            
            for pattern in logo_patterns:
                if pattern in src.lower() or pattern in alt or pattern in img_class:
                    full_url = urljoin(self.base_url, src) if self.base_url else src
                    self.data['logo_url'] = full_url
                    logo_found = True
                    break
            if logo_found:
                break
        
        # Priority 2: Check for logo in header if not found
        if not logo_found:
            header = self.soup.find(['header', 'nav'])
            if header:
                for img in header.find_all('img'):
                    src = img.get('src', '')
                    if src and self._is_valid_image_url(src):
                        # First image in header is often the logo
                        full_url = urljoin(self.base_url, src) if self.base_url else src
                        self.data['logo_url'] = full_url
                        logo_found = True
                        break
        
        # Priority 3: Look for favicon/apple-touch-icon as fallback
        if not logo_found:
            for link in self.soup.find_all('link', rel=True):
                rel = ' '.join(link.get('rel', [])).lower()
                href = link.get('href', '')
                if ('icon' in rel or 'apple-touch' in rel) and href:
                    full_url = urljoin(self.base_url, href) if self.base_url else href
                    self.data['logo_url'] = full_url
                    break
        
        # ====== FIND HERO IMAGE ======
        # Priority 1: Look in common hero/banner containers
        hero_containers = self.soup.find_all(['div', 'section', 'header'], class_=re.compile('|'.join(hero_patterns), re.I))
        for container in hero_containers:
            # Check for background-image in style
            style = container.get('style', '')
            bg_match = re.search(r'background(?:-image)?:\s*url\(["\']?([^"\')]+)["\']?\)', style)
            if bg_match:
                full_url = urljoin(self.base_url, bg_match.group(1)) if self.base_url else bg_match.group(1)
                self.data['hero_image_url'] = full_url
                hero_found = True
                break
            
            # Check for img inside container
            img = container.find('img')
            if img:
                src = img.get('src', '')
                if src and self._is_valid_image_url(src) and 'logo' not in src.lower():
                    full_url = urljoin(self.base_url, src) if self.base_url else src
                    self.data['hero_image_url'] = full_url
                    hero_found = True
                    break
        
        # Priority 2: Look for large images that might be hero
        if not hero_found:
            for img in self.soup.find_all('img'):
                src = img.get('src', '')
                if not src or not self._is_valid_image_url(src):
                    continue
                if 'logo' in src.lower():
                    continue
                
                # Check image dimensions if available
                width = img.get('width', '')
                height = img.get('height', '')
                
                # Check parent classes for hero patterns
                parent = img.parent
                if parent:
                    parent_classes = ' '.join(parent.get('class', [])).lower()
                    parent_id = (parent.get('id') or '').lower()
                    
                    if any(p in parent_classes or p in parent_id for p in hero_patterns):
                        full_url = urljoin(self.base_url, src) if self.base_url else src
                        self.data['hero_image_url'] = full_url
                        hero_found = True
                        break
                    
                    # Large images are often hero images
                    try:
                        if (width and int(width) >= 600) or (height and int(height) >= 300):
                            full_url = urljoin(self.base_url, src) if self.base_url else src
                            self.data['hero_image_url'] = full_url
                            hero_found = True
                            break
                    except ValueError:
                        pass
        
        # ====== COLLECT GALLERY IMAGES ======
        seen_urls = set()
        logo_url = self.data.get('logo_url', '')
        hero_url = self.data.get('hero_image_url', '')
        
        for img in self.soup.find_all('img'):
            src = img.get('src', '')
            if not src or not self._is_valid_image_url(src):
                continue
            
            full_url = urljoin(self.base_url, src) if self.base_url else src
            
            # Skip if already used as logo/hero or duplicate
            if full_url in seen_urls or full_url == logo_url or full_url == hero_url:
                continue
            
            # Skip common non-content images
            if any(skip in src.lower() for skip in skip_patterns):
                continue
            
            # Skip very small images (likely icons)
            width = img.get('width', '')
            height = img.get('height', '')
            try:
                if (width and int(width) < 50) or (height and int(height) < 50):
                    continue
            except ValueError:
                pass
            
            seen_urls.add(full_url)
            images.append(full_url)
            
            if len(images) >= 10:
                break
        
        if images:
            self.data['gallery_images'] = images
    
    def _is_valid_image_url(self, url):
        """Check if URL is a valid image URL"""
        if not url:
            return False
        
        # Skip data URIs and invalid schemes
        if url.startswith('data:'):
            return False
        
        # Check for common image extensions
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
        url_lower = url.lower().split('?')[0]  # Remove query params
        
        # If extension matches, it's likely an image
        if any(url_lower.endswith(ext) for ext in image_extensions):
            return True
        
        # If no extension but looks like a CDN/image URL, allow it
        image_hosts = ['cloudinary', 'imgix', 'unsplash', 'amazonaws', 'googleusercontent', 'wp-content/uploads']
        if any(host in url.lower() for host in image_hosts):
            return True
        
        # Allow URLs with image in the path
        if '/image' in url.lower() or '/img/' in url.lower() or '/photo' in url.lower():
            return True
        
        return True  # Default to allowing the URL
    
    def _extract_facilities(self):
        """Extract facilities information"""
        facilities = []
        
        facility_keywords = [
            'laboratory', 'library', 'sports', 'swimming', 'playground',
            'computer', 'science lab', 'auditorium', 'chapel', 'mosque',
            'cafeteria', 'dormitory', 'hostel', 'clinic', 'bus',
            'football', 'basketball', 'tennis', 'track', 'field'
        ]
        
        text = self.soup.get_text().lower()
        
        for keyword in facility_keywords:
            if keyword in text:
                facilities.append(keyword.title())
        
        if facilities:
            self.data['facilities'] = list(set(facilities))
    
    def _extract_social_links(self):
        """Extract social media links"""
        social = {}
        
        social_patterns = {
            'facebook': r'facebook\.com/[\w\.-]+',
            'twitter': r'twitter\.com/[\w]+',
            'instagram': r'instagram\.com/[\w\.-]+',
            'linkedin': r'linkedin\.com/[\w/-]+',
            'youtube': r'youtube\.com/[\w/-]+',
        }
        
        for link in self.soup.find_all('a', href=True):
            href = link.get('href', '')
            for platform, pattern in social_patterns.items():
                if platform not in social and re.search(pattern, href, re.I):
                    social[platform] = href
        
        if social:
            self.data['social_links'] = social
    
    def _calculate_confidence(self):
        """Calculate confidence score based on extracted data"""
        score = 0.0
        weights = {
            'extracted_name': 0.1,
            'about_text': 0.15,
            'principal_name': 0.1,
            'phone': 0.15,
            'email': 0.15,
            'address': 0.1,
            'logo_url': 0.1,
            'facilities': 0.1,
            'social_links': 0.05,
        }
        
        for field, weight in weights.items():
            if field in self.data and self.data[field]:
                score += weight
        
        self.confidence = min(score, 1.0)
    
    def _clean_text(self, text):
        """Clean and normalize text"""
        if not text:
            return ''
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text
    
    def _normalize_phone(self, phone):
        """Normalize phone number format"""
        # Remove all non-digits
        digits = re.sub(r'\D', '', phone)
        
        # Convert to Nigerian format
        if digits.startswith('234'):
            return '+' + digits
        elif digits.startswith('0'):
            return '+234' + digits[1:]
        
        return phone


def parse_school_page(html, base_url=None):
    """
    Parse school information from HTML
    
    Returns:
        tuple: (data_dict, confidence_score)
    """
    parser = SchoolParser(html, base_url)
    return parser.parse()
