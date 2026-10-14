"""
Website Content Extractor for Nigerian Schools
==============================================
Robust extraction of structured content directly from school websites.
This is the primary source before falling back to search engines.
"""

import os
import re
import time
import random
import logging
from urllib.parse import urljoin, urlparse, quote_plus
from typing import Dict, List, Optional, Tuple, Any, Set
import requests
from bs4 import BeautifulSoup, NavigableString, Tag
from datetime import datetime
import json

# Import retry handler
from retry_handler import retry_handler, retry_on_network_error

# Imported by crawler entry points, so root logging is left to the
# application. See the note in content_crawler_fixed.py.
logger = logging.getLogger(__name__)
logger.addHandler(logging.NullHandler())

class WebsiteExtractor:
    """
    Extracts structured content from school websites
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        })
        
        # Content extraction patterns
        self.history_keywords = [
            'history', 'founded', 'established', 'began', 'started', 'heritage',
            'background', 'inception', 'origin', 'genesis', 'chronology'
        ]
        
        self.academics_keywords = [
            'academic', 'curriculum', 'program', 'course', 'subject', 'department',
            'study', 'education', 'learning', 'teaching', 'instruction', 'syllabus'
        ]
        
        self.campus_keywords = [
            'campus', 'facility', 'building', 'infrastructure', 'location',
            'premises', 'compound', 'environment', 'resources', 'equipment'
        ]
        
        self.student_life_keywords = [
            'student', 'life', 'activity', 'club', 'society', 'sport', 'recreation',
            'extracurricular', 'co-curricular', 'community', 'culture', 'social'
        ]
        
        # Common page patterns to check
        self.page_patterns = {
            'about': ['about', 'about-us', 'our-school', 'school-profile', 'overview'],
            'history': ['history', 'our-history', 'heritage', 'background', 'timeline'],
            'academics': ['academics', 'curriculum', 'programs', 'departments', 'studies'],
            'admissions': ['admissions', 'admission', 'enrollment', 'apply', 'entry'],
            'facilities': ['facilities', 'campus', 'infrastructure', 'resources'],
            'student_life': ['student-life', 'activities', 'clubs', 'sports', 'community'],
            'news': ['news', 'updates', 'announcements', 'events', 'blog'],
            'contact': ['contact', 'contact-us', 'reach-us', 'location']
        }
        
        # Statistics
        self.stats = {
            'websites_processed': 0,
            'pages_extracted': 0,
            'content_sections_found': 0,
            'failed_extractions': 0
        }
    
    def normalize_url(self, url: str) -> str:
        """Normalize URL format"""
        if not url:
            return ""
        
        url = url.strip()
        
        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Remove trailing slash
        url = url.rstrip('/')
        
        return url
    
    @retry_on_network_error(max_retries=3)
    def discover_pages(self, base_url: str) -> Dict[str, List[str]]:
        """
        Discover relevant pages on the school website
        """
        discovered = {category: [] for category in self.page_patterns.keys()}
        
        try:
            response = self.session.get(base_url, timeout=15)
            if response.status_code != 200:
                return discovered
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all links
            links = soup.find_all('a', href=True)
            
            for link in links:
                href = link.get('href', '').lower()
                link_text = link.get_text(strip=True).lower()
                
                # Convert relative URLs to absolute
                if href.startswith('/'):
                    full_url = urljoin(base_url, href)
                elif href.startswith('http'):
                    full_url = href
                else:
                    continue
                
                # Check against patterns
                for category, patterns in self.page_patterns.items():
                    for pattern in patterns:
                        if (pattern in href or pattern in link_text) and full_url not in discovered[category]:
                            discovered[category].append(full_url)
                            break
            
            logger.info(f"Discovered pages: {sum(len(pages) for pages in discovered.values())} total")
            
        except Exception as e:
            logger.error(f"Error discovering pages for {base_url}: {e}")
        
        return discovered
    
    @retry_on_network_error(max_retries=2)
    def extract_page_content(self, url: str) -> Dict[str, Any]:
        """
        Extract structured content from a single page
        """
        content = {
            'url': url,
            'title': '',
            'text_content': '',
            'structured_content': {},
            'metadata': {},
            'success': False
        }
        
        try:
            response = self.session.get(url, timeout=15)
            if response.status_code != 200:
                return content
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract page title
            title_tag = soup.find('title')
            if title_tag:
                content['title'] = title_tag.get_text(strip=True)
            
            # Extract meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                content['metadata']['description'] = meta_desc.get('content', '')
            
            # Remove unwanted elements
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'menu', 'iframe']):
                tag.decompose()
            
            # Find main content area
            main_content = self.find_main_content(soup)
            
            if main_content:
                # Extract text content
                content['text_content'] = self.clean_text(main_content.get_text(separator=' ', strip=True))
                
                # Extract structured content
                content['structured_content'] = self.extract_structured_content(main_content)
                
                content['success'] = True
                self.stats['pages_extracted'] += 1
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {e}")
            self.stats['failed_extractions'] += 1
        
        return content
    
    def find_main_content(self, soup: BeautifulSoup) -> Optional[Tag]:
        """
        Find the main content area of the page
        """
        # Try semantic tags first
        main_selectors = [
            'main',
            'article', 
            '[role="main"]',
            '.main-content',
            '.content',
            '.page-content',
            '.entry-content',
            '#main',
            '#content',
            '.container .row',
            '.content-area'
        ]
        
        for selector in main_selectors:
            element = soup.select_one(selector)
            if element:
                return element
        
        # Fallback to body
        return soup.find('body')
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common noise patterns
        noise_patterns = [
            r'cookie\s+policy',
            r'privacy\s+policy',
            r'terms\s+of\s+service',
            r'subscribe\s+to\s+newsletter',
            r'follow\s+us\s+on',
            r'copyright\s+\d{4}',
            r'all\s+rights\s+reserved'
        ]
        
        for pattern in noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Ensure proper sentence endings
        text = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', text)
        
        return text.strip()
    
    def extract_structured_content(self, content_element: Tag) -> Dict[str, Any]:
        """
        Extract structured information from content
        """
        structured = {
            'headings': [],
            'paragraphs': [],
            'lists': [],
            'tables': [],
            'contact_info': {},
            'key_facts': {}
        }
        
        # Extract headings
        for heading in content_element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            heading_text = self.clean_text(heading.get_text())
            if heading_text and len(heading_text) > 5:
                structured['headings'].append({
                    'level': int(heading.name[1]),
                    'text': heading_text
                })
        
        # Extract paragraphs
        for para in content_element.find_all('p'):
            para_text = self.clean_text(para.get_text())
            if para_text and len(para_text) > 20:  # Only substantial paragraphs
                structured['paragraphs'].append(para_text)
        
        # Extract lists
        for list_elem in content_element.find_all(['ul', 'ol']):
            list_items = []
            for item in list_elem.find_all('li'):
                item_text = self.clean_text(item.get_text())
                if item_text:
                    list_items.append(item_text)
            
            if list_items:
                structured['lists'].append({
                    'type': list_elem.name,
                    'items': list_items
                })
        
        # Extract contact information
        structured['contact_info'] = self.extract_contact_info(content_element)
        
        # Extract key facts (years, numbers, etc.)
        structured['key_facts'] = self.extract_key_facts(content_element.get_text())
        
        return structured
    
    def extract_contact_info(self, content_element: Tag) -> Dict[str, Any]:
        """Extract contact information from content"""
        contact = {
            'phone': [],
            'email': [],
            'address': [],
            'social': []
        }
        
        text = content_element.get_text()
        
        # Phone numbers
        phone_patterns = [
            r'\+?234[-\s]?[0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{4}',
            r'0[0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{4}',
            r'\([0-9]{3}\)\s?[0-9]{3}[-\s]?[0-9]{4}'
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, text)
            contact['phone'].extend(phones)
        
        # Email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        contact['email'].extend(emails)
        
        # Social media links
        social_links = content_element.find_all('a', href=True)
        for link in social_links:
            href = link.get('href', '')
            if any(social in href.lower() for social in ['facebook', 'twitter', 'instagram', 'linkedin']):
                contact['social'].append(href)
        
        return contact
    
    def extract_key_facts(self, text: str) -> Dict[str, Any]:
        """Extract key facts like founding year, student numbers, etc."""
        facts = {}
        
        # Founding/Established year
        year_patterns = [
            r'(?:established|founded|started|began)\s+(?:in\s+)?(\d{4})',
            r'(\d{4})\s*[-–]\s*present',
            r'since\s+(\d{4})'
        ]
        
        for pattern in year_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                year = int(match.group(1))
                if 1800 <= year <= 2024:  # Reasonable range
                    facts['established_year'] = year
                    break
        
        # Student numbers
        student_patterns = [
            r'(\d{1,4})\s+students?',
            r'student\s+population[:\s]+(\d{1,4})',
            r'enrollment[:\s]+(\d{1,4})'
        ]
        
        for pattern in student_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                facts['student_count'] = int(match.group(1))
                break
        
        return facts
    
    def categorize_content(self, pages_content: Dict[str, Any]) -> Dict[str, str]:
        """
        Categorize and synthesize content from multiple pages
        """
        categorized = {
            'enriched_history': '',
            'enriched_academics': '',
            'enriched_campus_info': '',
            'enriched_student_life': '',
            'contact_info': {},
            'key_facts': {},
            'content_sources': []
        }
        
        # Combine content from all pages
        all_text = ""
        all_structured = []
        
        for page_type, page_content in pages_content.items():
            if isinstance(page_content, list):
                for page in page_content:
                    if page.get('success'):
                        all_text += " " + page.get('text_content', '')
                        all_structured.append(page.get('structured_content', {}))
                        
                        # Add as source
                        categorized['content_sources'].append({
                            'url': page['url'],
                            'title': page.get('title', ''),
                            'type': 'official_website',
                            'page_type': page_type,
                            'accessed_at': datetime.now().isoformat()
                        })
        
        # Extract content by category using keyword matching
        text_lower = all_text.lower()
        
        # History content
        history_content = self.extract_content_by_keywords(
            all_text, pages_content.get('about', []) + pages_content.get('history', []), 
            self.history_keywords
        )
        if history_content:
            categorized['enriched_history'] = history_content[:800]  # Limit length
        
        # Academic content
        academic_content = self.extract_content_by_keywords(
            all_text, pages_content.get('academics', []), 
            self.academics_keywords
        )
        if academic_content:
            categorized['enriched_academics'] = academic_content[:800]
        
        # Campus content
        campus_content = self.extract_content_by_keywords(
            all_text, pages_content.get('facilities', []), 
            self.campus_keywords
        )
        if campus_content:
            categorized['enriched_campus_info'] = campus_content[:800]
        
        # Student life content
        life_content = self.extract_content_by_keywords(
            all_text, pages_content.get('student_life', []), 
            self.student_life_keywords
        )
        if life_content:
            categorized['enriched_student_life'] = life_content[:800]
        
        # Combine contact info and facts from all pages
        for structured in all_structured:
            contact = structured.get('contact_info', {})
            facts = structured.get('key_facts', {})
            
            # Merge contact info
            for key, values in contact.items():
                if key not in categorized['contact_info']:
                    categorized['contact_info'][key] = []
                categorized['contact_info'][key].extend(values)
            
            # Merge key facts
            categorized['key_facts'].update(facts)
        
        # Remove duplicates from contact info
        for key, values in categorized['contact_info'].items():
            categorized['contact_info'][key] = list(set(values))
        
        return categorized
    
    def extract_content_by_keywords(self, full_text: str, pages: List[Dict], keywords: List[str]) -> str:
        """Extract content related to specific keywords"""
        relevant_content = []
        
        # First, try to find content from dedicated pages
        for page in pages:
            if page.get('success'):
                content = page.get('text_content', '')
                if content and len(content) > 100:
                    relevant_content.append(content)
        
        # If no dedicated pages, search in full text
        if not relevant_content:
            sentences = re.split(r'[.!?]+', full_text)
            
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 50:  # Substantial sentences only
                    sentence_lower = sentence.lower()
                    
                    # Check if sentence contains relevant keywords
                    keyword_count = sum(1 for keyword in keywords if keyword in sentence_lower)
                    
                    if keyword_count >= 2:  # At least 2 relevant keywords
                        relevant_content.append(sentence)
        
        # Combine and clean content
        if relevant_content:
            combined = '. '.join(relevant_content[:3])  # Max 3 pieces of content
            return self.clean_text(combined)
        
        return ""
    
    def extract_school_website(self, school_name: str, website_url: str) -> Dict[str, Any]:
        """
        Main method to extract comprehensive content from a school website
        """
        logger.info(f"🌐 Extracting website content for {school_name}")
        logger.info(f"   URL: {website_url}")
        
        result = {
            'success': False,
            'school_name': school_name,
            'website_url': website_url,
            'content': {},
            'error': None,
            'pages_processed': 0
        }
        
        try:
            # Normalize URL
            normalized_url = self.normalize_url(website_url)
            
            # Discover relevant pages
            logger.info(f"   Discovering pages...")
            discovered_pages = self.discover_pages(normalized_url)
            
            # Extract content from discovered pages
            pages_content = {}
            total_pages = 0
            
            for page_type, urls in discovered_pages.items():
                if urls:
                    pages_content[page_type] = []
                    
                    # Process up to 2 pages per type to avoid overload
                    for url in urls[:2]:
                        logger.info(f"   Extracting {page_type}: {url}")
                        page_content = self.extract_page_content(url)
                        pages_content[page_type].append(page_content)
                        total_pages += 1
                        
                        # Small delay between page requests
                        time.sleep(random.uniform(0.5, 1.0))
            
            # Also extract from main page if no specific pages found
            if total_pages == 0:
                logger.info(f"   No specific pages found, extracting from homepage")
                main_content = self.extract_page_content(normalized_url)
                pages_content['main'] = [main_content]
                total_pages = 1
            
            # Categorize and synthesize content
            if total_pages > 0:
                logger.info(f"   Synthesizing content from {total_pages} pages")
                result['content'] = self.categorize_content(pages_content)
                result['success'] = True
                result['pages_processed'] = total_pages
                
                self.stats['content_sections_found'] += len([
                    v for v in result['content'].values() 
                    if isinstance(v, str) and len(v) > 50
                ])
            else:
                result['error'] = 'No content could be extracted'
        
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"❌ Error extracting from {website_url}: {e}")
        
        finally:
            self.stats['websites_processed'] += 1
        
        return result
    
    def get_stats(self) -> Dict[str, int]:
        """Get extraction statistics"""
        return self.stats.copy()


if __name__ == "__main__":
    # Test the website extractor
    extractor = WebsiteExtractor()
    
    # Test with a school website
    test_schools = [
        ("American International School Lagos", "https://aislagos.org"),
        ("Loyola Jesuit College", "https://loyolajesuit.org")
    ]
    
    for school_name, website in test_schools:
        print(f"\nTesting extraction for {school_name}")
        print("=" * 60)
        
        result = extractor.extract_school_website(school_name, website)
        
        if result['success']:
            content = result['content']
            print(f"✅ Successfully extracted content")
            print(f"   Pages processed: {result['pages_processed']}")
            print(f"   History: {len(content.get('enriched_history', ''))} chars")
            print(f"   Academics: {len(content.get('enriched_academics', ''))} chars")
            print(f"   Campus: {len(content.get('enriched_campus_info', ''))} chars")
            print(f"   Student Life: {len(content.get('enriched_student_life', ''))} chars")
            print(f"   Sources: {len(content.get('content_sources', []))}")
            
            if content.get('key_facts'):
                print(f"   Key Facts: {content['key_facts']}")
        else:
            print(f"❌ Extraction failed: {result.get('error')}")
        
        time.sleep(2)  # Rate limiting between tests
    
    print(f"\nExtraction Statistics:")
    stats = extractor.get_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")