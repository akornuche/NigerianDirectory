"""
Report live progress of a running university crawl by reading the most
recent log file directly, rather than scrolling through terminal output.

Usage: python crawl_progress.py
"""
import glob
import re
import os

LOG_PATTERN = 'university_crawl_*.log'


def latest_log():
    logs = glob.glob(LOG_PATTERN)
    if not logs:
        return None
    return max(logs, key=os.path.getmtime)


def main():
    log_path = latest_log()
    if not log_path:
        print('No university_crawl_*.log file found.')
        return

    with open(log_path, encoding='utf-8', errors='replace') as f:
        text = f.read()

    total_match = re.search(r'Loaded (\d+) universities for processing', text)
    total = int(total_match.group(1)) if total_match else None

    saved = len(re.findall(r'✅ Saved:', text))
    failed_db = len(re.findall(r'❌ DB save failed:', text))
    rejected = len(re.findall(r'❌ Quality rejected:', text))
    insufficient = len(re.findall(r'❌ Insufficient content:', text))
    errors = len(re.findall(r'💥 Error:', text))

    processed = saved + failed_db + rejected + insufficient + errors

    current_match = re.findall(r'🏷️\s*Processing: (.+?) \(', text)
    current = current_match[-1] if current_match else None

    progress_matches = re.findall(r'📊 Progress: (\d+)/(\d+) \(([\d.]+)%\) — ETA: (\S+)', text)
    last_progress = progress_matches[-1] if progress_matches else None

    print(f"Log file        : {log_path}")
    if total:
        print(f"Total queued    : {total}")
    print(f"Processed so far: {processed}")
    print(f"  saved         : {saved}")
    print(f"  insufficient  : {insufficient}")
    print(f"  quality reject: {rejected}")
    print(f"  db save failed: {failed_db}")
    print(f"  errors        : {errors}")
    if total:
        print(f"Remaining       : {total - processed}")
    if current:
        print(f"Currently on    : {current}")
    if last_progress:
        p, t, pct, eta = last_progress
        print(f"Last checkpoint : {p}/{t} ({pct}%) — ETA {eta}")


if __name__ == '__main__':
    main()
