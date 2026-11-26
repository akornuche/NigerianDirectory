"""
Find replacement hero photos from sources whose rights are clear.

The old image crawler took the top results from Bing/Google image search,
which brought in stock photos, memes and pictures of other institutions.
This one only looks at:

  1. Wikipedia's lead image and Wikimedia Commons files (free licences;
     the licence and author are recorded for attribution), and
  2. the institution's own website: its og:image share picture and large
     photos on the home page.

Logos, seals, crests and SVGs are skipped; a photo must be at least 600px
wide and landscape (aspect 1.2 to 2.6). It only COLLECTS candidates into
a folder plus candidates.json; a person reviews them before anything is
uploaded or written to the database.

Usage: python3 -I hero_recrawl.py targets.json out_dir
  targets.json: [{"id", "name", "state", "city", "website"}, ...]
"""
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from io import BytesIO

from PIL import Image

UA = 'NigerianDirectoryBot/1.0 (+https://www.nigeriandirectory.com.ng/about/)'
SKIP = re.compile(r'logo|seal|crest|coat[_ -]?of|emblem|flag|icon|favicon|avatar|banner-ad|map|\.svg', re.I)
STOP = {'university', 'college', 'federal', 'government', 'state', 'of', 'the', 'and', 'school',
        'girls', 'boys', 'science', 'technology', 'nigeria', 'lagos', 'model', 'secondary', 'for'}


def get(url, timeout=25, limit=8_000_000):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(limit), r.headers.get('content-type', '')


_wiki_lock = threading.Lock()


def get_json(url):
    """Wikimedia API call: one at a time, spaced out, retried on 429."""
    with _wiki_lock:
        for attempt in range(5):
            time.sleep(1.5)
            try:
                return json.loads(get(url)[0])
            except urllib.error.HTTPError as e:
                if e.code != 429:
                    raise
                time.sleep(20 * (attempt + 1))
        raise RuntimeError('rate limited')


def key_tokens(name):
    words = re.findall(r'[a-z]+', name.lower())
    return [w for w in words if w not in STOP and len(w) > 2]


