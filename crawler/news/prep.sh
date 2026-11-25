#!/bin/bash
# Usage: prep.sh <day> [n]: cluster, shortlist and print a compact candidate list.
cd "$(dirname "$0")"
python3 cluster.py "$1" >/dev/null && python3 shortlist.py "$1" "${2:-58}" >/dev/null
python3 - "$1" <<'PY'
import json, sys
for i, c in enumerate(json.load(open(f'short/{sys.argv[1]}.json'))):
    a = sorted(c['articles'], key=lambda a: -len(a['excerpt']))[0]
    print(f"#{i} [{len(c['outlets'])}] {c['articles'][0]['title']}\n   {a['excerpt'][:230]}")
PY
