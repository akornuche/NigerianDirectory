import json
import psycopg2 # type: ignore
from database import get_connection # type: ignore

def seed_more_higher_ed():
    # Adding ~40 more to hit the 200 mark
    data = [
        # Private Universities
        {"name": "Bells University of Technology", "type": "private", "state": "Ogun", "city": "Ota", "institution_category": "university"},
        {"name": "Salem University Lokoja", "type": "private", "state": "Kogi", "city": "Lokoja", "institution_category": "university"},
        {"name": "Rhema University", "type": "private", "state": "Abia", "city": "Aba", "institution_category": "university"},
        {"name": "Crawford University", "type": "private", "state": "Ogun", "city": "Igbesa", "institution_category": "university"},
        {"name": "Al-Qalam University Katsina", "type": "private", "state": "Katsina", "city": "Katsina", "institution_category": "university"},
        {"name": "Crescent University", "type": "private", "state": "Ogun", "city": "Abeokuta", "institution_category": "university"},
        {"name": "Lead City University", "type": "private", "state": "Oyo", "city": "Ibadan", "institution_category": "university"},
        {"name": "Bingham University", "type": "private", "state": "Nasarawa", "city": "Karu", "institution_category": "university"},
        {"name": "Kwararafa University, Wukari", "type": "private", "state": "Taraba", "city": "Wukari", "institution_category": "university"},
        {"name": "Western Delta University, Oghara", "type": "private", "state": "Delta", "city": "Oghara", "institution_category": "university"},
        {"name": "Augustine University Ilara", "type": "private", "state": "Lagos", "city": "Epe", "institution_category": "university"},
        {"name": "Chrisland University", "type": "private", "state": "Ogun", "city": "Abeokuta", "institution_category": "university"},
        {"name": "Mountain Top University Ibafo", "type": "private", "state": "Ogun", "city": "Ibafo", "institution_category": "university"},
        {"name": "Igbinedion University", "type": "private", "state": "Edo", "city": "Okada", "institution_category": "university"},
        {"name": "Babcock University Ilishan", "type": "private", "state": "Ogun", "city": "Ilishan-Remo", "institution_category": "university"},
        {"name": "Mcpherson University Seriki Sotayo", "type": "private", "state": "Ogun", "city": "Seriki Sotayo", "institution_category": "university"},
        {"name": "Adeleke University Ede", "type": "private", "state": "Osun", "city": "Ede", "institution_category": "university"},
        {"name": "Mountain Top University", "type": "private", "state": "Ogun", "city": "Ibafo", "institution_category": "university"},
        {"name": "Covenant University Ota", "type": "private", "state": "Ogun", "city": "Ota", "institution_category": "university"},
        
        # Polytechnics
        {"name": "Lagos State Polytechnic Ikorodu", "type": "state", "state": "Lagos", "city": "Ikorodu", "institution_category": "polytechnic"},
        {"name": "Kwara State Polytechnic", "type": "state", "state": "Kwara", "city": "Ilorin", "institution_category": "polytechnic"},
        {"name": "Ramat Polytechnic", "type": "state", "state": "Borno", "city": "Maiduguri", "institution_category": "polytechnic"},
        {"name": "Imo State Polytechnic", "type": "state", "state": "Imo", "city": "Umuagwo", "institution_category": "polytechnic"},
        {"name": "Ogun State Polytechnic", "type": "state", "state": "Ogun", "city": "Ipokia", "institution_category": "polytechnic"},
        {"name": "Moshood Abiola Polytechnic", "type": "state", "state": "Ogun", "city": "Abeokuta", "institution_category": "polytechnic"},
        {"name": "Gateway Polytechnic Saapade", "type": "state", "state": "Ogun", "city": "Saapade", "institution_category": "polytechnic"},
        {"name": "Abraham Adesanya Polytechnic", "type": "state", "state": "Ogun", "city": "Ijebu-Igbo", "institution_category": "polytechnic"},
        {"name": "Delta State Polytechnic, Ogwashi-Uku", "type": "state", "state": "Delta", "city": "Ogwashi-Uku", "institution_category": "polytechnic"},
        {"name": "Delta State Polytechnic, Otefe-Oghara", "type": "state", "state": "Delta", "city": "Otefe-Oghara", "institution_category": "polytechnic"},
        {"name": "Hassan Usman Katsina Polytechnic", "type": "state", "state": "Katsina", "city": "Katsina", "institution_category": "polytechnic"},
        {"name": "Abubakar Tatari Ali Polytechnic", "type": "state", "state": "Bauchi", "city": "Bauchi", "institution_category": "polytechnic"},
        {"name": "Nuhu Bamalli Polytechnic", "type": "state", "state": "Kaduna", "city": "Zaria", "institution_category": "polytechnic"},
        {"name": "Edo State Polytechnic", "type": "state", "state": "Edo", "city": "Usen", "institution_category": "polytechnic"},
        {"name": "Ken Saro-Wiwa Polytechnic", "type": "state", "state": "Rivers", "city": "Bori", "institution_category": "polytechnic"},
        {"name": "Rivers State College of Arts and Science", "type": "state", "state": "Rivers", "city": "Port Harcourt", "institution_category": "polytechnic"},
        {"name": "Rufus Giwa Polytechnic", "type": "state", "state": "Ondo", "city": "Owo", "institution_category": "polytechnic"},
        {"name": "Osun State Polytechnic", "type": "state", "state": "Osun", "city": "Iree", "institution_category": "polytechnic"},
        {"name": "Osun State College of Technology", "type": "state", "state": "Osun", "city": "Esa-Oke", "institution_category": "polytechnic"},
        {"name": "The Oke-Ogun Polytechnic, Saki", "type": "state", "state": "Oyo", "city": "Saki", "institution_category": "polytechnic"},
        {"name": "Ibarapa Polytechnic, Eruwa", "type": "state", "state": "Oyo", "city": "Eruwa", "institution_category": "polytechnic"},
    ]

    conn = get_connection()
    cur = conn.cursor()

    added = 0
    skipped = 0

    for inst in data:
        name = inst['name']
        slug = name.lower().replace(" ", "-").replace(",", "").replace(".", "").replace("'", "")
        
        try:
            cur.execute("""
                INSERT INTO schools (
                    name, slug, institution_category, type, state, city,
                    needs_ai_enrichment
                ) VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id
            """, (
                name, slug, inst['institution_category'], inst['type'], inst['state'], 
                inst['city']
            ))
            row = cur.fetchone()
            if row:
                added += 1
            else:
                skipped += 1
        except Exception as e:
            conn.rollback()

    conn.commit()
    
    cur.execute("SELECT COUNT(*) FROM schools WHERE institution_category != 'school'")
    total_count = cur.fetchone()[0]
    
    cur.close()
    conn.close()
    
    print(f"Added: {added}")
    print(f"Total Higher Ed in DB: {total_count}")

if __name__ == "__main__":
    seed_more_higher_ed()
