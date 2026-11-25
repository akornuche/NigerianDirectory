#!/bin/bash
# Usage: load.sh <day>: build the draft SQL and load it into production; refuses if any summary overlaps > 15%.
cd "$(dirname "$0")"
out=$(python3 build_sql.py "$1" 2>&1) || { echo "$out"; exit 1; }
echo "$out"
echo "$out" | grep -q '^WARN' && { echo "not loaded: reword the flagged summaries"; exit 1; }
source "${NEON_ENV:?set NEON_ENV to the env file}" && node "${NEON_RUN:?set NEON_RUN to the runner}" "sql/$1.sql"
