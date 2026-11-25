"""Group one day's articles into stories and rank them by how many outlets
reported each. Prints candidates and writes clusters/<date>.json."""
import glob, json, os, re, sys
STOP = set('''a an and are as at be been but by for from has have he her his in into is it its of on or our
that the their them they this to was were will with who what when where which why how not no new over after
before about says said say amid against as more than also its it's into out up down one two three four five
nigeria nigerian nigerians govt government federal state states lagos abuja year years day days week weeks
just can could would should may might must per cent percent how why what video photos live update news'''.split())
SKIP = re.compile(r'\b(opinion|editorial|column|horoscope|sponsored|advertorial|obituary|quiz|crossword|'
                  r'birthday|happy birthday|condolence|tribute to|letter to the editor)\b', re.I)
def toks(s):
    s = s.lower().replace('’', "'")
    return {w for w in re.findall(r"[a-z0-9][a-z0-9'.-]*[a-z0-9]|[0-9]+", s) if w not in STOP and len(w) > 2}
def run(day):
    arts = []
    for f in glob.glob(f'raw/{day}/*.json'):
        for a in json.load(open(f)):
            if SKIP.search(a['title']) or SKIP.search(a['url']): continue
            a['t'] = toks(a['title']); a['k'] = a['t'] | toks(' '.join(a['excerpt'].split()[:30]))
            if len(a['t']) >= 3: arts.append(a)
    n = len(arts); parent = list(range(n))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    for i in range(n):
        for j in range(i + 1, n):
            A, B = arts[i]['k'], arts[j]['k']
            inter = len(A & B)
            if inter >= 4 and inter / min(len(A), len(B)) >= 0.42 and len(arts[i]['t'] & arts[j]['t']) >= 2:
                parent[find(i)] = find(j)
    groups = {}
    for i in range(n): groups.setdefault(find(i), []).append(arts[i])
    clusters = []
    for g in groups.values():
        outlets = sorted({a['outlet'] for a in g})
        clusters.append({'outlets': outlets, 'n': len(g),
                         'articles': [{k: a[k] for k in ('outlet', 'title', 'url', 'excerpt', 'date')} for a in g]})
    clusters.sort(key=lambda c: (-len(c['outlets']), -c['n']))
    os.makedirs('clusters', exist_ok=True)
    json.dump(clusters, open(f'clusters/{day}.json', 'w'), ensure_ascii=False, indent=0)
    multi = [c for c in clusters if len(c['outlets']) > 1]
    print(day, 'articles', n, 'clusters', len(clusters), 'multi-outlet', len(multi))
    return clusters
if __name__ == '__main__':
    for d in sys.argv[1:]:
        cs = run(d)
        if '-v' in sys.argv[0:1]: pass
