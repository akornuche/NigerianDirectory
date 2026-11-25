"""Turn write/<day>.json (my summaries keyed to shortlist indexes) into SQL
that loads the day as a draft. Sources come from the clustered articles:
one link per outlet, the outlet with the fullest excerpt first."""
import json, os, re, sys
def q(v): return "'" + str(v).replace("'", "''") + "'"
def words(s): return re.findall(r"[a-z0-9']+", s.lower())
def ngrams(s, n=8):
    w = words(s); return {tuple(w[i:i+n]) for i in range(len(w)-n+1)}
# Short attributed quotes are allowed: text inside quotation marks is left out
# of the overlap check, but no summary may quote more than MAX_QUOTED words.
QUOTE = re.compile(r'[\u201c"]([^\u201d"]+)[\u201d"]')
MAX_QUOTED = 40
def unquoted(s): return QUOTE.sub(' ', s)
def quoted_words(s): return sum(len(words(m)) for m in QUOTE.findall(s))
day = sys.argv[1]
short = json.load(open(f'short/{day}.json'))
data = json.load(open(f'write/{day}.json'))
full = json.load(open(f'full/{day}.json')) if os.path.exists(f'full/{day}.json') else {}
cats = {'politics','economy','business','security','education','health','world','sports','technology','entertainment','society','environment'}
out = [f"-- News digest {day}: draft for review.", "BEGIN;",
       f"DELETE FROM news_days WHERE day = '{day}' AND status = 'draft';",
       f"INSERT INTO news_days (day, lead, status) VALUES ('{day}', {q(data['lead'])}, 'draft') ON CONFLICT (day) DO NOTHING;"]
seen, worst = set(), 0
for rank, it in enumerate(data['items'], 1):
    assert it['c'] in cats, it
    arts = [a for i in it['i'] for a in short[i]['articles']]
    for i in it['i']:
        assert i not in seen, f'index {i} used twice'; seen.add(i)
    srcs, have = [], set()
    for a in sorted(arts, key=lambda a: -len(a['excerpt'])):
        if a['outlet'] not in have:
            have.add(a['outlet']); srcs.append({'name': a['outlet'], 'url': a['url']})
    src_text = ' '.join(a['title'] + ' ' + a['excerpt'] + ' ' + full.get(a['url'], '') for a in arts)
    own = ngrams(unquoted(it['s']))
    ov = len(own & ngrams(src_text)) / max(1, len(own))
    if quoted_words(it['s']) > MAX_QUOTED:
        print(f'WARN {day} #{rank} quotes {quoted_words(it["s"])} words (max {MAX_QUOTED}): {it["h"]}', file=sys.stderr)
    worst = max(worst, ov)
    if ov > 0.15: print(f'WARN {day} #{rank} overlap {ov:.0%}: {it["h"]}', file=sys.stderr)
    states = '{' + ','.join('"' + s + '"' for s in it.get('st', [])) + '}'
    out.append(f"INSERT INTO news_items (day, rank, headline, summary, category, states, sources) VALUES "
               f"('{day}', {rank}, {q(it['h'])}, {q(it['s'])}, '{it['c']}', '{states}', {q(json.dumps(srcs, ensure_ascii=False))}::jsonb);")
assert len(data['items']) <= 50
out.append("COMMIT;")
open(f'sql/{day}.sql', 'w').write('\n'.join(out) + '\n')
print(day, 'stories', len(data['items']), 'max 8-gram overlap', f'{worst:.0%}')
