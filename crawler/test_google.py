import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus

query = 'Lagos State Model College Meiran Nigeria school history founded'
url = f'https://www.google.com.ng/search?q={quote_plus(query)}&num=10&hl=en'

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

response = requests.get(url, headers=headers, timeout=20)
print(f'Status: {response.status_code}')
print(f'Length: {len(response.text)}')

soup = BeautifulSoup(response.text, 'html.parser')
print(f'div.g count: {len(soup.select("div.g"))}')
print(f'h3 count: {len(soup.select("h3"))}')

# Check what links we can find
links = soup.select('a[href^="http"]')
print(f'HTTP links found: {len(links)}')

for h3 in soup.select('h3')[:5]:
    print(f'H3: {h3.get_text(strip=True)[:60]}')

# Save HTML for debugging
with open('google_response.html', 'w', encoding='utf-8') as f:
    f.write(response.text)
print('Saved HTML to google_response.html')
