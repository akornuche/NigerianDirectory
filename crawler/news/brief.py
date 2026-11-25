"""Print one day's stories with fuller source text, to write longer summaries
from: rank, headline, current summary, then up to two outlets' text."""
import json, sys, re
day = sys.argv[1]; per = int(sys.argv[2]) if len(sys.argv) > 2 else 900
short = json.load(open(f'short/{day}.json')); data = json.load(open(f'write/{day}.json'))
full = json.load(open(f'full/{day}.json'))
print('LEAD:', data['lead'])
for rank, it in enumerate(data['items'], 1):
    arts = [a for i in it['i'] for a in short[i]['articles']]
    print(f"\n#{rank} [{it['c']}] {it['h']}\n  NOW: {it['s']}")
    seen = set()
    for a in sorted(arts, key=lambda a: -len(full.get(a['url'], ''))):
        if a['outlet'] in seen or len(seen) >= 2: continue
        seen.add(a['outlet'])
        t = re.sub(r'\s+', ' ', full.get(a['url']) or a['excerpt'])
        print(f"  [{a['outlet']}] {t[:per]}")
