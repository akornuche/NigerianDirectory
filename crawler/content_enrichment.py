"""
Content Enrichment Crawler
Searches the internet to find rich, unique information about each school
to enhance SEO and provide valuable content for users.

Uses multiple sources:
1. School official website
2. DuckDuckGo web search
3. Wikipedia/News articles
"""
import os
import re
import json
import time
import random
import requests
from urllib.parse import quote_plus, urlparse
from bs4 import BeautifulSoup
from datetime import datetime
from dotenv import load_dotenv
import hashlib

load_dotenv()

from database import get_connection

class ContentEnrichmentCrawler:
    """Crawls the web to find rich content about Nigerian schools"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        
        self.stats = {
            'total_processed': 0,
            'enriched': 0,
            'failed': 0,
            'already_enriched': 0,
        }
        
        # Common words to filter out
        self.stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are', 'was', 'were'}
    
    def search_duckduckgo(self, query, num_results=10):
        """Search DuckDuckGo for text results"""
        results = []
        
        try:
            # Use DuckDuckGo HTML search
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find all search results
                for result in soup.select('.result__body')[:num_results]:
                    title_elem = result.select_one('.result__title')
                    snippet_elem = result.select_one('.result__snippet')
                    link_elem = result.select_one('.result__url')
                    
                    if title_elem and snippet_elem:
                        # Get actual URL
                        url = ''
                        link = result.select_one('.result__a')
                        if link and link.get('href'):
                            href = link.get('href')
                            # DuckDuckGo encodes URLs, extract actual URL
                            if 'uddg=' in href:
                                from urllib.parse import unquote
                                url_match = re.search(r'uddg=([^&]+)', href)
                                if url_match:
                                    url = unquote(url_match.group(1))
                            else:
                                url = href
                        
                        results.append({
                            'title': title_elem.get_text(strip=True),
                            'snippet': snippet_elem.get_text(strip=True),
                            'url': url
                        })
            
            time.sleep(random.uniform(1, 2))  # Rate limiting
            
        except Exception as e:
            print(f"  ⚠️  DuckDuckGo search error: {e}")
        
        return results
    
    def fetch_webpage_content(self, url, max_length=10000):
        """Fetch and extract text content from a webpage"""
        try:
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove script, style, nav, footer elements
                for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                    tag.decompose()
                
                # Get main content
                main_content = soup.find('main') or soup.find('article') or soup.find('body')
                
                if main_content:
                    # Get text with preserved structure
                    text = main_content.get_text(separator=' ', strip=True)
                    # Clean up whitespace
                    text = re.sub(r'\s+', ' ', text)
                    return text[:max_length]
            
        except Exception as e:
            print(f"  ⚠️  Error fetching {url}: {e}")
        
        return None
    
    def extract_school_info_from_website(self, website_url):
        """Extract information directly from school's website"""
        info = {
            'history': None,
            'mission': None,
            'vision': None,
            'academics': None,
            'facilities': [],
            'achievements': [],
            'notable_alumni': [],
            'news': [],
        }
        
        if not website_url:
            return info
        
        try:
            base_url = website_url.rstrip('/')
            
            # Common pages to check
            pages_to_check = [
                ('/', 'home'),
                ('/about', 'about'),
                ('/about-us', 'about'),
                ('/history', 'history'),
                ('/our-history', 'history'),
                ('/academics', 'academics'),
                ('/academic', 'academics'),
                ('/programmes', 'academics'),
                ('/curriculum', 'academics'),
                ('/facilities', 'facilities'),
                ('/our-facilities', 'facilities'),
                ('/alumni', 'alumni'),
                ('/notable-alumni', 'alumni'),
                ('/achievements', 'achievements'),
                ('/news', 'news'),
            ]
            
            for path, content_type in pages_to_check:
                try:
                    url = base_url + path if path != '/' else base_url
                    content = self.fetch_webpage_content(url, max_length=15000)
                    
                    if content:
                        if content_type == 'history' and not info['history']:
                            info['history'] = self._extract_history(content)
                        elif content_type == 'about':
                            if not info['history']:
                                info['history'] = self._extract_history(content)
                            if not info['mission']:
                                info['mission'] = self._extract_mission(content)
                            if not info['vision']:
                                info['vision'] = self._extract_vision(content)
                        elif content_type == 'academics' and not info['academics']:
                            info['academics'] = self._extract_academics(content)
                        elif content_type == 'facilities':
                            facilities = self._extract_facilities(content)
                            if facilities:
                                info['facilities'].extend(facilities)
                        elif content_type == 'alumni':
                            alumni = self._extract_alumni(content)
                            if alumni:
                                info['notable_alumni'].extend(alumni)
                        elif content_type == 'achievements':
                            achievements = self._extract_achievements(content)
                            if achievements:
                                info['achievements'].extend(achievements)
                    
                    time.sleep(0.5)  # Be respectful
                    
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"  ⚠️  Error extracting from website: {e}")
        
        return info
    
    def _extract_history(self, content):
        """Extract history information from content"""
        patterns = [
            r'(founded in \d{4}[^.]*\.)',
            r'(established in \d{4}[^.]*\.)',
            r'(since \d{4}[^.]*\.)',
            r'(history[:\s]+[^.]*\.)',
            r'(our school was[^.]*\.)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                return ' '.join(matches[:3])
        
        return None
    
    def _extract_mission(self, content):
        """Extract mission statement"""
        patterns = [
            r'mission[:\s]+([^.]+\.)',
            r'our mission is ([^.]+\.)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_vision(self, content):
        """Extract vision statement"""
        patterns = [
            r'vision[:\s]+([^.]+\.)',
            r'our vision is ([^.]+\.)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_academics(self, content):
        """Extract academic information"""
        # Look for curriculum mentions
        curricula = []
        if 'waec' in content.lower() or 'wassce' in content.lower():
            curricula.append('WAEC/WASSCE')
        if 'cambridge' in content.lower():
            curricula.append('Cambridge')
        if 'igcse' in content.lower():
            curricula.append('IGCSE')
        if 'ib ' in content.lower() or 'international baccalaureate' in content.lower():
            curricula.append('IB')
        if 'neco' in content.lower():
            curricula.append('NECO')
        
        if curricula:
            return f"The school offers {', '.join(curricula)} curriculum."
        
        return None
    
    def _extract_facilities(self, content):
        """Extract facilities mentioned"""
        facilities = []
        facility_keywords = [
            'library', 'laboratory', 'science lab', 'computer lab', 'ict center',
            'swimming pool', 'football field', 'basketball court', 'tennis court',
            'gymnasium', 'hostel', 'dormitory', 'cafeteria', 'dining hall',
            'chapel', 'mosque', 'clinic', 'sick bay', 'auditorium', 'hall',
            'playground', 'sports complex', 'art studio', 'music room',
        ]
        
        content_lower = content.lower()
        for facility in facility_keywords:
            if facility in content_lower:
                facilities.append(facility.title())
        
        return list(set(facilities))
    
    def _extract_alumni(self, content):
        """Extract notable alumni names"""
        # This is tricky - we'll look for common patterns
        alumni = []
        
        # Look for "Dr.", "Prof.", "Chief", etc. followed by names
        patterns = [
            r'((?:Dr\.|Prof\.|Chief|Alhaji|Alh\.|Senator|Hon\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content)
            alumni.extend(matches[:10])  # Limit to 10
        
        return list(set(alumni))
    
    def _extract_achievements(self, content):
        """Extract achievements"""
        achievements = []
        
        patterns = [
            r'(won[^.]*competition[^.]*\.)',
            r'(first place[^.]*\.)',
            r'(award[^.]*\.)',
            r'(champion[^.]*\.)',
            r'(best[^.]*school[^.]*\.)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            achievements.extend(matches[:5])
        
        return list(set(achievements))
    
    def search_for_school_info(self, school_name, state, school_type):
        """Search the web for information about a school"""
        info = {
            'history': None,
            'academics': None,
            'notable_alumni': [],
            'achievements': [],
            'recent_news': [],
            'snippets': [],
        }
        
        # Build search queries
        queries = [
            f'"{school_name}" {state} Nigeria history founded',
            f'"{school_name}" notable alumni',
            f'"{school_name}" {state} achievements awards',
            f'"{school_name}" {school_type} Nigeria',
        ]
        
        all_snippets = []
        
        for query in queries:
            print(f"  🔍 Searching: {query[:50]}...")
            results = self.search_duckduckgo(query, num_results=5)
            
            for result in results:
                snippet = result.get('snippet', '')
                title = result.get('title', '')
                
                # Skip irrelevant results
                if school_name.lower().split()[0] not in snippet.lower() and school_name.lower().split()[0] not in title.lower():
                    continue
                
                all_snippets.append({
                    'text': snippet,
                    'title': title,
                    'url': result.get('url', '')
                })
                
                # Extract specific info
                snippet_lower = snippet.lower()
                
                # History
                if not info['history'] and ('founded' in snippet_lower or 'established' in snippet_lower or 'history' in snippet_lower):
                    year_match = re.search(r'(founded|established|since)\s*(?:in\s*)?(\d{4})', snippet_lower)
                    if year_match:
                        info['history'] = snippet
                
                # Notable alumni
                if 'alumni' in snippet_lower or 'attended' in snippet_lower or 'graduated' in snippet_lower:
                    # Try to extract names
                    names = re.findall(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})', snippet)
                    for name in names:
                        if len(name.split()) >= 2 and name not in info['notable_alumni']:
                            info['notable_alumni'].append(name)
                
                # Achievements
                if 'award' in snippet_lower or 'won' in snippet_lower or 'champion' in snippet_lower:
                    info['achievements'].append(snippet)
        
        info['snippets'] = all_snippets[:10]
        
        return info
    
    def generate_enriched_content(self, school, web_info, website_info):
        """Generate unique, SEO-friendly content from gathered information"""
        enriched = {
            'enriched_history': None,
            'enriched_academics': None,
            'enriched_campus_info': None,
            'enriched_student_life': None,
            'enriched_notable_alumni': [],
            'enriched_recent_news': [],
            'content_sources': [],  # Track all sources for outbound links
        }
        
        # Collect all source URLs for attribution
        sources = []
        
        # Add school's official website as primary source
        if school.get('website'):
            sources.append({
                'url': school['website'],
                'title': f"{school['name']} Official Website",
                'type': 'official'
            })
        
        # Add web search sources
        if web_info.get('snippets'):
            for snippet in web_info['snippets']:
                if snippet.get('url') and snippet['url'] not in [s['url'] for s in sources]:
                    sources.append({
                        'url': snippet['url'],
                        'title': snippet.get('title', 'External Source'),
                        'type': 'reference'
                    })
        
        enriched['content_sources'] = sources[:15]  # Limit to 15 sources
        
        # Combine sources for history
        history_parts = []
        if website_info.get('history'):
            history_parts.append(website_info['history'])
        if web_info.get('history'):
            history_parts.append(web_info['history'])
        
        if history_parts or school.get('established_year'):
            established = school.get('established_year', '')
            if established:
                history_parts.insert(0, f"{school['name']} was established in {established}.")
            
            enriched['enriched_history'] = ' '.join(history_parts) if history_parts else self._generate_history_fallback(school)
        else:
            enriched['enriched_history'] = self._generate_history_fallback(school)
        
        # Academics content
        academics_parts = []
        if website_info.get('academics'):
            academics_parts.append(website_info['academics'])
        if website_info.get('mission'):
            academics_parts.append(f"The school's mission: {website_info['mission']}")
        
        if academics_parts:
            enriched['enriched_academics'] = ' '.join(academics_parts)
        else:
            enriched['enriched_academics'] = self._generate_academics_fallback(school)
        
        # Campus info
        facilities = school.get('facilities', []) or []
        if website_info.get('facilities'):
            facilities = list(set(facilities + website_info['facilities']))
        
        if facilities:
            enriched['enriched_campus_info'] = self._generate_campus_content(school, facilities)
        else:
            enriched['enriched_campus_info'] = self._generate_campus_fallback(school)
        
        # Student life
        enriched['enriched_student_life'] = self._generate_student_life(school, website_info)
        
        # Notable alumni
        all_alumni = []
        if website_info.get('notable_alumni'):
            all_alumni.extend(website_info['notable_alumni'])
        if web_info.get('notable_alumni'):
            all_alumni.extend(web_info['notable_alumni'])
        
        enriched['enriched_notable_alumni'] = list(set(all_alumni))[:10]
        
        # Recent news/achievements
        all_achievements = []
        if school.get('achievements'):
            all_achievements.extend(school['achievements'])
        if website_info.get('achievements'):
            all_achievements.extend(website_info['achievements'])
        if web_info.get('achievements'):
            all_achievements.extend(web_info['achievements'])
        
        enriched['enriched_recent_news'] = list(set(all_achievements))[:5]
        
        return enriched
    
    def _generate_history_fallback(self, school):
        """Generate unique history content when no web data available"""
        name = school['name']
        state = school['state']
        area = school.get('area', school.get('city', ''))
        school_type = school.get('type', 'school')
        established = school.get('established_year', '')
        
        # Create variations based on school characteristics
        templates = [
            f"{name} stands as a cornerstone of educational excellence in {area}, {state}. {'Founded in ' + str(established) + ', the' if established else 'The'} institution has grown to become one of the most respected {school_type}s in the region, consistently producing graduates who excel in various fields.",
            f"Located in the heart of {area}, {state}, {name} has established itself as a premier educational institution. {'Since its founding in ' + str(established) + ', ' if established else ''}The school has maintained a tradition of academic rigor combined with holistic student development.",
            f"{name} represents the best of Nigerian education in {state}. {'Established in ' + str(established) + ', this' if established else 'This'} distinguished {school_type} has been nurturing young minds and preparing them for success in an increasingly competitive world.",
        ]
        
        # Use hash to consistently select a template for each school
        hash_val = int(hashlib.md5(name.encode()).hexdigest(), 16) % len(templates)
        return templates[hash_val]
    
    def _generate_academics_fallback(self, school):
        """Generate unique academics content"""
        name = school['name']
        curriculum = school.get('curriculum', []) or []
        levels = school.get('levels', []) or []
        school_type = school.get('type', 'school')
        
        # Handle both string and list formats for curriculum
        if isinstance(curriculum, str):
            curriculum_text = curriculum if curriculum else 'Nigerian curriculum'
        else:
            curriculum_text = ', '.join(curriculum) if curriculum else 'Nigerian curriculum'
        
        # Handle both string and list formats for levels
        if isinstance(levels, str):
            levels_text = levels if levels else 'various academic levels'
        else:
            levels_text = ', '.join(levels) if levels else 'various academic levels'
        
        templates = [
            f"At {name}, academic excellence is not just a goal—it&apos;s a way of life. The school offers comprehensive programs following the {curriculum_text}, catering to {levels_text}. Students benefit from experienced educators who employ modern teaching methodologies alongside traditional Nigerian educational values.",
            f"The academic program at {name} is designed to challenge and inspire students at every level. Following the {curriculum_text}, the school prepares students for national examinations while fostering critical thinking and problem-solving skills essential for success in the 21st century.",
            f"{name} delivers a robust academic curriculum that balances rigorous scholarship with practical application. The {curriculum_text} framework ensures students receive internationally recognized qualifications while maintaining strong connections to Nigerian educational standards.",
        ]
        
        hash_val = int(hashlib.md5(name.encode()).hexdigest(), 16) % len(templates)
        return templates[hash_val]
    
    def _generate_campus_content(self, school, facilities):
        """Generate campus content based on facilities"""
        name = school['name']
        facilities_text = ', '.join(facilities[:5])
        
        return f"The campus of {name} features modern facilities designed to support comprehensive student development. Key amenities include {facilities_text}, and more. These resources enable students to explore their interests beyond the classroom and develop well-rounded personalities."
    
    def _generate_campus_fallback(self, school):
        """Generate campus content when no facilities known"""
        name = school['name']
        boarding = school.get('boarding', False)
        
        if boarding:
            return f"As a boarding institution, {name} provides comprehensive residential facilities alongside academic resources. The campus is designed to be a home away from home, where students can focus on their studies while enjoying recreational activities and building lifelong friendships with fellow students."
        else:
            return f"The {name} campus provides a conducive learning environment with facilities that support both academic pursuits and extracurricular activities. The school continues to invest in infrastructure improvements to ensure students have access to the resources they need to succeed."
    
    def _generate_student_life(self, school, website_info):
        """Generate student life content"""
        name = school['name']
        boarding = school.get('boarding', False)
        gender = school.get('gender', 'mixed')
        
        gender_text = {
            'boys': 'young men',
            'girls': 'young women',
            'mixed': 'students of all genders'
        }.get(gender, 'students')
        
        boarding_text = "The boarding experience fosters independence, time management, and deep friendships that often last a lifetime." if boarding else "As a day school, students benefit from the balance of rigorous academics during school hours and family time at home."
        
        templates = [
            f"Life at {name} extends far beyond academics. {gender_text.capitalize()} participate in a variety of clubs, sports teams, and cultural activities that develop leadership skills and foster personal growth. {boarding_text} The school community is known for its supportive atmosphere where every student is encouraged to discover and pursue their passions.",
            f"Student life at {name} is vibrant and engaging. {gender_text.capitalize()} have opportunities to participate in inter-house competitions, cultural festivals, and community service projects. {boarding_text} The school emphasizes character development alongside academic achievement, producing graduates who are not only knowledgeable but also compassionate members of society.",
        ]
        
        hash_val = int(hashlib.md5(name.encode()).hexdigest(), 16) % len(templates)
        return templates[hash_val]
    
    def enrich_school(self, school, force=False):
        """Enrich a single school with web-sourced content"""
        school_id = school['id']
        school_name = school['name']
        state = school['state']
        website = school.get('website')
        school_type = school.get('type', 'school')
        
        print(f"\n📚 Enriching: {school_name} ({state})")
        
        # Check if already enriched (skip if has content AND has sources, unless forced)
        content_sources = school.get('content_sources')
        has_sources = content_sources and len(content_sources) > 0
        has_content = school.get('enriched_history') and school.get('enriched_academics')
        
        if has_content and has_sources and not force:
            print(f"  ✅ Already enriched with sources, skipping")
            self.stats['already_enriched'] += 1
            return False
        
        if has_content and not has_sources:
            print(f"  🔄 Re-enriching to collect source URLs...")
        
        # Step 1: Try to get info from school website
        print(f"  🌐 Checking school website...")
        website_info = self.extract_school_info_from_website(website)
        
        # Step 2: Search the web for additional info
        print(f"  🔎 Searching web for additional info...")
        web_info = self.search_for_school_info(school_name, state, school_type)
        
        # Step 3: Generate enriched content
        print(f"  ✍️  Generating enriched content...")
        enriched = self.generate_enriched_content(school, web_info, website_info)
        
        # Step 4: Save to database
        print(f"  💾 Saving to database...")
        success = self.save_enriched_content(school_id, enriched)
        
        if success:
            print(f"  ✅ Successfully enriched {school_name}")
            self.stats['enriched'] += 1
        else:
            print(f"  ❌ Failed to save enrichment for {school_name}")
            self.stats['failed'] += 1
        
        self.stats['total_processed'] += 1
        
        return success
    
    def save_enriched_content(self, school_id, enriched):
        """Save enriched content to database"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            query = """
                UPDATE schools SET
                    enriched_history = %(enriched_history)s,
                    enriched_academics = %(enriched_academics)s,
                    enriched_campus_info = %(enriched_campus_info)s,
                    enriched_student_life = %(enriched_student_life)s,
                    enriched_notable_alumni = %(enriched_notable_alumni)s,
                    enriched_recent_news = %(enriched_recent_news)s,
                    content_sources = %(content_sources)s,
                    needs_ai_enrichment = FALSE,
                    updated_at = NOW()
                WHERE id = %(school_id)s
            """
            
            params = {
                'school_id': school_id,
                'enriched_history': enriched.get('enriched_history'),
                'enriched_academics': enriched.get('enriched_academics'),
                'enriched_campus_info': enriched.get('enriched_campus_info'),
                'enriched_student_life': enriched.get('enriched_student_life'),
                'enriched_notable_alumni': json.dumps(enriched.get('enriched_notable_alumni', [])),
                'enriched_recent_news': json.dumps(enriched.get('enriched_recent_news', [])),
                'content_sources': json.dumps(enriched.get('content_sources', [])),
            }
            
            cursor.execute(query, params)
            conn.commit()
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"  ⚠️  Database error: {e}")
            return False
    
    def get_schools_to_enrich(self, limit=None, include_missing_sources=False):
        """Get schools that need enrichment"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            if include_missing_sources:
                # Get schools that have content but no sources
                query = """
                    SELECT id, name, slug, type, state, city, area, website,
                           established_year, curriculum, levels, boarding, gender,
                           facilities, achievements, enriched_history, enriched_academics,
                           content_sources
                    FROM schools
                    WHERE enriched_history IS NOT NULL 
                      AND (content_sources IS NULL OR content_sources = '[]'::jsonb)
                    ORDER BY verified DESC, name
                """
            else:
                query = """
                    SELECT id, name, slug, type, state, city, area, website,
                           established_year, curriculum, levels, boarding, gender,
                           facilities, achievements, enriched_history, enriched_academics,
                           content_sources
                    FROM schools
                    WHERE enriched_history IS NULL OR needs_ai_enrichment = TRUE
                    ORDER BY verified DESC, name
                """
            
            if limit:
                query += f" LIMIT {limit}"
            
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            schools = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            cursor.close()
            conn.close()
            
            return schools
            
        except Exception as e:
            print(f"Database error: {e}")
            return []
    
    def run(self, limit=None, include_missing_sources=False):
        """Run the content enrichment process"""
        print("=" * 60)
        print("🚀 CONTENT ENRICHMENT CRAWLER")
        print("=" * 60)
        
        schools = self.get_schools_to_enrich(limit, include_missing_sources=include_missing_sources)
        total = len(schools)
        
        mode = "missing sources" if include_missing_sources else "standard enrichment"
        print(f"\n📊 Found {total} schools to enrich (mode: {mode})")
        
        if not schools:
            print("No schools need enrichment!")
            return
        
        for i, school in enumerate(schools, 1):
            print(f"\n[{i}/{total}]", "-" * 50)
            
            try:
                self.enrich_school(school)
            except Exception as e:
                print(f"  ❌ Error: {e}")
                self.stats['failed'] += 1
            
            # Rate limiting - be respectful to web servers
            time.sleep(random.uniform(2, 4))
        
        # Print final stats
        print("\n" + "=" * 60)
        print("📊 ENRICHMENT COMPLETE")
        print("=" * 60)
        print(f"Total Processed: {self.stats['total_processed']}")
        print(f"Successfully Enriched: {self.stats['enriched']}")
        print(f"Already Enriched: {self.stats['already_enriched']}")
        print(f"Failed: {self.stats['failed']}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Content Enrichment Crawler')
    parser.add_argument('--limit', type=int, help='Limit number of schools to process')
    parser.add_argument('--school', type=str, help='Process specific school by slug')
    parser.add_argument('--add-sources', action='store_true', help='Re-enrich schools that have content but no sources')
    
    args = parser.parse_args()
    
    crawler = ContentEnrichmentCrawler()
    
    if args.school:
        # Process specific school
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, slug, type, state, city, area, website,
                       established_year, curriculum, levels, boarding, gender,
                       facilities, achievements, enriched_history, enriched_academics,
                       content_sources
                FROM schools WHERE slug = %s
            """, (args.school,))
            
            columns = [desc[0] for desc in cursor.description]
            row = cursor.fetchone()
            
            if row:
                school = dict(zip(columns, row))
                crawler.enrich_school(school)
            else:
                print(f"School not found: {args.school}")
            
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Error: {e}")
    else:
        crawler.run(limit=args.limit, include_missing_sources=args.add_sources)


if __name__ == '__main__':
    main()
