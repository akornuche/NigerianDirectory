"""
Data-quality audit for published records (REMEDIATION_PLAN.md CR-14, OP-1).

Checks every record with verification_status = 'verified' against the data
standard in crawler/standards.py and reports:
  - published records without a verification source;
  - duplicate names (same normalised name and state);
  - websites that do not resolve in DNS, belong to a university/polytechnic
    for a school, or are shared between records;
  - enriched sections that fail the content gate;
  - content_sources that cite blocked sources;
  - optionally, sitemap URLs that do not return 200 (--sitemap URL).

Writes audit_<date>.csv in the current directory and prints a summary.
Exit code is 1 if any record fails, so it can gate a launch or CI job.

Usage:
  DATABASE_URL=postgresql://... python crawler/audit/run_audit.py [--sitemap https://www.nigeriandirectory.com.ng/sitemap.xml]
"""
import argparse
import collections
import csv
import datetime
import json
import os
import re
import socket
import sys
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import standards  # noqa: E402

SECTIONS = ('enriched_history', 'enriched_academics', 'enriched_campus_info', 'enriched_student_life')


def fetch_records(database_url):
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(f"""
                SELECT id, name, slug, institution_category, state, city, area, website,
                       verification_source_url, content_sources, {', '.join(SECTIONS)}
                FROM schools WHERE verification_status = 'verified'""")
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def resolves(host, cache={}):
    if host not in cache:
        try:
            socket.getaddrinfo(host, 443)
            cache[host] = True
        except OSError:
            cache[host] = False
    return cache[host]


def norm(name):
    return ' '.join(re.sub(r'[^a-z0-9 ]', ' ', name.lower().replace("'", '')).split())


def audit(records):
    issues = []
    add = lambda r, issue, detail: issues.append(
        (r['id'], r['institution_category'], r['name'], r['state'], issue, detail))

    names = collections.Counter((norm(r['name']), r['state']) for r in records)
    domains = collections.defaultdict(list)
    for r in records:
        if r.get('website'):
            domains[standards.domain_of(r['website'])].append(r['id'])

    for r in records:
        loc = (r['state'], r.get('city'), r.get('area'))
        if not r.get('verification_source_url'):
            add(r, 'no verification source', 'published without a source URL')
        if names[(norm(r['name']), r['state'])] > 1:
            add(r, 'duplicate', 'another published record has the same name and state')
        if r.get('website'):
            d = standards.domain_of(r['website'])
            if not resolves(d):
                add(r, 'dead website', f'{d} does not resolve')
            if r['institution_category'] == 'school' and standards.TERTIARY_DOMAIN.search(d.split('.')[0]):
                add(r, 'wrong website', f'{d} looks like a university/polytechnic domain')
            if len(domains[d]) > 1:
                add(r, 'shared website', f'{d} is also used by records {sorted(set(domains[d]) - {r["id"]})}')
        for field in SECTIONS:
            text = r.get(field)
            if text and not standards.section_passes(text, r['name'], loc):
                add(r, 'content gate', f'{field} fails the content gate')
        sources = r.get('content_sources') or []
        if isinstance(sources, str):
            sources = json.loads(sources)
        for s in sources:
            url = s.get('url', '') if isinstance(s, dict) else str(s)
            if standards.is_blocked_source(url):
                add(r, 'blocked source', url)
    return issues


def check_sitemap(url):
    issues = []
    xml = urllib.request.urlopen(url, timeout=60).read().decode()
    for loc in re.findall(r'<loc>(.*?)</loc>', xml):
        if re.search(r'\s', loc):
            issues.append((None, 'sitemap', loc, '', 'malformed URL', 'contains whitespace'))
            continue
        try:
            req = urllib.request.Request(loc, method='HEAD')
            code = urllib.request.urlopen(req, timeout=30).status
        except urllib.error.HTTPError as e:
            code = e.code
        except Exception as e:
            code = str(e)[:40]
        if code != 200:
            issues.append((None, 'sitemap', loc, '', 'sitemap URL not 200', str(code)))
    return issues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sitemap', help='also check every URL in this sitemap returns 200')
    args = ap.parse_args()
    url = os.environ.get('DATABASE_URL')
    if not url:
        sys.exit('Set DATABASE_URL')
    records = fetch_records(url)
    issues = audit(records)
    if args.sitemap:
        issues += check_sitemap(args.sitemap)
    out = f'audit_{datetime.date.today().isoformat()}.csv'
    with open(out, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['id', 'category', 'name', 'state', 'issue', 'detail'])
        w.writerows(issues)
    by_cat = collections.Counter(r['institution_category'] for r in records)
    print(f'Published records: {dict(by_cat)}')
    print(f'Issues: {len(issues)} ({dict(collections.Counter(i[4] for i in issues))}); written to {out}')
    sys.exit(1 if issues else 0)


if __name__ == '__main__':
    main()
