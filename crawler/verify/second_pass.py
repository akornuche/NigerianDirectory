"""
Second verification pass for unpublished secondary schools (2026-11-23).

The first pass looked an article up by exact title. Many real schools have
an article under a slightly different title ("Hope Waddell Training
Institution", "King's College, Lagos"), so this pass runs a Wikipedia search
and accepts a result only when all of these hold:

  * the article title, normalised, matches the school name (allowing the
    town or state to be present in one and absent in the other);
  * the article is about a school (description, categories or lead text);
  * the article places it in Nigeria;
  * the article mentions the record's state, city or area. A school that
    exists but elsewhere is reported as a location conflict, not published.

Usage: python -I second_pass.py schools.json verification.json out.json
"""
import json, re, sys, time, unicodedata, urllib.parse, urllib.request
from pathlib import Path

UA = 'NigerianDirectory-verifier/1.0 (directory data verification)'
API = 'https://en.wikipedia.org/w/api.php'
CACHE = Path(__file__).with_name('.wiki_cache'); CACHE.mkdir(exist_ok=True)

STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta',
 'Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
 'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
 'FCT','Abuja']
SCHOOL_WORDS = re.compile(r'\b(school|college|academy|grammar|secondary|high school|institution|seminary|lyceum)\b', re.I)
STOP = {'the','of','and','school','schools','secondary','college','high','international','senior','junior','girls','boys','s','st','saint'}

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode().lower()
    s = s.replace('&',' and ').replace("'", '')
    s = re.sub(r'\bst\.?\b', 'saint', s)
    s = re.sub(r'\bgovt\b', 'government', s)
    s = re.sub(r'\binstitute\b', 'institution', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def get(params):
    params = {**params, 'format': 'json', 'formatversion': '2'}
    key = CACHE / (re.sub(r'[^A-Za-z0-9]+', '_', json.dumps(params, sort_keys=True))[:180] + '.json')
    if key.exists():
        return json.loads(key.read_text())
    url = API + '?' + urllib.parse.urlencode(params)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                data = json.load(r)
            key.write_text(json.dumps(data)); time.sleep(1.0)
            return data
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get('Retry-After') or 5 * (attempt + 1)) if e.code == 429 else 3
            time.sleep(wait)
        except Exception:
            time.sleep(3)
    raise RuntimeError('wikipedia unreachable')

def name_matches(name, title, loc_tokens):
    a, b = norm(name), norm(re.sub(r'\s*\(.*?\)\s*', ' ', title))
    if a == b:
        return True
    strip = lambda s: ' '.join(w for w in s.split() if w not in loc_tokens)
    if strip(a) and strip(a) == strip(b):
        # Same name once the town/state is removed; require the distinctive
        # part to be more than generic words ("Government College" alone is
        # not enough: there is one in almost every state).
        return bool(set(strip(a).split()) - STOP - {'government','federal','model','community','day','science','technical','comprehensive','state'})
    return False

def check(rec):
    locs = [x for x in {rec.get('state'), rec.get('city'), rec.get('area')} if x]
    loc_tokens = set()
    for l in locs + ['nigeria', 'fct', 'abuja']:
        loc_tokens |= set(norm(l).split())
    q = f'{rec["name"]} Nigeria'
    d = get({'action': 'query', 'generator': 'search', 'gsrsearch': q, 'gsrlimit': 6,
             'prop': 'extracts|categories|description|pageprops', 'exintro': 1, 'explaintext': 1,
             'exlimit': 'max', 'cllimit': 'max', 'clshow': '!hidden', 'redirects': 1})
    pages = (d.get('query') or {}).get('pages', [])
    for p in sorted(pages, key=lambda p: p.get('index', 99)):
        title = p['title']
        if 'disambiguation' in (p.get('pageprops') or {}):
            continue  # a list of same-named places is not evidence about this school
        if not name_matches(rec['name'], title, loc_tokens):
            continue
        text = ' '.join([p.get('description', ''), p.get('extract', ''),
                         ' '.join(c['title'] for c in p.get('categories', []))])
        is_school = bool(SCHOOL_WORDS.search(p.get('description', '') + ' ' + ' '.join(c['title'] for c in p.get('categories', [])))) \
            or bool(SCHOOL_WORDS.search(p.get('extract', '')[:300]))
        in_nigeria = 'nigeria' in text.lower()
        loc_hit = [l for l in locs if l and re.search(r'\b' + re.escape(l) + r'\b', text, re.I)]
        if rec.get('state') == 'FCT' and re.search(r'\bAbuja\b', text):
            loc_hit.append('Abuja')
        other_states = [s for s in STATES if re.search(r'\b' + re.escape(s) + r' State\b', text) and s not in locs]
        result = {'title': title, 'url': 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_')),
                  'qid': (p.get('pageprops') or {}).get('wikibase_item'), 'is_school': is_school,
                  'nigeria': in_nigeria, 'loc_hit': loc_hit, 'other_states': other_states,
                  'lead': p.get('extract', '')[:600]}
        if is_school and in_nigeria and loc_hit:
            return 'verified', result
        if is_school and in_nigeria and other_states:
            return 'location_conflict', result
        return 'weak', result
    return 'unverified', None

def main(schools_path, verification_path, out_path):
    schools = {str(s['id']): s for s in json.load(open(schools_path))}
    ver = json.load(open(verification_path))
    out = {}
    todo = [k for k, v in ver.items() if v['status'] != 'verified']
    for i, k in enumerate(todo, 1):
        status, ev = check(schools[k])
        out[k] = {'name': schools[k]['name'], 'state': schools[k]['state'], 'status': status, 'evidence': ev}
        if status != 'unverified':
            print(f'{i}/{len(todo)} {status:18} {schools[k]["name"]} -> {ev["title"]}', flush=True)
    json.dump(out, open(out_path, 'w'), indent=1)

if __name__ == '__main__':
    main(*sys.argv[1:4])