def wiki_candidates(rec):
    """Wikipedia lead image plus Commons files whose title names the place."""
    out = []
    api = 'https://en.wikipedia.org/w/api.php?'
    q = urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srsearch': f"{rec['name']} Nigeria",
                                'srlimit': 3, 'format': 'json'})
    hits = get_json(api + q)['query']['search']
    toks = key_tokens(rec['name'])
    titles = [h['title'] for h in hits if all(t in h['title'].lower() for t in toks[:2]) or
              h['title'].lower() == rec['name'].lower()]
    for title in titles[:1]:
        q = urllib.parse.urlencode({'action': 'query', 'titles': title, 'prop': 'images', 'imlimit': 50,
                                    'format': 'json'})
        pages = get_json(api + q)['query']['pages']
        files = [i['title'] for p in pages.values() for i in p.get('images', [])]
        for f in files:
            if SKIP.search(f) or not re.search(r'\.(jpe?g|png|webp)$', f, re.I):
                continue
            out.append(('wikipedia', f, title))
    # Commons search by name
    q = urllib.parse.urlencode({'action': 'query', 'list': 'search', 'srnamespace': 6,
                                'srsearch': rec['name'], 'srlimit': 15, 'format': 'json'})
    for h in get_json('https://commons.wikimedia.org/w/api.php?' + q)['query']['search']:
        t = h['title']
        if SKIP.search(t) or not re.search(r'\.(jpe?g|png|webp)$', t, re.I):
            continue
        if toks and not all(tok in t.lower() for tok in toks[:2]):
            continue
        out.append(('commons', t, 'search'))
    # resolve file -> url + licence, in one batched request
    res = []
    pick = out[:8]
    if not pick:
        return res
    q = urllib.parse.urlencode({'action': 'query', 'titles': '|'.join(f for _, f, _ in pick), 'prop': 'imageinfo',
                                'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1280, 'format': 'json'})
    pages = get_json('https://commons.wikimedia.org/w/api.php?' + q)['query']['pages']
    via = {f: (src, v) for src, f, v in pick}
    for p in pages.values():
        ii = (p.get('imageinfo') or [None])[0]
        if not ii:
            continue  # local (non-Commons, possibly non-free) file: skip
        meta = ii.get('extmetadata', {})
        lic = meta.get('LicenseShortName', {}).get('value', '')
        if not re.search(r'CC|Public domain|GFDL|PD', lic, re.I):
            continue
        artist = re.sub('<[^>]+>', '', meta.get('Artist', {}).get('value', '')).strip()
        src, v = via.get(p.get('title'), ('commons', 'search'))
        res.append({'source': src, 'url': ii.get('thumburl') or ii['url'], 'page': ii.get('descriptionurl'),
                    'licence': lic, 'author': artist[:120], 'via': v})
    return res


class ImgParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.og, self.imgs = None, []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and (a.get('property') or a.get('name') or '').lower() in ('og:image', 'twitter:image'):
            self.og = self.og or a.get('content')
        if tag == 'img':
            for k in ('data-src', 'data-lazy-src', 'src'):
                if a.get(k) and not a[k].startswith('data:'):
                    self.imgs.append((a[k], (a.get('alt') or '') + ' ' + (a.get('class') or '')))
                    break
        if tag in ('div', 'section') and 'background' in (a.get('style') or ''):
            m = re.search(r'url\([\'"]?([^\'")]+)', a['style'])
            if m:
                self.imgs.append((m.group(1), 'background'))


def site_candidates(rec):
    if not rec.get('website'):
        return []
    html, _ = get(rec['website'], limit=3_000_000)
    p = ImgParser()
    p.feed(html.decode('utf-8', 'ignore'))
    base = rec['website']
    urls = []
    if p.og:
        urls.append((urllib.parse.urljoin(base, p.og), 'og:image'))
    for src, hint in p.imgs:
        u = urllib.parse.urljoin(base, src)
        if SKIP.search(u) or SKIP.search(hint):
            continue
        if re.search(r'\.(gif|svg)(\?|$)', u, re.I):
            continue
        urls.append((u, hint.strip()[:60] or 'img'))
    seen, res = set(), []
    for u, hint in urls:
        if u in seen:
            continue
        seen.add(u)
        res.append({'source': 'website', 'url': u, 'page': rec['website'], 'licence': 'official website',
                    'author': rec['name'], 'via': hint})
    return res[:14]


def fetch_ok(c, path):
    data, ctype = get(c['url'])
    im = Image.open(BytesIO(data))
    im.load()
    w, h = im.size
    if w < 600 or not (1.2 <= w / h <= 2.6):
        return None
    with open(path, 'wb') as f:
        f.write(data)
    return {**c, 'file': path, 'size': [w, h], 'bytes': len(data)}


def run_one(rec, out_dir, finders, start=0):
    found = []
    for finder in finders:
        try:
            cands = finder(rec)
        except Exception as e:  # network or parse errors: try the next source
            print(rec['id'], finder.__name__, 'error', type(e).__name__)
            continue
        for c in cands:
            if len(found) >= 6:
                break
            path = os.path.join(out_dir, f"{rec['id']}-{start + len(found)}")
            try:
                r = fetch_ok(c, path)
            except Exception:
                continue
            if r and all(r['bytes'] != f['bytes'] for f in found):
                found.append(r)
    return rec['id'], found


if __name__ == '__main__':
    # python3 -I hero_recrawl.py targets.json out_dir [wiki|website]
    targets = json.load(open(sys.argv[1]))
    out_dir = sys.argv[2]
    only = sys.argv[3] if len(sys.argv) > 3 else None
    FINDERS = {'wiki': (wiki_candidates,), 'website': (site_candidates,)}.get(only, (wiki_candidates, site_candidates))
    os.makedirs(out_dir, exist_ok=True)
    res_path = os.path.join(out_dir, '..', 'candidates.json')
    results = json.load(open(res_path)) if os.path.exists(res_path) else {}
    lock = threading.Lock()

    def job(rec):
        rid, found = run_one(rec, out_dir, FINDERS, start=len(results.get(str(rec['id']), [])))
        with lock:
            results.setdefault(str(rid), []).extend(found)
            json.dump(results, open(res_path, 'w'), indent=1)
        print(rid, len(found), flush=True)

    with ThreadPoolExecutor(1 if only == 'wiki' else 6) as ex:
        list(ex.map(job, targets))
