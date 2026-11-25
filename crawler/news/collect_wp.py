"""Collect one day's posts (Lagos time, UTC+1) from outlets with an open
WordPress posts API: title, link, date, excerpt. Writes raw/<date>/<outlet>.json"""
import json, os, sys, time, urllib.request, html, re
UA = 'Mozilla/5.0 (compatible; NewsDigestBot/1.0)'
OUTLETS = {
  'Premium Times': 'www.premiumtimesng.com', 'Daily Trust': 'dailytrust.com', 'BusinessDay': 'businessday.ng',
  'ThisDay': 'www.thisdaylive.com', 'Nairametrics': 'nairametrics.com', 'Leadership': 'leadership.ng',
}
def clean(s): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()
def day(d):
    os.makedirs(f'raw/{d}', exist_ok=True)
    for name, host in OUTLETS.items():
        out = f'raw/{d}/{host}.json'
        if os.path.exists(out): continue
        posts, page = [], 1
        while page <= 6:
            u = (f'https://{host}/wp-json/wp/v2/posts?after={d}T00:00:00&before={d}T23:59:59'
                 f'&per_page=100&page={page}&_fields=date,link,title,excerpt')
            try:
                with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': UA}), timeout=40) as r:
                    batch = json.load(r)
            except Exception as e:
                if '400' in str(e): break
                print(name, d, 'error', e); time.sleep(5); break
            if not batch: break
            posts += [{'outlet': name, 'date': p['date'], 'url': p['link'], 'title': clean(p['title']['rendered']),
                       'excerpt': clean(p.get('excerpt', {}).get('rendered'))[:600]} for p in batch]
            if len(batch) < 50: break
            page += 1; time.sleep(1)
        json.dump(posts, open(out, 'w'), ensure_ascii=False)
        print(d, name, len(posts), flush=True)
for d in sys.argv[1:]: day(d)
