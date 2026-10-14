"""
Read-only diagnostic for the enrichment pipeline.

Runs the real UniversityCrawler extraction and classification against live
targets, then reports exactly where content is lost. Writes nothing to the
database.

Usage:
    python diagnose_enrichment.py            # website extraction only (fast)
    python diagnose_enrichment.py --search   # include search engine stage
"""

import os
import sys
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
from bs4 import BeautifulSoup

from university_crawler import UniversityCrawler

logging.disable(logging.CRITICAL)

SECTIONS = ('history', 'academics', 'campus', 'student_life')

TARGETS = [
    {'name': 'University of Ibadan', 'state': 'Oyo', 'city': 'Ibadan', 'website': 'https://ui.edu.ng'},
    {'name': 'University of Lagos', 'state': 'Lagos', 'city': 'Akoka', 'website': 'https://unilag.edu.ng'},
    {'name': 'Obafemi Awolowo University', 'state': 'Osun', 'city': 'Ile-Ife', 'website': 'https://oauife.edu.ng'},
    {'name': 'Ahmadu Bello University', 'state': 'Kaduna', 'city': 'Zaria', 'website': 'https://abu.edu.ng'},
]


def classify(crawler, text, totals):
    """Classify a block using the crawler's live logic, exposing ties."""
    lowered = text.lower()
    keyword_sets = {
        'history': crawler.HISTORY_KW,
        'academics': crawler.ACADEMIC_KW,
        'campus': crawler.CAMPUS_KW,
        'student_life': crawler.LIFE_KW,
    }
    scores = {
        section: sum(1 for kw in kws if kw in lowered) / len(kws)
        for section, kws in keyword_sets.items()
    }
    best_score = max(scores.values())
    tied = [s for s, v in scores.items() if v == best_score and best_score > 0]
    chosen = crawler._classify(text, totals)
    return chosen, scores, tied


def fetch_paragraphs(crawler, url):
    """Reproduce the crawler's paragraph harvesting and report what it sees."""
    report = {'status': None, 'p_total': 0, 'p_kept': 0, 'div_candidates': 0, 'body_chars': 0, 'paras': []}

    try:
        response = crawler.session.get(url, timeout=20)
        report['status'] = response.status_code
        if response.status_code != 200:
            return report

        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'menu']):
            tag.decompose()

        body = soup.find('main') or soup.find('article') or soup.find('body')
        if not body:
            return report

        report['body_chars'] = len(body.get_text(' ', strip=True))

        all_p = body.find_all('p')
        report['p_total'] = len(all_p)

        kept = [p.get_text(' ', strip=True) for p in all_p if len(p.get_text(' ', strip=True)) > 60]
        report['p_kept'] = len(kept)
        report['paras'] = kept

        # How much text sits in divs that the <p>-only harvest ignores
        divs = [d.get_text(' ', strip=True) for d in body.find_all('div', recursive=True)]
        report['div_candidates'] = sum(1 for d in divs if len(d) > 200)

    except Exception as exc:
        report['status'] = f'ERROR {type(exc).__name__}'

    return report


def main():
    include_search = '--search' in sys.argv
    crawler = UniversityCrawler()

    tie_losses = {s: 0 for s in SECTIONS}
    total_tied = 0
    total_classified = 0
    bucket_totals = {s: 0 for s in SECTIONS}

    for target in TARGETS:
        print('=' * 72)
        print(f"{target['name']}  ({target['website']})")
        print('=' * 72)

        page = fetch_paragraphs(crawler, target['website'])
        print(f"  http status        : {page['status']}")
        print(f"  homepage text chars: {page['body_chars']}")
        print(f"  legacy <p> usable  : {page['p_kept']} of {page['p_total']}   (old harvest)")
        print(f"  <div> over 200 ch  : {page['div_candidates']}   (previously discarded)")

        buckets = {s: 0 for s in SECTIONS}
        running = {s: 0 for s in SECTIONS}
        for para in page['paras']:
            best, scores, tied = classify(crawler, para, running)
            if best is None:
                continue
            total_classified += 1
            buckets[best] += 1
            bucket_totals[best] += 1
            running[best] += len(para)
            if len(tied) > 1:
                total_tied += 1
                for loser in tied:
                    if loser != best:
                        tie_losses[loser] += 1

        print(f"  legacy <p> blocks classified : {buckets}")

        website_result = crawler._extract_from_website(target['website'], target['name'])
        web_words = sum(len((website_result.get(k) or '').split()) for k in SECTIONS)
        totals = {s: len((website_result.get(s) or '').strip()) for s in SECTIONS}
        needs_search = crawler._needs_search(totals)
        print(f"  website words      : {web_words}")
        print(f"  website chars      : {totals}")
        print(f"  search needed      : {needs_search}")

        search_result = {}
        if include_search and needs_search:
            search_result = crawler._search_web(
                target['name'], target['state'], target['city'], totals
            )
            got = {k: len(search_result.get(k, [])) for k in SECTIONS}
            print(f"  search paragraphs  : {got}")
            print(f"  search sources     : {len(search_result.get('sources', []))}")

        final = crawler._synthesise(website_result, search_result, target['name'])

        print('  final section lengths (all real content, no boilerplate):')
        for key in ('enriched_history', 'enriched_academics',
                    'enriched_campus_info', 'enriched_student_life'):
            value = final.get(key, '') or ''
            flag = 'substantive' if len(value) >= crawler.QUALITY_SECTION_CHARS else 'thin'
            print(f"    {key:24} chars={len(value):5}  {flag}")
        print(f"    {'TOTAL':24} chars={sum(len(final.get(k) or '') for k in ('enriched_history','enriched_academics','enriched_campus_info','enriched_student_life')):5}")

        passed = crawler._meets_quality(final)
        print(f"  _meets_quality     : {'PASS' if passed else 'FAIL (needs 2 sections over 100 chars)'}")
        print()

    print('=' * 72)
    print('CLASSIFICATION SUMMARY')
    print('=' * 72)
    print(f"  paragraphs classified      : {total_classified}")
    print(f"  destination counts         : {bucket_totals}")
    print(f"  blocks with a tie          : {total_tied}")
    print(f"  sections that lost a tie   : {tie_losses}")
    print()
    print("  Ties are now awarded to whichever tied section holds the least")
    print("  content, rather than always to history.")


if __name__ == '__main__':
    main()
