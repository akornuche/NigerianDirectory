"""
Sanity-check new_universities_to_seed.json against the current Neon state
one more time, printing side-by-side name comparisons for anything that
looks close to an existing entry (same state, similar first word), so a
human can eyeball real near-duplicates before seeding.

Usage: python verify_new_roster.py
"""
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db_manager
from merge_nuc_roster import normalise

with open('new_universities_to_seed.json', encoding='utf-8') as f:
    new_entries = json.load(f)

conn = db_manager.get_connection()
try:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT name, state FROM schools WHERE institution_category = 'university'"
        )
        existing = [(row['name'], row['state']) for row in cur.fetchall()]
finally:
    conn.close()

by_state = {}
for name, state in existing:
    by_state.setdefault(state, []).append(name)

print(f"Checking {len(new_entries)} new entries against {len(existing)} existing rows...\n")

suspicious = 0
for entry in new_entries:
    state = entry['state']
    candidates = by_state.get(state, [])
    norm_new = normalise(entry['name'])
    first_word = norm_new.split()[0] if norm_new.split() else ''

    for existing_name in candidates:
        norm_existing = normalise(existing_name)
        existing_first = norm_existing.split()[0] if norm_existing.split() else ''
        if first_word and first_word == existing_first and norm_new != norm_existing:
            print(f"  POSSIBLE DUPLICATE in {state}:")
            print(f"    new     : {entry['name']!r}")
            print(f"    existing: {existing_name!r}")
            suspicious += 1

print(f"\n{suspicious} possible near-duplicates flagged for review.")
if suspicious == 0:
    print("No same-state, same-first-word collisions found.")
