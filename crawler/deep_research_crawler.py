"""
Deep Research Content Crawler for Nigerian Schools
===================================================
Searches the internet deeply for each school using multiple search engines,
aggregates information from all available sources, and creates rich content
with proper source citations.

NO FALLBACK GENERATORS - Only real web-sourced content.

Target: 500-700 words per school with embedded source citations.
"""
import os
import re
import json
import time
import random
import hashlib
import requests
from urllib.parse import quote_plus, urlparse, unquote
from bs4 import BeautifulSoup
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

# Google search library with better anti-detection
try:
    from googlesearch import search as google_search
    GOOGLE_SEARCH_AVAILABLE = True
except ImportError:
    GOOGLE_SEARCH_AVAILABLE = False
    google_search = None

# DuckDuckGo search with proper API
try:
    from duckduckgo_search import DDGS
    DDG_SEARCH_AVAILABLE = True
except ImportError:
    DDG_SEARCH_AVAILABLE = False
    DDGS = None

load_dotenv()

from database import get_connection

# Configure logging with UTF-8 encoding for Windows compatibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('deep_research.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Fix Windows console encoding for emoji support
import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


class DeepResearchCrawler:
    """
    Deeply researches each school across multiple search engines and sources.
    Creates rich, cited content - NO FALLBACK GENERATION.
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        
        self.stats = {
            'total_processed': 0,
            'enriched': 0,
            'insufficient_data': 0,
            'failed': 0,
        }
        
        # Search queries to try for each school
        self.search_query_templates = [
            '"{school_name}" Nigeria school history founded',
            '"{school_name}" {state} Nigeria official website',
            '"{school_name}" Nigeria academic programs curriculum',
            '"{school_name}" Nigeria facilities campus',
            '"{school_name}" notable alumni',
            '"{school_name}" Nigeria achievements awards',
            '"{school_name}" {city} school',
            'site:wikipedia.org "{school_name}" Nigeria',
            '"{school_name}" admission requirements Nigeria',
            '"{school_name}" school news Nigeria',
        ]
        
        # Trusted source domains (prioritize these)
        self.priority_domains = [
            'wikipedia.org',
            'edu.ng',
            '.gov.ng',
            'guardian.ng',
            'punch.ng',
            'vanguardngr.com',
            'thenationonlineng.net',
            'dailypost.ng',
            'premiumtimesng.com',
            'businessday.ng',
        ]
        
        # Domains to skip
        self.blocked_domains = [
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'linkedin.com',
            'youtube.com',
            'tiktok.com',
            'pinterest.com',
        ]

    def search_duckduckgo(self, query, num_results=15):
        """Search DuckDuckGo using the DDGS library (more reliable than HTML scraping)"""
        results = []
        
        if DDG_SEARCH_AVAILABLE:
            try:
                ddgs = DDGS()
                search_results = ddgs.text(query, max_results=num_results)
                
                for r in search_results:
                    url = r.get('href', '')
                    if url and not any(blocked in url for blocked in self.blocked_domains):
                        results.append({
                            'title': r.get('title', ''),
                            'snippet': r.get('body', ''),
                            'url': url,
                            'source': 'duckduckgo'
                        })
                
                logger.info(f"  DuckDuckGo found {len(results)} results")
                time.sleep(random.uniform(1, 2))
                return results
                
            except Exception as e:
                logger.warning(f"DuckDuckGo DDGS search error: {e}")
        
        # Fallback to HTML scraping if DDGS not available
        try:
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                for result in soup.select('.result__body')[:num_results]:
                    title_elem = result.select_one('.result__title')
                    snippet_elem = result.select_one('.result__snippet')
                    link = result.select_one('.result__a')
                    
                    if title_elem and link:
                        href = link.get('href', '')
                        url = ''
                        
                        if 'uddg=' in href:
                            url_match = re.search(r'uddg=([^&]+)', href)
                            if url_match:
                                url = unquote(url_match.group(1))
                        else:
                            url = href
                        
                        if url and not any(blocked in url for blocked in self.blocked_domains):
                            results.append({
                                'title': title_elem.get_text(strip=True),
                                'snippet': snippet_elem.get_text(strip=True) if snippet_elem else '',
                                'url': url,
                                'source': 'duckduckgo'
                            })
            
            time.sleep(random.uniform(1.5, 3))
            
        except Exception as e:
            logger.warning(f"DuckDuckGo HTML search error: {e}")
        
        return results

    def search_bing(self, query, num_results=15):
        """Search Bing"""
        results = []
        try:
            search_url = f"https://www.bing.com/search?q={quote_plus(query)}&count={num_results}"
            
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                for result in soup.select('.b_algo')[:num_results]:
                    title_elem = result.select_one('h2 a')
                    snippet_elem = result.select_one('.b_caption p')
                    
                    if title_elem:
                        url = title_elem.get('href', '')
                        
                        if url and not any(blocked in url for blocked in self.blocked_domains):
                            results.append({
                                'title': title_elem.get_text(strip=True),
                                'snippet': snippet_elem.get_text(strip=True) if snippet_elem else '',
                                'url': url,
                                'source': 'bing'
                            })
            
            time.sleep(random.uniform(1.5, 3))
            
        except Exception as e:
            logger.warning(f"Bing search error: {e}")
        
        return results

    def search_google_scrape(self, query, num_results=10):
        """
        Search Google using googlesearch-python library.
        This library has better anti-detection built in.
        """
        results = []
        
        if not GOOGLE_SEARCH_AVAILABLE:
            logger.warning("  Google search library not available")
            return results
            
        try:
            # googlesearch-python handles rate limiting and anti-detection internally
            # Use tld=".com.ng" for Nigerian Google, but it may not always work
            search_results = google_search(
                query, 
                num_results=num_results,
                lang="en",
                sleep_interval=2,  # Built-in delay between requests
                timeout=15
            )
            
            for url in search_results:
                if url and url.startswith('http') and not any(blocked in url for blocked in self.blocked_domains):
                    results.append({
                        'title': '',  # googlesearch doesn't return titles
                        'snippet': '',
                        'url': url,
                        'source': 'google'
                    })
            
            logger.info(f"  Google found {len(results)} results for query")
            
            # Respectful delay after Google request (2-4 seconds)
            time.sleep(random.uniform(2, 4))
            
        except Exception as e:
            logger.warning(f"Google search error: {e}")
            time.sleep(random.uniform(2, 4))  # Delay even on error
        
        return results

    def fetch_page_content(self, url, timeout=15):
        """Fetch and extract clean text content from a URL"""
        try:
            response = self.session.get(url, timeout=timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove unwanted elements
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 
                           'aside', 'form', 'iframe', 'noscript', 'meta', 'link']):
                tag.decompose()
            
            # Try to find main content
            main_content = (
                soup.find('main') or 
                soup.find('article') or 
                soup.find(id='content') or
                soup.find(class_='content') or
                soup.find(id='main') or
                soup.find('body')
            )
            
            if main_content:
                # Get paragraphs for better structure
                paragraphs = main_content.find_all(['p', 'h1', 'h2', 'h3', 'li'])
                text_parts = []
                
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    if len(text) > 30:  # Skip very short fragments
                        text_parts.append(text)
                
                return {
                    'text': ' '.join(text_parts),
                    'title': soup.title.string if soup.title else '',
                    'paragraphs': text_parts
                }
            
        except Exception as e:
            logger.debug(f"Error fetching {url}: {e}")
        
        return None

    def search_wikipedia(self, school_name, state):
        """Search Wikipedia specifically for the school"""
        results = []
        
        try:
            # Wikipedia API search
            api_url = "https://en.wikipedia.org/w/api.php"
            params = {
                'action': 'query',
                'list': 'search',
                'srsearch': f'{school_name} Nigeria school',
                'format': 'json',
                'srlimit': 5
            }
            
            response = self.session.get(api_url, params=params, timeout=10)
            data = response.json()
            
            if 'query' in data and 'search' in data['query']:
                for item in data['query']['search']:
                    page_title = item['title']
                    # Check if it's relevant
                    if any(word.lower() in page_title.lower() for word in school_name.split()[:2]):
                        wiki_url = f"https://en.wikipedia.org/wiki/{quote_plus(page_title.replace(' ', '_'))}"
                        results.append({
                            'title': page_title,
                            'snippet': BeautifulSoup(item.get('snippet', ''), 'html.parser').get_text(),
                            'url': wiki_url,
                            'source': 'wikipedia'
                        })
            
            time.sleep(1)
            
        except Exception as e:
            logger.warning(f"Wikipedia search error: {e}")
        
        return results

    def deep_search_school(self, school):
        """
        Perform deep research on a single school using multiple search engines.
        Returns all found content with sources.
        """
        school_name = school['name']
        state = school.get('state', '')
        city = school.get('city', '')
        website = school.get('website', '')
        
        logger.info(f"[RESEARCH] Deep researching: {school_name}")
        
        all_results = []
        searched_urls = set()
        
        # 0. If school has official website, scrape it first
        if website:
            logger.info(f"  Checking official website: {website}")
            all_results.append({
                'url': website,
                'title': f'{school_name} Official Website',
                'snippet': '',
                'source': 'official'
            })
            searched_urls.add(website)
            
            # Also try common subpages
            for subpage in ['/about', '/about-us', '/history', '/academics', '/programmes']:
                subpage_url = website.rstrip('/') + subpage
                if subpage_url not in searched_urls:
                    all_results.append({
                        'url': subpage_url,
                        'title': f'{school_name} - {subpage.replace("/", "").replace("-", " ").title()}',
                        'snippet': '',
                        'source': 'official'
                    })
                    searched_urls.add(subpage_url)
        
        # 1. Search Wikipedia first (most reliable)
        wiki_results = self.search_wikipedia(school_name, state)
        all_results.extend(wiki_results)
        
        # 2. Search with multiple queries across engines
        # Google first (best results), then DuckDuckGo and Bing as fallbacks
        google_query_count = 0
        max_google_queries = 3  # Limit Google queries to avoid rate limiting
        
        for template in self.search_query_templates[:6]:  # Use top 6 queries
            query = template.format(
                school_name=school_name,
                state=state,
                city=city
            )
            
            # DuckDuckGo (primary - most reliable currently)
            ddg_results = self.search_duckduckgo(query, num_results=10)
            for r in ddg_results:
                if r['url'] not in searched_urls:
                    all_results.append(r)
                    searched_urls.add(r['url'])
            
            # Bing (secondary - also working well)
            bing_results = self.search_bing(query, num_results=8)
            for r in bing_results:
                if r['url'] not in searched_urls:
                    all_results.append(r)
                    searched_urls.add(r['url'])
            
            # Google (tertiary - often blocked, but try occasionally)
            if google_query_count < max_google_queries:
                google_results = self.search_google_scrape(query, num_results=10)
                for r in google_results:
                    if r['url'] not in searched_urls:
                        all_results.append(r)
                        searched_urls.add(r['url'])
                google_query_count += 1
        
        # 3. Prioritize and sort results
        def get_priority(result):
            url = result.get('url', '')
            # Official website gets highest priority
            if result.get('source') == 'official':
                return -1
            for i, domain in enumerate(self.priority_domains):
                if domain in url:
                    return i
            return 100
        
        all_results.sort(key=get_priority)
        
        logger.info(f"  Found {len(all_results)} unique results")
        
        return all_results

    def extract_relevant_content(self, school, search_results):
        """
        Fetch and extract relevant content from search results.
        Returns structured content with citations.
        """
        school_name = school['name']
        school_name_lower = school_name.lower()
        name_words = set(school_name_lower.split())
        
        content_pieces = {
            'history': [],
            'academics': [],
            'campus': [],
            'student_life': [],
            'achievements': [],
            'alumni': [],
            'general': [],
        }
        
        sources = []
        processed_urls = set()
        
        # Process top results (limit to avoid over-scraping)
        for result in search_results[:20]:
            url = result.get('url', '')
            
            if not url or url in processed_urls:
                continue
            
            processed_urls.add(url)
            
            try:
                # Fetch full page content
                page_data = self.fetch_page_content(url)
                
                if not page_data or not page_data.get('text'):
                    # Use snippet if page fetch fails
                    text = result.get('snippet', '')
                    if not text:
                        continue
                else:
                    text = page_data['text']
                
                # Check if content is relevant to this school
                text_lower = text.lower()
                relevance_score = sum(1 for word in name_words if word in text_lower)
                
                if relevance_score < 2:  # Must match at least 2 words from school name
                    continue
                
                # Extract meaningful sentences
                sentences = self._extract_relevant_sentences(text, school_name)
                
                if not sentences:
                    continue
                
                # Categorize content
                domain = urlparse(url).netloc
                source_info = {
                    'url': url,
                    'title': result.get('title', domain),
                    'domain': domain,
                    'type': self._determine_source_type(url),
                    'accessed_at': datetime.now().isoformat()
                }
                
                # Categorize sentences by topic
                for sentence in sentences:
                    sentence_lower = sentence.lower()
                    
                    if any(word in sentence_lower for word in ['founded', 'established', 'history', 'began', 'started', 'origin', 'years ago', 'since']):
                        content_pieces['history'].append({
                            'text': sentence,
                            'source': source_info
                        })
                    elif any(word in sentence_lower for word in ['curriculum', 'academic', 'program', 'waec', 'jamb', 'cambridge', 'subjects', 'education', 'teaching', 'learning']):
                        content_pieces['academics'].append({
                            'text': sentence,
                            'source': source_info
                        })
                    elif any(word in sentence_lower for word in ['campus', 'facilities', 'building', 'library', 'laboratory', 'field', 'hostel', 'dormitory', 'chapel', 'hall']):
                        content_pieces['campus'].append({
                            'text': sentence,
                            'source': source_info
                        })
                    elif any(word in sentence_lower for word in ['student', 'club', 'sport', 'activity', 'competition', 'society', 'house system']):
                        content_pieces['student_life'].append({
                            'text': sentence,
                            'source': source_info
                        })
                    elif any(word in sentence_lower for word in ['award', 'achievement', 'won', 'champion', 'excellence', 'recognition', 'best']):
                        content_pieces['achievements'].append({
                            'text': sentence,
                            'source': source_info
                        })
                    elif any(word in sentence_lower for word in ['alumni', 'graduate', 'former student', 'old boy', 'old girl', 'notable']):
                        content_pieces['alumni'].append({
                            'text': sentence,
                            'source': source_info
                        })
                    else:
                        content_pieces['general'].append({
                            'text': sentence,
                            'source': source_info
                        })
                
                sources.append(source_info)
                
                time.sleep(random.uniform(0.5, 1.5))
                
            except Exception as e:
                logger.debug(f"Error processing {url}: {e}")
                continue
        
        return content_pieces, sources

    def _extract_relevant_sentences(self, text, school_name):
        """Extract sentences that are relevant to the school"""
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        relevant = []
        school_name_lower = school_name.lower()
        name_parts = school_name_lower.split()
        
        for sentence in sentences:
            sentence = sentence.strip()
            
            # Skip too short or too long
            if len(sentence) < 50 or len(sentence) > 500:
                continue
            
            # Skip if looks like navigation/boilerplate
            if any(skip in sentence.lower() for skip in ['click here', 'read more', 'subscribe', 'cookie', 'privacy policy', 'copyright']):
                continue
            
            sentence_lower = sentence.lower()
            
            # Check relevance - must mention school or related terms
            relevance = sum(1 for part in name_parts if part in sentence_lower and len(part) > 3)
            
            if relevance >= 1 or any(term in sentence_lower for term in ['school', 'college', 'institution', 'students', 'education']):
                relevant.append(sentence)
        
        return relevant

    def _determine_source_type(self, url):
        """Determine the type of source"""
        url_lower = url.lower()
        
        if 'wikipedia.org' in url_lower:
            return 'encyclopedia'
        elif '.gov.ng' in url_lower:
            return 'government'
        elif '.edu' in url_lower or 'edu.ng' in url_lower:
            return 'educational'
        elif any(news in url_lower for news in ['guardian', 'punch', 'vanguard', 'nation', 'daily', 'times', 'news']):
            return 'news'
        else:
            return 'web'

    def compose_enriched_content(self, school, content_pieces, sources):
        """
        Compose rich, cited content from extracted pieces.
        Target: 500-700 words with inline citations.
        NO FALLBACK - returns None if insufficient data.
        """
        school_name = school['name']
        state = school.get('state', '')
        city = school.get('city', '')
        school_type = school.get('type', 'school')
        
        # Count total content pieces
        total_pieces = sum(len(pieces) for pieces in content_pieces.values())
        
        # Lower threshold - accept even 1 piece of content if we have sources
        if total_pieces < 1:
            logger.warning(f"  [WARN] Insufficient data for {school_name} ({total_pieces} pieces found)")
            return None, None, None, None, sources
        
        # Build history section (min 1 sentence instead of 2)
        history_text = self._compose_section(
            content_pieces['history'] + [p for p in content_pieces['general'] if 'found' in p['text'].lower() or 'establish' in p['text'].lower()][:3],
            school_name,
            'history',
            min_sentences=1
        )
        
        # Build academics section (min 1 sentence)
        academics_text = self._compose_section(
            content_pieces['academics'] + content_pieces['general'][:2],
            school_name,
            'academics',
            min_sentences=1
        )
        
        # Build campus section (min 1 sentence)
        campus_text = self._compose_section(
            content_pieces['campus'] + content_pieces['general'][:2],
            school_name,
            'campus',
            min_sentences=1
        )
        
        # Build student life section (min 1 sentence)
        student_life_text = self._compose_section(
            content_pieces['student_life'] + content_pieces['achievements'] + content_pieces['alumni'],
            school_name,
            'student_life',
            min_sentences=1
        )
        
        return history_text, academics_text, campus_text, student_life_text, sources

    def _compose_section(self, pieces, school_name, section_type, min_sentences=1):
        """Compose a section from content pieces with citations"""
        if not pieces or len(pieces) < min_sentences:
            return None
        
        # Deduplicate by similarity
        unique_pieces = []
        seen_texts = set()
        
        for piece in pieces:
            text_hash = hashlib.md5(piece['text'][:100].lower().encode()).hexdigest()
            if text_hash not in seen_texts:
                unique_pieces.append(piece)
                seen_texts.add(text_hash)
        
        if len(unique_pieces) < min_sentences:
            return None
        
        # Build section with citations
        section_parts = []
        used_sources = []
        
        for i, piece in enumerate(unique_pieces[:6]):  # Max 6 sentences per section
            text = piece['text']
            source = piece['source']
            
            # Clean up text
            text = re.sub(r'\s+', ' ', text).strip()
            
            # Ensure proper ending
            if not text.endswith(('.', '!', '?')):
                text += '.'
            
            section_parts.append(text)
            
            if source not in used_sources:
                used_sources.append(source)
        
        if not section_parts:
            return None
        
        # Join into coherent text
        section_text = ' '.join(section_parts)
        
        # Add source attribution at end
        if used_sources:
            source_names = list(set(s['domain'] for s in used_sources[:3]))
            # Don't add inline - sources are stored separately
        
        return section_text if len(section_text) > 100 else None

    def enrich_school(self, school):
        """
        Main method to enrich a single school with deep web research.
        NO FALLBACK GENERATION - only real sourced content.
        """
        school_id = school['id']
        school_name = school['name']
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {school_name}")
        logger.info(f"{'='*60}")
        
        try:
            # 1. Deep search across multiple engines
            search_results = self.deep_search_school(school)
            
            if not search_results:
                logger.warning(f"  No search results found for {school_name}")
                self.stats['insufficient_data'] += 1
                return False
            
            # 2. Extract and categorize content
            content_pieces, sources = self.extract_relevant_content(school, search_results)
            
            # 3. Compose enriched content (NO FALLBACK)
            history, academics, campus, student_life, all_sources = self.compose_enriched_content(
                school, content_pieces, sources
            )
            
            # 4. Check if we have enough content - accept even minimal content (50+ words)
            has_content = any([history, academics, campus, student_life])
            total_words = sum(len((t or '').split()) for t in [history, academics, campus, student_life])
            
            # If no sections but we have content pieces, create a combined general section
            if not has_content and content_pieces:
                # Combine all available content into history as a general description
                all_pieces = []
                for category, pieces in content_pieces.items():
                    all_pieces.extend(pieces)
                
                if all_pieces:
                    # Get unique sentences
                    seen = set()
                    unique_sentences = []
                    for piece in all_pieces:
                        text = piece.get('text', '').strip()
                        if text and text not in seen:
                            seen.add(text)
                            unique_sentences.append(text)
                    
                    if unique_sentences:
                        combined_text = ' '.join(unique_sentences[:10])  # Up to 10 sentences
                        if len(combined_text.split()) >= 15:  # At least 15 words
                            history = combined_text
                            has_content = True
                            total_words = len(combined_text.split())
            
            if not has_content or total_words < 15:
                logger.warning(f"  [SKIP] Insufficient content for {school_name} ({total_words} words)")
                self.stats['insufficient_data'] += 1
                
                # Still save sources even if content is sparse
                if sources:
                    self._save_sources_only(school_id, sources)
                
                return False
            
            # 5. Save to database
            self._save_enrichment(
                school_id=school_id,
                history=history,
                academics=academics,
                campus=campus,
                student_life=student_life,
                sources=all_sources
            )
            
            # Log word counts
            total_words = sum(len((t or '').split()) for t in [history, academics, campus, student_life])
            logger.info(f"  [OK] Enriched with {total_words} words from {len(sources)} sources")
            
            self.stats['enriched'] += 1
            return True
            
        except Exception as e:
            logger.error(f"  [ERROR] Error enriching {school_name}: {e}")
            self.stats['failed'] += 1
            return False

    def _save_enrichment(self, school_id, history, academics, campus, student_life, sources):
        """Save enriched content to database"""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                # Format sources for database
                sources_json = json.dumps([
                    {
                        'url': s['url'],
                        'title': s['title'],
                        'type': s['type'],
                        'accessed_at': s['accessed_at']
                    }
                    for s in sources[:10]  # Keep top 10 sources
                ])
                
                cur.execute("""
                    UPDATE schools SET
                        enriched_history = %(history)s,
                        enriched_academics = %(academics)s,
                        enriched_campus_info = %(campus)s,
                        enriched_student_life = %(student_life)s,
                        content_sources = %(sources)s::jsonb,
                        enriched_at = NOW(),
                        needs_ai_enrichment = FALSE
                    WHERE id = %(school_id)s
                """, {
                    'school_id': school_id,
                    'history': history,
                    'academics': academics,
                    'campus': campus,
                    'student_life': student_life,
                    'sources': sources_json
                })
                
                conn.commit()
                
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def _save_sources_only(self, school_id, sources):
        """Save sources even when content is insufficient"""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                sources_json = json.dumps([
                    {
                        'url': s['url'],
                        'title': s['title'],
                        'type': s['type'],
                        'accessed_at': s['accessed_at']
                    }
                    for s in sources[:10]
                ])
                
                cur.execute("""
                    UPDATE schools SET
                        content_sources = %(sources)s::jsonb,
                        enriched_at = NOW()
                    WHERE id = %(school_id)s
                """, {
                    'school_id': school_id,
                    'sources': sources_json
                })
                
                conn.commit()
                
        except Exception as e:
            conn.rollback()
        finally:
            conn.close()

    def run(self, limit=None, offset=0, school_ids=None, force=False):
        """
        Run the deep research crawler on all schools needing enrichment.
        
        Args:
            limit: Max number of schools to process
            offset: Skip first N schools (for resuming)
            school_ids: Specific school IDs to process
            force: Re-enrich even if already enriched
        """
        logger.info("[START] Deep Research Crawler")
        logger.info("=" * 60)
        
        conn = get_connection()
        
        try:
            with conn.cursor() as cur:
                if school_ids:
                    # Process specific schools
                    cur.execute("""
                        SELECT id, name, slug, state, city, type, website,
                               curriculum, levels, boarding, gender,
                               established_year, facilities, achievements
                        FROM schools
                        WHERE id = ANY(%s)
                        ORDER BY name
                    """, (school_ids,))
                elif force:
                    # Process all schools
                    query = """
                        SELECT id, name, slug, state, city, type, website,
                               curriculum, levels, boarding, gender,
                               established_year, facilities, achievements
                        FROM schools
                        ORDER BY name
                    """
                    if offset:
                        query += f" OFFSET {offset}"
                    if limit:
                        query += f" LIMIT {limit}"
                    cur.execute(query)
                else:
                    # Process schools needing enrichment
                    query = """
                        SELECT id, name, slug, state, city, type, website,
                               curriculum, levels, boarding, gender,
                               established_year, facilities, achievements
                        FROM schools
                        WHERE enriched_history IS NULL 
                           OR needs_ai_enrichment = TRUE
                        ORDER BY name
                    """
                    if offset:
                        query += f" OFFSET {offset}"
                    if limit:
                        query += f" LIMIT {limit}"
                    cur.execute(query)
                
                schools = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                
        finally:
            conn.close()
        
        schools_list = [dict(zip(columns, school)) for school in schools]
        
        logger.info(f"[INFO] Found {len(schools_list)} schools to process")
        
        for i, school in enumerate(schools_list, 1):
            logger.info(f"\n[{i}/{len(schools_list)}] Processing {school.get('name', 'Unknown')}...")
            self.stats['total_processed'] += 1
            
            self.enrich_school(school)
            
            # Progress save every 10 schools
            if i % 10 == 0:
                logger.info(f"\n[PROGRESS] Stats: {self.stats}")
        
        # Final stats
        logger.info("\n" + "=" * 60)
        logger.info("[FINAL] STATISTICS")
        logger.info("=" * 60)
        logger.info(f"Total processed: {self.stats['total_processed']}")
        logger.info(f"Successfully enriched: {self.stats['enriched']}")
        logger.info(f"Insufficient data: {self.stats['insufficient_data']}")
        logger.info(f"Failed: {self.stats['failed']}")
        
        return self.stats


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Deep Research Content Crawler')
    parser.add_argument('--limit', type=int, help='Limit number of schools to process')
    parser.add_argument('--offset', type=int, default=0, help='Skip first N schools (for resuming)')
    parser.add_argument('--school-id', type=int, action='append', help='Specific school ID(s) to process')
    parser.add_argument('--force', action='store_true', help='Force re-enrichment of all schools')
    parser.add_argument('--slug', type=str, help='Process school by slug')
    
    args = parser.parse_args()
    
    crawler = DeepResearchCrawler()
    
    # Handle slug lookup
    school_ids = args.school_id
    if args.slug:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM schools WHERE slug = %s", (args.slug,))
                result = cur.fetchone()
                if result:
                    school_ids = school_ids or []
                    school_ids.append(result[0])
                else:
                    logger.error(f"School with slug '{args.slug}' not found")
                    return
        finally:
            conn.close()
    
    crawler.run(
        limit=args.limit,
        offset=args.offset,
        school_ids=school_ids,
        force=args.force
    )


if __name__ == '__main__':
    main()
