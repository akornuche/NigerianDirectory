#!/usr/bin/env python3
"""
Test the search engine functionality
"""

from search_engines import search_web, get_search_stats
import time

def test_search():
    print('Testing updated search engines...')
    print('=' * 50)
    
    # Test with a Nigerian school query
    query = 'Green Springs School Lekki Lagos Nigeria'
    print(f'Query: {query}')
    
    results = search_web(query, 5)
    
    if results:
        print(f'✅ Found {len(results)} results:')
        for i, result in enumerate(results, 1):
            print(f'{i}. {result.title[:70]}')
            print(f'   URL: {result.url[:80]}')
            print(f'   Confidence: {result.confidence:.2f}')
            print(f'   Source: {result.source}')
            print()
    else:
        print('❌ No results found')
    
    print('Engine Statistics:')
    stats = get_search_stats()
    for engine, data in stats.items():
        print(f'  {engine}: {data["success_rate"]} ({data["status"]})')
    
    print('\n' + '=' * 50)
    
    # Test another query
    query2 = 'Kings College Lagos Nigeria history'
    print(f'Second Query: {query2}')
    
    results2 = search_web(query2, 3)
    
    if results2:
        print(f'✅ Found {len(results2)} results:')
        for i, result in enumerate(results2, 1):
            print(f'{i}. {result.title[:70]}')
            print(f'   Confidence: {result.confidence:.2f}')
    else:
        print('❌ No results found')

if __name__ == "__main__":
    test_search()