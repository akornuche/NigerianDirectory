"""
Extract list of school names that were already processed in the first crawl.
Save to a file so we can exclude them in the next crawl.
"""
import re

log_file = "secondary_school_crawl_20261105_235923.log"
processed_schools = set()

print("Extracting processed schools from log...")

# Pattern matches: "Processing: School Name (State)" or "Saved: School Name"
with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        # Match "Processing: " lines
        match = re.search(r'Processing:\s+(.+?)\s*$', line)
        if match:
            school_name = match.group(1).strip()
            processed_schools.add(school_name)

print(f"Found {len(processed_schools)} unique schools that were processed")

# Save to file
with open('processed_schools_list.txt', 'w') as f:
    for school in sorted(processed_schools):
        f.write(f"{school}\n")

print(f"Saved to: processed_schools_list.txt")
print()
print("First 10 processed schools:")
for school in sorted(processed_schools)[:10]:
    print(f"  - {school}")
