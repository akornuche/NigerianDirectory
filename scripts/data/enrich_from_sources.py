import os
import psycopg2
import requests
from bs4 import BeautifulSoup
import json
import time

def extract_summary_from_url(url):
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "html.parser")
        # Try to extract main content
        paragraphs = soup.find_all('p')
        text = '\n'.join(p.get_text() for p in paragraphs)
        # Simple heuristic: return first 800 chars
        return text[:800] if text else None
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def enrich_schools():
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="nigerian_directory",
        user="postgres",
        password=os.environ["DB_PASSWORD"]  # set DB_PASSWORD; not stored in source
    )
    cur = conn.cursor()
    cur.execute("SELECT id, slug, name, content_sources FROM schools WHERE content_sources IS NOT NULL AND (enriched_history IS NULL OR enriched_history = '')")
    schools = cur.fetchall()
    print(f"Found {len(schools)} schools to enrich.")
    for school_id, slug, name, sources_json in schools:
        try:
            sources = json.loads(sources_json) if sources_json else []
        except Exception:
            sources = []
        summary = None
        for source in sources:
            url = source.get('url')
            if url:
                summary = extract_summary_from_url(url)
                if summary:
                    break
        if summary:
            cur.execute("UPDATE schools SET enriched_history = %s, enrichment_status = 'completed', last_enriched = NOW() WHERE id = %s", (summary, school_id))
            conn.commit()
            print(f"Enriched {slug} ({name})")
        else:
            print(f"No enrichment found for {slug} ({name})")
        time.sleep(2)  # Be polite to servers
    cur.close()
    conn.close()

if __name__ == "__main__":
    enrich_schools()
