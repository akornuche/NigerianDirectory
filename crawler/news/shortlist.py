import json, re, sys
NEWS = re.compile(r'\b(tinubu|shettima|senate|reps|house of representatives|court|tribunal|judge|killed|kill|dead|die[sd]?|'
  r'abduct|kidnap|bandits?|gunmen|terrorists?|army|troops|military|police|dss|efcc|icpc|ndlea|customs|nafdac|'
  r'cbn|naira|inflation|gdp|budget|tax|firs|nnpc|nnpcl|dangote|refinery|fuel|petrol|crude|oil|electricity|power|tariff|'
  r'strike|asuu|nlc|tuc|nysc|jamb|waec|neco|inec|election|2027|primary|apc|pdp|adc|lp|governor|minister|president|'
  r'flood|collapse|crash|fire|explosion|outbreak|cholera|diphtheria|lassa|hospital|ecowas|price|prices|bank|stock|ngx|'
  r'super eagles|falcons|nff|world cup|afcon|sack|suspend|arrest|detain|probe|fraud|bill|law|policy|approve|launch)\b', re.I)
FLUFF = re.compile(r'(blessing|midas|tribute|at \d{2}\b|celebrat|congratulat|hails?|lauds?|commends?|felicitat|wishes|'
  r'how to|tips|guide|explainer|top \d+|sparks conversation|honou?red|award|wellness of)', re.I)
day = sys.argv[1]; cap = int(sys.argv[2]) if len(sys.argv) > 2 else 80
cs = json.load(open(f'clusters/{day}.json'))
def score(c):
    t = c['articles'][0]['title']
    s = len(c['outlets']) * 10 + min(c['n'], 5) + 3 * len(NEWS.findall(t))
    if FLUFF.search(t): s -= 12
    return s
cs = sorted(cs, key=score, reverse=True)[:cap]
out = []
for i, c in enumerate(cs):
    arts = sorted(c['articles'], key=lambda a: -len(a['excerpt']))
    ex = arts[0]['excerpt'][:420]
    out.append(f"#{i} [{len(c['outlets'])}] {c['articles'][0]['title']}\n   srcs: " +
               ' | '.join(f"{a['outlet']}" for a in c['articles'][:4]) + f"\n   ex: {ex}")
open(f'short/{day}.txt', 'w').write('\n'.join(out))
json.dump(cs, open(f'short/{day}.json', 'w'), ensure_ascii=False)
print(day, len(cs))
