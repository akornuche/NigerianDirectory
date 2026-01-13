#!/usr/bin/env python3
"""
Quick script to run deep research enrichment on specific schools.
Usage: python run_enrichment.py [--test] [--slug slug] [--limit N]
"""
import sys
import argparse
from deep_research_crawler import DeepResearchCrawler
from database import get_connection

def main():
    parser = argparse.ArgumentParser(description='Run deep research enrichment on schools')
    parser.add_argument('--test', action='store_true', help='Test mode - research Kings College and FGGC Abuja')
    parser.add_argument('--slug', type=str, help='School slug to research')
    parser.add_argument('--limit', type=int, default=10, help='Limit number of schools to process')
    parser.add_argument('--all', action='store_true', help='Process all schools without enriched content')
    parser.add_argument('--force', action='store_true', help='Force re-enrichment even if content exists')
    
    args = parser.parse_args()
    
    crawler = DeepResearchCrawler()
    
    if args.test:
        # Test with two well-known schools
        slugs = ['kings-college-lagos', 'federal-government-girls-college-abuja']
        print(f"Test mode: Researching {', '.join(slugs)}")
        
        # Get school IDs from slugs
        conn = get_connection()
        school_ids = []
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM schools WHERE slug = ANY(%s)", (slugs,))
                for row in cur.fetchall():
                    school_ids.append(row[0])
                    print(f"  Found: {row[1]} (ID: {row[0]})")
        finally:
            conn.close()
        
        if school_ids:
            crawler.run(school_ids=school_ids, force=True)
        else:
            print("No matching schools found!")
            sys.exit(1)
            
    elif args.slug:
        print(f"Researching school: {args.slug}")
        conn = get_connection()
        school_ids = []
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM schools WHERE slug = %s", (args.slug,))
                result = cur.fetchone()
                if result:
                    school_ids.append(result[0])
                    print(f"  Found: {result[1]} (ID: {result[0]})")
                else:
                    print(f"School with slug '{args.slug}' not found")
                    sys.exit(1)
        finally:
            conn.close()
        
        crawler.run(school_ids=school_ids, force=args.force)
        
    elif args.all:
        print(f"Processing all schools without enriched content (limit: {args.limit})")
        crawler.run(limit=args.limit, force=args.force)
    else:
        print("Please specify --test, --slug, or --all")
        print("\nExamples:")
        print("  python run_enrichment.py --test")
        print("  python run_enrichment.py --slug kings-college-lagos")
        print("  python run_enrichment.py --all --limit 50")
        sys.exit(1)
    
    # Print stats
    print("\n" + "="*50)
    print("ENRICHMENT COMPLETE")
    print("="*50)
    print(f"Total processed: {crawler.stats['total_processed']}")
    print(f"Successfully enriched: {crawler.stats['enriched']}")
    print(f"Insufficient data: {crawler.stats['insufficient_data']}")
    print(f"Failed: {crawler.stats['failed']}")

if __name__ == '__main__':
    main()
