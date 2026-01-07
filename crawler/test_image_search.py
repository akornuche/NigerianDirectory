"""
Test script for image search APIs
"""
import requests
from urllib.parse import quote_plus
import re
import time

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
})

def test_bing(query):
    """Test Bing image search"""
    print(f"\n🔍 Testing Bing for: {query}")
    url = f'https://www.bing.com/images/search?q={quote_plus(query)}&first=1'
    
    try:
        resp = session.get(url, timeout=15)
        print(f"   Status: {resp.status_code}")
        
        # Look for murl (media URL) in the response
        matches = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', resp.text)
        print(f"   Found {len(matches)} images")
        
        for i, url in enumerate(matches[:3]):
            print(f"   {i+1}. {url[:80]}...")
        
        return matches
    except Exception as e:
        print(f"   Error: {e}")
        return []

def test_duckduckgo(query):
    """Test DuckDuckGo image search"""
    print(f"\n🦆 Testing DuckDuckGo for: {query}")
    
    try:
        # First get vqd token
        resp = session.get(f"https://duckduckgo.com/?q={quote_plus(query)}", timeout=10)
        
        vqd_match = re.search(r'vqd=([^&]+)', resp.text)
        if not vqd_match:
            vqd_match = re.search(r"vqd='([^']+)'", resp.text)
        
        if vqd_match:
            vqd = vqd_match.group(1)
            print(f"   Got VQD token: {vqd[:20]}...")
            
            time.sleep(0.5)
            img_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={quote_plus(query)}&vqd={vqd}&f=,,,,,&p=1"
            img_resp = session.get(img_url, timeout=10)
            
            print(f"   Image API status: {img_resp.status_code}")
            
            if img_resp.status_code == 200:
                data = img_resp.json()
                results = data.get('results', [])
                print(f"   Found {len(results)} images")
                
                for i, r in enumerate(results[:3]):
                    print(f"   {i+1}. {r.get('image', '')[:80]}...")
                
                return [r.get('image') for r in results]
        else:
            print("   Could not get VQD token")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    return []


# Test with some Nigerian schools
test_queries = [
    "Green Springs School Lagos Nigeria logo",
    "King's College Lagos Nigeria school building",
    "Corona Schools Lagos Nigeria",
    "Loyola Jesuit College Abuja Nigeria",
]

print("="*60)
print("IMAGE SEARCH API TEST")
print("="*60)

for query in test_queries:
    print(f"\n{'='*60}")
    print(f"Query: {query}")
    print("="*60)
    
    bing_results = test_bing(query)
    time.sleep(1)
    ddg_results = test_duckduckgo(query)
    time.sleep(2)

print("\n\nTest complete!")
