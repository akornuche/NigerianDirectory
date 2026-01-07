"""
HTTP Fetcher with robots.txt compliance
"""
import os
import time
import random
import requests
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
from fake_useragent import UserAgent

class Fetcher:
    def __init__(self):
        self.user_agent = os.getenv('CRAWLER_USER_AGENT', 'NigerianDirectory Bot/1.0')
        self.delay = float(os.getenv('CRAWLER_DELAY', 2))
        self.max_retries = int(os.getenv('CRAWLER_MAX_RETRIES', 3))
        self.timeout = 30
        self.robots_cache = {}
        self.ua = UserAgent()
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
    def _get_robots_parser(self, url):
        """Get or create robots.txt parser for domain"""
        parsed = urlparse(url)
        domain = f"{parsed.scheme}://{parsed.netloc}"
        
        if domain not in self.robots_cache:
            robots_url = urljoin(domain, '/robots.txt')
            parser = RobotFileParser()
            parser.set_url(robots_url)
            
            try:
                parser.read()
                self.robots_cache[domain] = parser
            except Exception as e:
                print(f"⚠️  Could not read robots.txt for {domain}: {e}")
                # Create permissive parser if robots.txt fails
                self.robots_cache[domain] = None
        
        return self.robots_cache[domain]
    
    def can_fetch(self, url):
        """Check if URL can be fetched according to robots.txt"""
        parser = self._get_robots_parser(url)
        
        if parser is None:
            # No robots.txt or failed to parse - assume allowed
            return True
        
        return parser.can_fetch(self.user_agent, url)
    
    def get_crawl_delay(self, url):
        """Get crawl delay from robots.txt or use default"""
        parser = self._get_robots_parser(url)
        
        if parser is None:
            return self.delay
        
        delay = parser.crawl_delay(self.user_agent)
        return delay if delay else self.delay
    
    def fetch(self, url, respect_robots=True):
        """
        Fetch a URL with retries and robots.txt compliance
        
        Returns:
            dict: {
                'success': bool,
                'html': str or None,
                'status_code': int or None,
                'error': str or None,
                'url': str (final URL after redirects)
            }
        """
        result = {
            'success': False,
            'html': None,
            'status_code': None,
            'error': None,
            'url': url
        }
        
        # Check robots.txt
        if respect_robots and not self.can_fetch(url):
            result['error'] = 'Blocked by robots.txt'
            return result
        
        # Respect crawl delay
        delay = self.get_crawl_delay(url)
        
        for attempt in range(self.max_retries):
            try:
                # Add random jitter to delay
                time.sleep(delay + random.uniform(0.5, 1.5))
                
                response = self.session.get(
                    url,
                    timeout=self.timeout,
                    allow_redirects=True
                )
                
                result['status_code'] = response.status_code
                result['url'] = response.url
                
                if response.status_code == 200:
                    result['success'] = True
                    result['html'] = response.text
                    return result
                elif response.status_code == 404:
                    result['error'] = 'Page not found (404)'
                    return result
                elif response.status_code == 403:
                    result['error'] = 'Access forbidden (403)'
                    return result
                elif response.status_code == 429:
                    # Rate limited - wait longer
                    wait_time = (attempt + 1) * 30
                    print(f"⏳ Rate limited. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    result['error'] = f'HTTP error {response.status_code}'
                    
            except requests.exceptions.Timeout:
                result['error'] = 'Request timeout'
            except requests.exceptions.ConnectionError:
                result['error'] = 'Connection error'
            except Exception as e:
                result['error'] = str(e)
            
            # Wait before retry
            if attempt < self.max_retries - 1:
                wait_time = (attempt + 1) * 5
                print(f"⚠️  Attempt {attempt + 1} failed for {url}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        return result
    
    def fetch_image(self, url, save_path):
        """
        Fetch and save an image
        
        Returns:
            dict: {
                'success': bool,
                'path': str or None,
                'error': str or None
            }
        """
        result = {
            'success': False,
            'path': None,
            'error': None
        }
        
        try:
            response = self.session.get(url, timeout=self.timeout, stream=True)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    with open(save_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    result['success'] = True
                    result['path'] = save_path
                else:
                    result['error'] = 'Not an image'
            else:
                result['error'] = f'HTTP {response.status_code}'
                
        except Exception as e:
            result['error'] = str(e)
        
        return result


# Singleton instance
fetcher = Fetcher()

def fetch_url(url, respect_robots=True):
    """Convenience function to fetch a URL"""
    return fetcher.fetch(url, respect_robots)

def fetch_image(url, save_path):
    """Convenience function to fetch an image"""
    return fetcher.fetch_image(url, save_path)
