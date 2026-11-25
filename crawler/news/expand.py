"""Apply expand/<day>.json (a new lead and longer summaries keyed by rank) to
write/<day>.json, check originality, and build sql/<day>-update.sql, which
updates the day in place, matching stories by day and headline.
Refuses if the page would have under 1,000 words or any check warns."""
import json, sys, subprocess, re
day = sys.argv[1]
data = json.load(open(f'write/{day}.json')); exp = json.load(open(f'expand/{day}.json'))
def q(v): return "'" + str(v).replace("'", "''") + "'"
if exp.get('lead'): data['lead'] = exp['lead'].strip()
for k, s in exp.get('s', {}).items():
    data['items'][int(k) - 1]['s'] = s.strip()
words = len((data['lead'] + ' ' + ' '.join(i['h'] + ' ' + i['s'] for i in data['items'])).split())
json.dump(data, open(f'write/{day}.json', 'w'), ensure_ascii=False, indent=1)
r = subprocess.run([sys.executable, 'build_sql.py', day], capture_output=True, text=True)
print(r.stdout.strip(), r.stderr.strip(), f'| words {words}')
if r.returncode or 'WARN' in r.stderr or words < 1000:
    sys.exit('not ready: ' + ('under 1,000 words' if words < 1000 else 'fix the warnings'))
out = ['BEGIN;', f"UPDATE news_days SET lead = {q(data['lead'])}, updated_at = NOW() WHERE day = '{day}';"]
for it in data['items']:
    out.append(f"UPDATE news_items SET summary = {q(it['s'])}, updated_at = NOW() WHERE day = '{day}' AND headline = {q(it['h'])};")
out.append('COMMIT;')
open(f'sql/{day}-update.sql', 'w').write('\n'.join(out) + '\n')
