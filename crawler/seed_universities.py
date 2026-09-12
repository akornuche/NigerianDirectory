import json
import psycopg2 # type: ignore
from database import get_connection # type: ignore

def seed_universities():
    universities = [
        # FEDERAL UNIVERSITIES
        {
            "name": "University of Ibadan",
            "type": "federal",
            "state": "Oyo",
            "city": "Ibadan",
            "address": "Oduduwa Road, Ibadan",
            "website": "https://ui.edu.ng",
            "established_year": 1948,
            "principal_name": "Prof. Kayode Adebowale",
            "principal_title": "Vice-Chancellor",
            "institution_category": "university",
            "levels": "Undergraduate, Postgraduate",
            "boarding": True
        },
        {
            "name": "University of Lagos",
            "type": "federal",
            "state": "Lagos",
            "city": "Akoka",
            "address": "University Road, Akoka, Yaba",
            "website": "https://unilag.edu.ng",
            "established_year": 1962,
            "principal_name": "Prof. Folasade Ogunsola",
            "principal_title": "Vice-Chancellor",
            "institution_category": "university",
            "levels": "Undergraduate, Postgraduate",
            "boarding": True
        }
    ]

    conn = get_connection()
    cur = conn.cursor()

    print(f"Seeding {len(universities)} institutions...")

    for uni in universities:
        name = str(uni.get('name', ''))
        slug = name.lower().replace(" ", "-").replace(",", "").replace(".", "")
        
        try:
            cur.execute("""
                INSERT INTO schools (
                    name, slug, institution_category, type, state, city, address, 
                    website, established_year, principal_name, principal_title,
                    levels, boarding, needs_ai_enrichment
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (slug) DO NOTHING
            """, (
                uni['name'], slug, uni['institution_category'], uni['type'], uni['state'], 
                uni['city'], uni['address'], uni['website'], uni['established_year'], 
                uni['principal_name'], uni['principal_title'], uni['levels'], 
                uni['boarding']
            ))
            print(f"✓ Added/Skipped: {uni['name']}")
        except Exception as e:
            print(f"✗ Error adding {uni['name']}: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_universities()
