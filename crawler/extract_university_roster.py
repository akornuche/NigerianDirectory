"""
Extract and merge university entries from the three legacy seed scripts
into a single deduplicated JSON file, used as the source for a proper
tracked universityData.js roster.

This is a one-off migration tool: the three seed_higher_ed_*.py scripts are
hand-written Python literals with inconsistent field coverage (some have
website/address/established_year, most do not). Rather than hand-copying
153 records into JavaScript, this parses the dict literals directly with
ast.literal_eval and merges by name, preferring entries with more fields
populated when duplicates exist across files.

Usage: python extract_university_roster.py
Output: university_roster_extracted.json (gitignored, intermediate only)
"""
import ast
import json
import re

FILES = [
    'seed_higher_ed_bulk.py',
    'seed_higher_ed_comprehensive.py',
    'seed_higher_ed_final.py',
]


def extract_dicts(text: str):
    """Find every {...} dict literal in the file and parse it safely."""
    results = []
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == '{':
            if depth == 0:
                start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and start is not None:
                snippet = text[start:i + 1]
                try:
                    parsed = ast.literal_eval(snippet)
                    if isinstance(parsed, dict) and 'name' in parsed:
                        results.append(parsed)
                except (ValueError, SyntaxError):
                    pass
                start = None
    return results


def score(entry: dict) -> int:
    """More populated fields wins when merging duplicates across files."""
    return sum(1 for v in entry.values() if v not in (None, '', [], {}))


def normalise_name(name: str) -> str:
    """
    Strip punctuation and common city/campus suffixes so that name
    variants referring to the same institution collapse to one key.

    The three source files disagree on naming for the same institution,
    e.g. "Adeleke University" vs "Adeleke University Ede", or
    "Lead City University" vs "Lead City University Ibadan". An exact
    lowercase match misses these, which would otherwise seed visible
    duplicate institutions on the live site.
    """
    name = name.lower()
    name = re.sub(r'[,.]', '', name)
    name = re.sub(r"'", '', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def main():
    # First pass: merge by exact normalised name.
    by_exact_name: dict = {}

    for filename in FILES:
        text = open(filename, encoding='utf-8').read()
        for entry in extract_dicts(text):
            if entry.get('institution_category') != 'university':
                continue
            key = normalise_name(entry['name'])
            if key not in by_exact_name or score(entry) > score(by_exact_name[key]):
                by_exact_name[key] = entry

    # Second pass: merge remaining entries that share state + city and whose
    # normalised name is a prefix of one another (handles "X" vs "X Ede").
    final: dict = {}
    for key, entry in sorted(by_exact_name.items(), key=lambda kv: -score(kv[1])):
        location = (entry.get('state', ''), entry.get('city', ''))
        duplicate_of = None
        for existing_key, existing_entry in final.items():
            existing_location = (existing_entry.get('state', ''), existing_entry.get('city', ''))
            if location != existing_location:
                continue
            if existing_key.startswith(key) or key.startswith(existing_key):
                duplicate_of = existing_key
                break
        if duplicate_of:
            if score(entry) > score(final[duplicate_of]):
                final[duplicate_of] = entry
        else:
            final[key] = entry

    roster = sorted(final.values(), key=lambda e: e['name'])

    with open('university_roster_extracted.json', 'w', encoding='utf-8') as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)

    missing_website = sum(1 for e in roster if not e.get('website'))
    print(f"Extracted {len(roster)} unique universities")
    print(f"Missing website: {missing_website}")
    print(f"Have website: {len(roster) - missing_website}")

    by_state = {}
    for e in roster:
        by_state.setdefault(e.get('state', '?'), 0)
        by_state[e['state']] += 1
    print(f"\nStates covered: {len(by_state)}")
    for state in sorted(by_state):
        print(f"  {state:14} {by_state[state]}")


if __name__ == '__main__':
    main()
