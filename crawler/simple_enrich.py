"""
Simplified School Enrichment Script
Focuses on schools with official websites and direct content extraction.
"""
import os
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime
from database import get_connection

def extract_school_content(url, school_name):
    """Extract content directly from school website"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }

        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove unwanted elements
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'iframe']):
            tag.decompose()

        # Extract text content
        text_content = soup.get_text(separator=' ', strip=True)

        # Look for common sections
        sections = {
            'history': [],
            'academics': [],
            'campus': [],
            'student_life': []
        }

        # Simple keyword-based extraction
        paragraphs = soup.find_all(['p', 'div', 'section'])
        for para in paragraphs[:20]:  # Limit to first 20 paragraphs
            text = para.get_text(strip=True)
            if len(text) < 50:
                continue

            text_lower = text.lower()
            if any(word in text_lower for word in ['founded', 'established', 'history', 'since', 'began']):
                sections['history'].append(text[:500])  # Limit length
            elif any(word in text_lower for word in ['curriculum', 'academic', 'program', 'subjects', 'education']):
                sections['academics'].append(text[:500])
            elif any(word in text_lower for word in ['campus', 'facilities', 'building', 'library', 'laboratory']):
                sections['campus'].append(text[:500])
            elif any(word in text_lower for word in ['student', 'life', 'activities', 'sports', 'club']):
                sections['student_life'].append(text[:500])

        # Combine sections
        content = {}
        for section, texts in sections.items():
            if texts:
                content[section] = ' '.join(texts[:3])  # Combine up to 3 paragraphs

        return content if any(content.values()) else None

    except Exception as e:
        print(f"Error extracting from {url}: {e}")
        return None

def enrich_school_from_website(school):
    """Enrich a school using its official website"""
    school_id = school['id']
    school_name = school['name']
    website = school.get('website')

    if not website:
        return False

    print(f"Processing {school_name} from {website}")

    content = extract_school_content(website, school_name)

    if not content:
        print(f"No content extracted from {website}")
        return False

    # Save to database
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sources_json = json.dumps([{
                'url': website,
                'title': f"{school_name} Official Website",
                'type': 'educational',
                'accessed_at': datetime.now().isoformat()
            }])

            cur.execute("""
                UPDATE schools SET
                    enriched_history = %(history)s,
                    enriched_academics = %(academics)s,
                    enriched_campus_info = %(campus)s,
                    enriched_student_life = %(student_life)s,
                    content_sources = %(sources)s::jsonb,
                    last_enriched = NOW(),
                    needs_ai_enrichment = FALSE
                WHERE id = %(school_id)s
            """, {
                'school_id': school_id,
                'history': content.get('history'),
                'academics': content.get('academics'),
                'campus': content.get('campus'),
                'student_life': content.get('student_life'),
                'sources': sources_json
            })

            conn.commit()
            print(f"Successfully enriched {school_name}")
            return True

    except Exception as e:
        conn.rollback()
        print(f"Error saving {school_name}: {e}")
        return False
    finally:
        conn.close()

def main():
    # Get schools with websites that haven't been enriched
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, name, slug, website
                FROM schools
                WHERE website IS NOT NULL
                  AND website != ''
                  AND (enriched_history IS NULL OR enriched_history = '')
                  AND website NOT LIKE '%facebook.com%'
                  AND website NOT LIKE '%twitter.com%'
                  AND website NOT LIKE '%instagram.com%'
                ORDER BY name
                LIMIT 5  -- Process only 5 at a time to avoid interruptions
            """)

            schools = cur.fetchall()

    finally:
        conn.close()

    print(f"Found {len(schools)} schools with websites to process")

    if not schools:
        print("No more schools to process!")
        return

    enriched_count = 0
    for school in schools:
        school_dict = {
            'id': school[0],
            'name': school[1],
            'slug': school[2],
            'website': school[3]
        }

        if enrich_school_from_website(school_dict):
            enriched_count += 1

    print(f"Successfully enriched {enriched_count} schools")

if __name__ == '__main__':
    main()