"""
Robust Search Engine Implementation for Nigerian Directory Crawler
================================================================
Implements reliable search across multiple engines with proper error handling,
rate limiting, and fallback mechanisms.

This module provides working search functionality that handles:
- Network issues and timeouts
- Anti-bot detection
- Rate limiting
- Response parsing
- Error recovery
"""

import os
import re
import time
import random
import requests
import logging
from urllib.parse import urlencode, quote_plus
from typing import Dict, List, Optional, Tuple, Any
from bs4 import BeautifulSoup
from datetime import datetime

# Import retry handler
from retry_handler import retry_handler, retry_on_network_error
from urllib.parse import quote_plus, unquote, urlparse, urljoin
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import json

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Standardized search result format"""
    title: str
    snippet: str
    url: str
    source: str
    domain: str = ""
    confidence: float = 0.0
    
    def __post_init__(self):
        if self.url:
            parsed = urlparse(self.url)
            self.domain = parsed.netloc.lower()


class RobustSearchEngine:
    """
    Robust search engine with multiple fallback strategies
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # Rate limiting
        self.last_search_time = {}
        self.min_delay = 2.0  # Minimum delay between searches
        self.max_delay = 5.0  # Maximum delay

        # Rotated between attempts. Repeating a single fingerprint from one
        # address is what triggers the 429 and captcha responses seen in
        # production logs.
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
            '(KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
            '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        ]

        # Per-engine backoff applied after throttling, in seconds.
        self.engine_cooldown_until = {}

        # Retry policy for a single engine within one query.
        self.max_attempts_per_engine = 3
        self.backoff_base = 4.0
        
        # Blocked domains (avoid social media, irrelevant sites)
        self.blocked_domains = {
            'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
            'youtube.com', 'tiktok.com', 'pinterest.com', 'snapchat.com',
            'whatsapp.com', 'telegram.org', 'reddit.com'
        }
        
        # Preferred domains (prioritize these)
        self.trusted_domains = {
            'wikipedia.org', 'edu.ng', 'gov.ng', 'guardian.ng',
            'punch.ng', 'vanguardngr.com', 'thenationonlineng.net',
            'dailypost.ng', 'premiumtimesng.com', 'businessday.ng',
            'thisday.ng', 'sunnewsonline.com'
        }
        
        # Success tracking for engine reliability
        self.engine_stats = {
            'duckduckgo': {'attempts': 0, 'successes': 0},
            'startpage': {'attempts': 0, 'successes': 0},
            'searx': {'attempts': 0, 'successes': 0},
            'bing': {'attempts': 0, 'successes': 0}
        }
    
    def _wait_for_rate_limit(self, engine: str):
        """Implement smart rate limiting"""
        now = time.time()
        last_time = self.last_search_time.get(engine, 0)
        
        # Calculate delay based on engine reliability
        stats = self.engine_stats.get(engine, {})
        success_rate = stats.get('successes', 0) / max(stats.get('attempts', 1), 1)
        
        # Slower engines get longer delays
        if success_rate < 0.3:
            delay = self.max_delay * 1.5
        elif success_rate < 0.6:
            delay = self.max_delay
        else:
            delay = self.min_delay
        
        # Add random jitter
        delay += random.uniform(0.5, 2.0)
        
        elapsed = now - last_time
        if elapsed < delay:
            wait_time = delay - elapsed
            logger.debug(f"Rate limiting {engine}: waiting {wait_time:.1f}s")
            time.sleep(wait_time)
        
        self.last_search_time[engine] = time.time()
    
    def _rotate_user_agent(self):
        """Present a different browser fingerprint on the next request."""
        self.session.headers['User-Agent'] = random.choice(self.user_agents)

    def _in_cooldown(self, engine: str) -> bool:
        """Whether an engine is still being rested after throttling."""
        return time.time() < self.engine_cooldown_until.get(engine, 0)

    def _apply_cooldown(self, engine: str, seconds: float):
        """Rest an engine so repeated hammering does not deepen a block."""
        self.engine_cooldown_until[engine] = time.time() + seconds
        logger.warning(f"{engine} cooling down for {seconds:.0f}s after throttling")

    def _is_valid_result(self, result: SearchResult) -> bool:
        """Validate search result quality"""
        if not result.url or not result.title:
            return False
        
        # Check blocked domains
        if any(blocked in result.domain for blocked in self.blocked_domains):
            return False
        
        # Check minimum content quality
        if len(result.title) < 10 or len(result.snippet) < 20:
            return False
        
        # URL must be HTTP/HTTPS
        if not result.url.startswith(('http://', 'https://')):
            return False
        
        return True
    
    def _calculate_confidence(self, result: SearchResult, query: str) -> float:
        """Calculate confidence score for result relevance"""
        score = 0.5  # Base score
        
        query_lower = query.lower()
        title_lower = result.title.lower()
        snippet_lower = result.snippet.lower()
        
        # Boost for trusted domains
        if any(trusted in result.domain for trusted in self.trusted_domains):
            score += 0.3
        
        # Boost for Nigeria-related content
        nigeria_terms = ['nigeria', 'nigerian', 'lagos', 'abuja', 'kano', 'ibadan']
        if any(term in snippet_lower for term in nigeria_terms):
            score += 0.2
        
        # Boost for educational terms
        edu_terms = ['school', 'education', 'student', 'academic', 'curriculum', 'exam']
        edu_matches = sum(1 for term in edu_terms if term in snippet_lower)
        score += min(edu_matches * 0.1, 0.3)
        
        # Boost for exact matches in title
        if '"' in query:
            exact_term = query.split('"')[1] if '"' in query else ""
            if exact_term.lower() in title_lower:
                score += 0.4
        
        # Penalty for irrelevant domains
        spam_indicators = ['blogspot', 'wordpress', 'medium.com', 'scribd']
        if any(indicator in result.domain for indicator in spam_indicators):
            score -= 0.2
        
        result.confidence = max(0.0, min(1.0, score))
        return result.confidence
    
    @retry_on_network_error(max_retries=3)
    def search_duckduckgo(self, query: str, num_results: int = 15) -> List[SearchResult]:
        """
        Search DuckDuckGo using multiple methods
        """
        results = []
        engine = 'duckduckgo'
        
        self.engine_stats[engine]['attempts'] += 1
        self._wait_for_rate_limit(engine)
        
        # Method 1: Try DDGS library if available
        try:
            from ddgs import DDGS
            
            with DDGS() as ddgs:
                search_results = list(ddgs.text(query, max_results=num_results))
                
                for r in search_results:
                    result = SearchResult(
                        title=r.get('title', ''),
                        snippet=r.get('body', ''),
                        url=r.get('href', ''),
                        source='duckduckgo'
                    )
                    
                    if self._is_valid_result(result):
                        self._calculate_confidence(result, query)
                        results.append(result)
            
            if results:
                self.engine_stats[engine]['successes'] += 1
                logger.info(f"DuckDuckGo DDGS: {len(results)} results")
                return results
            
        except Exception as e:
            logger.debug(f"DuckDuckGo DDGS failed: {e}")
        
        # Method 2: HTML scraping fallback
        try:
            search_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                for result_elem in soup.select('.result__body')[:num_results]:
                    title_elem = result_elem.select_one('.result__title a')
                    snippet_elem = result_elem.select_one('.result__snippet')
                    
                    if title_elem and snippet_elem:
                        # Extract URL
                        href = title_elem.get('href', '')
                        url = ''
                        
                        if 'uddg=' in href:
                            url_match = re.search(r'uddg=([^&]+)', href)
                            if url_match:
                                url = unquote(url_match.group(1))
                        else:
                            url = href
                        
                        result = SearchResult(
                            title=title_elem.get_text(strip=True),
                            snippet=snippet_elem.get_text(strip=True),
                            url=url,
                            source='duckduckgo'
                        )
                        
                        if self._is_valid_result(result):
                            self._calculate_confidence(result, query)
                            results.append(result)
            
            if results:
                self.engine_stats[engine]['successes'] += 1
                logger.info(f"DuckDuckGo HTML: {len(results)} results")
            else:
                logger.warning("DuckDuckGo HTML returned no valid results")
            
        except Exception as e:
            logger.error(f"DuckDuckGo HTML search failed: {e}")
        
        return results
    
    @retry_on_network_error(max_retries=3)
    def search_startpage(self, query: str, num_results: int = 10) -> List[SearchResult]:
        """
        Search Startpage (Google proxy without tracking)
        """
        results = []
        engine = 'startpage'
        
        self.engine_stats[engine]['attempts'] += 1
        self._wait_for_rate_limit(engine)
        
        try:
            search_url = f"https://www.startpage.com/sp/search?query={quote_plus(query)}&language=english&t=device"
            
            response = self.session.get(search_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Startpage uses different selectors
                for result_elem in soup.select('.w-gl__result')[:num_results]:
                    title_elem = result_elem.select_one('.w-gl__result-title a')
                    snippet_elem = result_elem.select_one('.w-gl__description')
                    
                    if title_elem and snippet_elem:
                        # Startpage emits relative hrefs. Passing those through
                        # unchanged meant _is_valid_result rejected every
                        # result for not starting with http, which is why this
                        # engine reported "no valid results" indefinitely.
                        raw_href = title_elem.get('href', '')
                        absolute_href = urljoin(search_url, raw_href) if raw_href else ''

                        result = SearchResult(
                            title=title_elem.get_text(strip=True),
                            snippet=snippet_elem.get_text(strip=True),
                            url=absolute_href,
                            source='startpage'
                        )
                        
                        if self._is_valid_result(result):
                            self._calculate_confidence(result, query)
                            results.append(result)
            
            if results:
                self.engine_stats[engine]['successes'] += 1
                logger.info(f"Startpage: {len(results)} results")
            else:
                logger.warning("Startpage returned no valid results")
            
        except Exception as e:
            logger.error(f"Startpage search failed: {e}")
        
        return results
    
    @retry_on_network_error(max_retries=3)
    def search_bing(self, query: str, num_results: int = 10) -> List[SearchResult]:
        """
        Search Bing with anti-bot measures
        """
        results = []
        engine = 'bing'
        
        self.engine_stats[engine]['attempts'] += 1
        self._wait_for_rate_limit(engine)
        
        try:
            search_url = f"https://www.bing.com/search?q={quote_plus(query)}&count={num_results}"
            
            # Use more realistic headers for Bing
            headers = self.session.headers.copy()
            headers.update({
                'Referer': 'https://www.bing.com/',
                'Sec-Fetch-Site': 'same-origin'
            })
            
            response = self.session.get(search_url, headers=headers, timeout=20)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Bing organic results
                for result_elem in soup.select('.b_algo')[:num_results]:
                    title_elem = result_elem.select_one('h2 a')
                    snippet_elem = result_elem.select_one('.b_caption p, .b_snippet')
                    
                    if title_elem and snippet_elem:
                        result = SearchResult(
                            title=title_elem.get_text(strip=True),
                            snippet=snippet_elem.get_text(strip=True),
                            url=title_elem.get('href', ''),
                            source='bing'
                        )
                        
                        if self._is_valid_result(result):
                            self._calculate_confidence(result, query)
                            results.append(result)
            
            if results:
                self.engine_stats[engine]['successes'] += 1
                logger.info(f"Bing: {len(results)} results")
            else:
                logger.warning("Bing returned no valid results")
            
        except Exception as e:
            logger.error(f"Bing search failed: {e}")
        
        return results
    
    def multi_engine_search(self, query: str, max_results: int = 20) -> List[SearchResult]:
        """
        Search multiple engines and combine results
        """
        all_results = []

        # Try each engine in order of reliability
        engines = [
            ('duckduckgo', 8),
            ('bing', 6),
            ('startpage', 6),
        ]

        handlers = {
            'duckduckgo': self.search_duckduckgo,
            'bing': self.search_bing,
            'startpage': self.search_startpage,
        }

        for engine_name, max_per_engine in engines:
            if self._in_cooldown(engine_name):
                logger.info(f"Skipping {engine_name}, still in cooldown")
                continue

            handler = handlers.get(engine_name)
            if handler is None:
                continue

            # Retry the engine a few times with exponential backoff. The
            # previous implementation made a single attempt and swallowed any
            # exception, so transient throttling produced a silent empty
            # result and the caller proceeded with no content at all.
            for attempt in range(1, self.max_attempts_per_engine + 1):
                try:
                    logger.info(
                        f"Searching {engine_name} (attempt {attempt}) for: {query[:50]}..."
                    )
                    self._rotate_user_agent()
                    results = handler(query, max_per_engine)

                    if results:
                        all_results.extend(results)
                        break

                    # An empty result set from a working engine usually means
                    # throttling or a captcha interstitial rather than a
                    # genuine absence of matches.
                    if attempt < self.max_attempts_per_engine:
                        wait = self.backoff_base * (2 ** (attempt - 1))
                        wait += random.uniform(0, 2.0)
                        logger.warning(
                            f"{engine_name} returned nothing, backing off {wait:.1f}s"
                        )
                        time.sleep(wait)
                    else:
                        self._apply_cooldown(engine_name, 120)

                except Exception as e:
                    logger.error(f"Engine {engine_name} attempt {attempt} failed: {e}")
                    if attempt < self.max_attempts_per_engine:
                        wait = self.backoff_base * (2 ** (attempt - 1))
                        time.sleep(wait + random.uniform(0, 2.0))
                    else:
                        self._apply_cooldown(engine_name, 180)

            # Stop once there is enough strong material.
            high_confidence = [r for r in all_results if r.confidence > 0.7]
            if len(high_confidence) >= max(1, max_results // 2):
                break

        # Deduplicate by URL and sort by confidence
        seen_urls = set()
        unique_results = []

        for result in sorted(all_results, key=lambda x: x.confidence, reverse=True):
            if result.url not in seen_urls:
                seen_urls.add(result.url)
                unique_results.append(result)

        if not unique_results:
            # Surface total failure instead of letting callers interpret an
            # empty list as "no such information exists".
            logger.error(
                f"All search engines returned no usable results for: {query[:80]}"
            )

        return unique_results[:max_results]
    
    def get_engine_stats(self) -> Dict[str, Any]:
        """Get performance statistics for all engines"""
        stats = {}
        
        for engine, data in self.engine_stats.items():
            attempts = data['attempts']
            successes = data['successes']
            success_rate = (successes / attempts * 100) if attempts > 0 else 0
            
            stats[engine] = {
                'attempts': attempts,
                'successes': successes,
                'success_rate': f"{success_rate:.1f}%",
                'status': 'good' if success_rate > 70 else 'poor' if success_rate > 30 else 'failing'
            }
        
        return stats


# Global search engine instance
search_engine = RobustSearchEngine()


def search_web(query: str, max_results: int = 15) -> List[SearchResult]:
    """
    Main search function - use this in your crawlers
    """
    return search_engine.multi_engine_search(query, max_results)


def get_search_stats() -> Dict[str, Any]:
    """
    Get search engine performance statistics
    """
    return search_engine.get_engine_stats()


if __name__ == "__main__":
    # Test the search functionality
    test_queries = [
        '"Green Springs School" Lagos Nigeria',
        'Kings College Lagos Nigeria history',
        'Nigerian schools education system'
    ]
    
    print("Testing search engines...")
    print("=" * 50)
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        results = search_web(query, 5)
        
        if results:
            print(f"Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"{i}. {result.title[:60]}...")
                print(f"   URL: {result.url[:70]}...")
                print(f"   Confidence: {result.confidence:.2f}")
        else:
            print("No results found")
        
        time.sleep(3)
    
    print("\n" + "=" * 50)
    print("Search Engine Statistics:")
    stats = get_search_stats()
    for engine, data in stats.items():
        print(f"{engine}: {data['success_rate']} ({data['status']})")