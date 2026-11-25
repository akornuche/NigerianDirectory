"""Fetch fuller article text for the stories chosen in write/<day>.json, so the
longer summaries can be written from more than the opening paragraph.
Reads each post by slug from the outlet's WordPress API; writes full/<day>.json
mapping URL -> first ~3,000 characters of plain text. One thread per outlet."""
import json, os, re, sys, time, html, urllib.request, urllib.parse, threading
from collections import defaultdict
UA = 'Mozilla/5.0 (compatible; NewsDigestBot/1.0)'
def clean(s):
    s = re.sub(r'(?is)<(script|style|figure|figcaption)[^>]*>.*?</\1>', ' ', s or '')
    s = re.sub(r'(?i)</p>', '\n', s)
    return re.sub(r'[ \t]+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
def urls_for(day, per_story=3):
    short = json.load(open(f'short/{day}.json')); data = json.load(open(f'write/{day}.json'))
    out = []
    for it in data['items']:
        arts = [a for i in it['i'] for a in short[i]['articles']]
        seen = set()
        for a in sorted(arts, key=lambda a: -len(a['excerpt'])):
            if a['outlet'] in seen: continue
            seen.add(a['outlet']); out.append(a['url'])
            if len(seen) >= per_story: break
    return out
def fetch(url):
    p = urllib.parse.urlparse(url); slug = [x for x in p.path.split('/') if x][-1]
    api = f'https://{p.netloc}/wp-json/wp/v2/posts?slug={urllib.parse.quote(slug)}&_fields=content'
    with urllib.request.urlopen(urllib.request.Request(api, headers={'User-Agent': UA}), timeout=40) as r:
        js = json.load(r)
    return clean(js[0]['content']['rendered'])[:3000] if js else ''
def run(day):
    out_path = f'full/{day}.json'
    have = json.load(open(out_path)) if os.path.exists(out_path) else {}
    by_host = defaultdict(list)
    for u in urls_for(day):
        if u not in have: by_host[urllib.parse.urlparse(u).netloc].append(u)
    lock = threading.Lock()
    def worker(urls):
        for u in urls:
            try: t = fetch(u)
            except Exception as e: t = ''; print(day, 'error', u, e, flush=True)
            with lock: have[u] = t
            time.sleep(0.7)
    ts = [threading.Thread(target=worker, args=(v,)) for v in by_host.values()]
    [t.start() for t in ts]; [t.join() for t in ts]
    json.dump(have, open(out_path, 'w'), ensure_ascii=False)
    print(day, 'texts', sum(1 for v in have.values() if v), 'of', len(have), flush=True)
for d in sys.argv[1:]: run(d)
