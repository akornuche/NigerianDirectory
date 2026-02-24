import asyncio
import os
import sys

# Add crawler to path
sys.path.append(os.path.join(os.getcwd(), 'crawler'))

from parser import parse_school_page
from fetcher import fetch_url

async def test_parser():
    url = "https://greenspringsschool.com/about"
    print(f"Fetching {url}...")
    result = fetch_url(url)
    if result['success']:
        data, confidence = parse_school_page(result['html'], url)
        print("Extracted Data:")
        for k, v in data.items():
            print(f"  {k}: {v}")
        print(f"Confidence: {confidence}")
    else:
        print(f"Failed to fetch: {result['error']}")

if __name__ == "__main__":
    asyncio.run(test_parser())
