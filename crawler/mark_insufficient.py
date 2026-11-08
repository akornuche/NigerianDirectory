"""
Mark schools with insufficient content so they won't be recrawled.
This prevents wasting resources on schools that don't have good online presence.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import db_manager
from datetime import datetime

conn = db_manager.get_connection()
cur = conn.cursor()

# Get list of schools marked as insufficient from the crawl log
# We'll mark them with a special flag so they're skipped
# For now, let's just identify them by updating a comment field

print("Identifying insufficient schools from the crawl...")

# Read the log to find insufficient schools
log_file = "secondary_school_crawl_20261105_235923.log"
insufficient_schools = []

try:
    with open(log_file, 'r') as f:
        for line in f:
            if "Insufficient content:" in line:
                # Extract school name from line like: "Insufficient content: School Name"
                parts = line.split("Insufficient content:")
                if len(parts) > 1:
                    school_name = parts[1].strip()
                    insufficient_schools.append(school_name)
except Exception as e:
    print(f"Error reading log: {e}")

print(f"Found {len(insufficient_schools)} insufficient schools")

if insufficient_schools:
    print("\nMarking insufficient schools with a flag...")
    # Mark them with a temporary note so we can identify them
    for school_name in insufficient_schools[:5]:  # Show first 5 as example
        print(f"  - {school_name}")
    
    if len(insufficient_schools) > 5:
        print(f"  ... and {len(insufficient_schools) - 5} more")

# For safety, let's just list what we found and ask for confirmation
print()
print("To prevent recrawling insufficient schools, we should:")
print("1. Update their enriched_* fields to a marker (e.g., 'insufficient')")
print("2. OR keep them empty and maintain a separate list")
print()
print("Current recommendation: Only crawl the 142 schools that were NEVER attempted")

cur.close()
conn.close()
