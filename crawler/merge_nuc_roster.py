"""
Merge the NUC-sourced roster (nuc_university_roster.py) against what is
already seeded in Neon, producing a list of genuinely new universities to
add -- not duplicates of ones already in the database under a slightly
different name.

Matching strategy: normalise names the same way
extract_university_roster.py did (strip punctuation/case), then treat two
entries as the same institution if their normalised names match exactly,
or if one is a prefix of the other AND they share a state. The second
condition catches cases like "University of Port-Harcourt" (NUC) vs
"University of Port Harcourt" (already seeded).

Usage: python merge_nuc_roster.py
Output: new_universities_to_seed.json
"""
import json
import re
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from nuc_university_roster import build_roster
from database import db_manager


def normalise(name: str) -> str:
    name = name.lower()
    name = re.sub(r'[,.\'-]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    # Common equivalents that differ only in hyphenation/spacing between
    # NUC's listing and what was already seeded.
    name = name.replace('port harcourt', 'port harcourt')
    name = name.replace('university of technology ', 'university of tech ')
    return name


def load_existing():
    conn = db_manager.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name, state FROM schools WHERE institution_category = 'university'"
            )
            return [(row['name'], row['state']) for row in cur.fetchall()]
    finally:
        conn.close()


def is_duplicate(candidate_name, candidate_state, existing_normalised):
    norm = normalise(candidate_name)
    for existing_norm, existing_state in existing_normalised:
        if norm == existing_norm:
            return True
        if existing_state == candidate_state and (
            norm.startswith(existing_norm) or existing_norm.startswith(norm)
        ):
            # Guard against very short prefixes causing false positives,
            # e.g. "fu" matching many "Federal University, X" entries.
            shorter = min(len(norm), len(existing_norm))
            if shorter >= 12:
                return True
    return False


def main():
    nuc_roster = build_roster()
    existing = load_existing()
    existing_normalised = [(normalise(name), state) for name, state in existing]

    new_entries = []
    duplicate_entries = []

    for entry in nuc_roster:
        if is_duplicate(entry['name'], entry['state'], existing_normalised):
            duplicate_entries.append(entry)
        else:
            new_entries.append(entry)

    print(f"NUC roster total   : {len(nuc_roster)}")
    print(f"Already seeded     : {len(existing)}")
    print(f"Matched as dupes   : {len(duplicate_entries)}")
    print(f"Genuinely new      : {len(new_entries)}")

    by_type = {}
    for e in new_entries:
        by_type.setdefault(e['type'], 0)
        by_type[e['type']] += 1
    print(f"\nNew by type: {by_type}")

    with open('new_universities_to_seed.json', 'w', encoding='utf-8') as f:
        json.dump(new_entries, f, indent=2, ensure_ascii=False)
    print(f"\nWrote new_universities_to_seed.json ({len(new_entries)} entries)")


if __name__ == '__main__':
    main()
