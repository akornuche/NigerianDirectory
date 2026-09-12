import json
import psycopg2 # type: ignore
from database import get_connection # type: ignore

def seed_comprehensive_higher_ed():
    # Adding more institutions to reach ~200
    # Grouped by State for easier management
    data = [
        # ABIA
        {"name": "Gregory University, Uturu", "type": "private", "state": "Abia", "city": "Uturu", "institution_category": "university"},
        {"name": "Michael Okpara University of Agriculture", "type": "federal", "state": "Abia", "city": "Umudike", "institution_category": "university"},
        {"name": "Abia State Polytechnic", "type": "state", "state": "Abia", "city": "Aba", "institution_category": "polytechnic"},
        
        # ADAMAWA
        {"name": "Modibbo Adama University, Yola", "type": "federal", "state": "Adamawa", "city": "Yola", "institution_category": "university"},
        {"name": "Adamawa State University", "type": "state", "state": "Adamawa", "city": "Mubi", "institution_category": "university"},
        {"name": "Federal Polytechnic, Mubi", "type": "federal", "state": "Adamawa", "city": "Mubi", "institution_category": "polytechnic"},
        
        # AKWA IBOM
        {"name": "University of Uyo", "type": "federal", "state": "Akwa Ibom", "city": "Uyo", "institution_category": "university"},
        {"name": "Akwa Ibom State University", "type": "state", "state": "Akwa Ibom", "city": "Ikot Akpaden", "institution_category": "university"},
        {"name": "Ritman University", "type": "private", "state": "Akwa Ibom", "city": "Ikot Ekpene", "institution_category": "university"},
        {"name": "Akwa Ibom State Polytechnic", "type": "state", "state": "Akwa Ibom", "city": "Ikot Osurua", "institution_category": "polytechnic"},
        {"name": "Federal Polytechnic, Ukana", "type": "federal", "state": "Akwa Ibom", "city": "Ukana", "institution_category": "polytechnic"},

        # ANAMBRA
        {"name": "Chukwuemeka Odumegwu Ojukwu University", "type": "state", "state": "Anambra", "city": "Uli", "institution_category": "university"},
        {"name": "Madonna University", "type": "private", "state": "Anambra", "city": "Okija", "institution_category": "university"},
        {"name": "Paul University", "type": "private", "state": "Anambra", "city": "Awka", "institution_category": "university"},
        {"name": "Tansian University", "type": "private", "state": "Anambra", "city": "Umunya", "institution_category": "university"},
        {"name": "Federal Polytechnic, Oko", "type": "federal", "state": "Anambra", "city": "Oko", "institution_category": "polytechnic"},
        
        # BAUCHI
        {"name": "Abubakar Tafawa Balewa University", "type": "federal", "state": "Bauchi", "city": "Bauchi", "institution_category": "university"},
        {"name": "Bauchi State University", "type": "state", "state": "Bauchi", "city": "Gadau", "institution_category": "university"},
        
        # BAYELSA
        {"name": "Federal University, Otuoke", "type": "federal", "state": "Bayelsa", "city": "Otuoke", "institution_category": "university"},
        {"name": "Niger Delta University", "type": "state", "state": "Bayelsa", "city": "Wilberforce Island", "institution_category": "university"},
        {"name": "University of Africa, Toru-Orua", "type": "state", "state": "Bayelsa", "city": "Toru-Orua", "institution_category": "university"},
        {"name": "Federal Polytechnic, Ekowe", "type": "federal", "state": "Bayelsa", "city": "Ekowe", "institution_category": "polytechnic"},

        # BENUE
        {"name": "Federal University of Agriculture, Makurdi", "type": "federal", "state": "Benue", "city": "Makurdi", "institution_category": "university"},
        {"name": "University of Mkar", "type": "private", "state": "Benue", "city": "Mkar", "institution_category": "university"},
        {"name": "Federal Polytechnic, Wannune", "type": "federal", "state": "Benue", "city": "Wannune", "institution_category": "polytechnic"},

        # BORNO
        {"name": "Borno State University", "type": "state", "state": "Borno", "city": "Maiduguri", "institution_category": "university"},
        {"name": "Federal Polytechnic, Monguno", "type": "federal", "state": "Borno", "city": "Monguno", "institution_category": "polytechnic"},

        # CROSS RIVER
        {"name": "Cross River State University of Technology", "type": "state", "state": "Cross River", "city": "Calabar", "institution_category": "university"},
        {"name": "Arthur Jarvis University", "type": "private", "state": "Cross River", "city": "Akpabuyo", "institution_category": "university"},

        # DELTA
        {"name": "Federal University of Petroleum Resources Effurun", "type": "federal", "state": "Delta", "city": "Effurun", "institution_category": "university"},
        {"name": "Delta State University of Science and Technology", "type": "state", "state": "Delta", "city": "Ozoro", "institution_category": "university"},
        {"name": "Western Delta University", "type": "private", "state": "Delta", "city": "Oghara", "institution_category": "university"},
        {"name": "Novena University", "type": "private", "state": "Delta", "city": "Ogume", "institution_category": "university"},
        {"name": "Federal Polytechnic, Burutu", "type": "federal", "state": "Delta", "city": "Burutu", "institution_category": "polytechnic"},

        # EBONYI
        {"name": "Alex Ekwueme Federal University, Ndufu-Alike", "type": "federal", "state": "Ebonyi", "city": "Ikwo", "institution_category": "university"},
        {"name": "Evangel University, Akaeze", "type": "private", "state": "Ebonyi", "city": "Akaeze", "institution_category": "university"},

        # EDO
        {"name": "Edo State University Uzairue", "type": "state", "state": "Edo", "city": "Iyamho", "institution_category": "university"},
        {"name": "Igbinedion University OKada", "type": "private", "state": "Edo", "city": "Okada", "institution_category": "university"},
        {"name": "Benson Idahosa University", "type": "private", "state": "Edo", "city": "Benin City", "institution_category": "university"},
        {"name": "Wellspring University", "type": "private", "state": "Edo", "city": "Benin City", "institution_category": "university"},
        {"name": "Samuel Adegboyega University", "type": "private", "state": "Edo", "city": "Ogwa", "institution_category": "university"},

        # EKITI
        {"name": "Ekiti State University", "type": "state", "state": "Ekiti", "city": "Ado-Ekiti", "institution_category": "university"},
        {"name": "Federal University, Oye-Ekiti", "type": "federal", "state": "Ekiti", "city": "Oye", "institution_category": "university"},

        # ENUGU
        {"name": "University of Nigeria, Enugu Campus", "type": "federal", "state": "Enugu", "city": "Enugu", "institution_category": "university"},
        {"name": "Caritas University", "type": "private", "state": "Enugu", "city": "Amorji-Nike", "institution_category": "university"},
        {"name": "Renaissance University", "type": "private", "state": "Enugu", "city": "Ugbawka", "institution_category": "university"},
        {"name": "Godfrey Okoye University", "type": "private", "state": "Enugu", "city": "Enugu", "institution_category": "university"},
        {"name": "Federal Polytechnic, Ohodo", "type": "federal", "state": "Enugu", "city": "Ohodo", "institution_category": "polytechnic"},

        # FCT
        {"name": "University of Abuja", "type": "federal", "state": "FCT", "city": "Abuja", "institution_category": "university"},
        {"name": "African University of Science and Technology", "type": "private", "state": "FCT", "city": "Abuja", "institution_category": "university"},
        {"name": "Philomath University", "type": "private", "state": "FCT", "city": "Abuja", "institution_category": "university"},

        # GOMBE
        {"name": "Gombe State University", "type": "state", "state": "Gombe", "city": "Gombe", "institution_category": "university"},
        {"name": "Federal University, Kashere", "type": "federal", "state": "Gombe", "city": "Kashere", "institution_category": "university"},

        # IMO
        {"name": "Imo State University", "type": "state", "state": "Imo", "city": "Owerri", "institution_category": "university"},
        {"name": "Federal University of Technology Owerri", "type": "federal", "state": "Imo", "city": "Owerri", "institution_category": "university"},
        {"name": "Maranatha University, Mgbidi", "type": "private", "state": "Imo", "city": "Mgbidi", "institution_category": "university"},

        # JIGAWA
        {"name": "Sule Lamido University", "type": "state", "state": "Jigawa", "city": "Kafin Hausa", "institution_category": "university"},
        {"name": "Federal Polytechnic, Kazaure", "type": "federal", "state": "Jigawa", "city": "Kazaure", "institution_category": "polytechnic"},

        # KADUNA
        {"name": "Kaduna State University", "type": "state", "state": "Kaduna", "city": "Kaduna", "institution_category": "university"},
        {"name": "Air Force Institute of Technology", "type": "federal", "state": "Kaduna", "city": "Kaduna", "institution_category": "university"},
        {"name": "Greenfield University", "type": "private", "state": "Kaduna", "city": "Kaduna", "institution_category": "university"},

        # KANO
        {"name": "Kano University of Science and Technology", "type": "state", "state": "Kano", "city": "Wudil", "institution_category": "university"},
        {"name": "Yusuf Maitama Sule University", "type": "state", "state": "Kano", "city": "Kano", "institution_category": "university"},
        {"name": "Skyline University Nigeria", "type": "private", "state": "Kano", "city": "Kano", "institution_category": "university"},

        # KATSINA
        {"name": "Umaru Musa Yar'Adua University", "type": "state", "state": "Katsina", "city": "Katsina", "institution_category": "university"},
        {"name": "Al-Qalam University", "type": "private", "state": "Katsina", "city": "Katsina", "institution_category": "university"},

        # KEBBI
        {"name": "Federal University, Birnin Kebbi", "type": "federal", "state": "Kebbi", "city": "Birnin Kebbi", "institution_category": "university"},
        {"name": "Kebbi State University of Science and Technology", "type": "state", "state": "Kebbi", "city": "Aliero", "institution_category": "university"},

        # KOGI
        {"name": "Kogi State University", "type": "state", "state": "Kogi", "city": "Anyigba", "institution_category": "university"},
        {"name": "Confluence University of Science and Technology", "type": "state", "state": "Kogi", "city": "Osara", "institution_category": "university"},
        {"name": "Salem University", "type": "private", "state": "Kogi", "city": "Lokoja", "institution_category": "university"},

        # KWARA
        {"name": "Al-Hikmah University", "type": "private", "state": "Kwara", "city": "Ilorin", "institution_category": "university"},
        {"name": "Summit University, Offa", "type": "private", "state": "Kwara", "city": "Offa", "institution_category": "university"},
        {"name": "Federal Polytechnic, Offa", "type": "federal", "state": "Kwara", "city": "Offa", "institution_category": "polytechnic"},

        # LAGOS
        {"name": "Lagos State University of Science and Technology", "type": "state", "state": "Lagos", "city": "Ikorodu", "institution_category": "university"},
        {"name": "Lagos State University of Education", "type": "state", "state": "Lagos", "city": "Ijanikin", "institution_category": "university"},
        {"name": "Augustine University", "type": "private", "state": "Lagos", "city": "Epe", "institution_category": "university"},
        {"name": "Anchor University", "type": "private", "state": "Lagos", "city": "Ipaja", "institution_category": "university"},
        {"name": "Eko University of Medicine and Health Sciences", "type": "private", "state": "Lagos", "city": "Ijanikin", "institution_category": "university"},

        # NASARAWA
        {"name": "Nasarawa State University", "type": "state", "state": "Nasarawa", "city": "Keffi", "institution_category": "university"},
        {"name": "Federal Polytechnic, Nasarawa", "type": "federal", "state": "Nasarawa", "city": "Nasarawa", "institution_category": "polytechnic"},

        # NIGER
        {"name": "Ibrahim Badamasi Babangida University", "type": "state", "state": "Niger", "city": "Lapai", "institution_category": "university"},
        {"name": "Edusoko University", "type": "private", "state": "Niger", "city": "Bida", "institution_category": "university"},

        # OGUN
        {"name": "Federal University of Agriculture Abeokuta", "type": "federal", "state": "Ogun", "city": "Abeokuta", "institution_category": "university"},
        {"name": "Tai Solarin University of Education", "type": "state", "state": "Ogun", "city": "Ijagun", "institution_category": "university"},
        {"name": "Mountain Top University", "type": "private", "state": "Ogun", "city": "Makogi Oba", "institution_category": "university"},
        {"name": "Mcpherson University", "type": "private", "state": "Ogun", "city": "Seriki-Sotayo", "institution_category": "university"},
        {"name": "Christopher University", "type": "private", "state": "Ogun", "city": "Mowe", "institution_category": "university"},
        {"name": "Hallmark University", "type": "private", "state": "Ogun", "city": "Ijebu-Itele", "institution_category": "university"},

        # ONDO
        {"name": "Ondo State University of Science and Technology", "type": "state", "state": "Ondo", "city": "Okitipupa", "institution_category": "university"},
        {"name": "University of Fortune, Igbotako", "type": "private", "state": "Ondo", "city": "Igbotako", "institution_category": "university"},
        {"name": "Elizade University", "type": "private", "state": "Ondo", "city": "Ilara-Mokin", "institution_category": "university"},
        {"name": "Achievers University", "type": "private", "state": "Ondo", "city": "Owo", "institution_category": "university"},

        # OSUN
        {"name": "Osun State University", "type": "state", "state": "Osun", "city": "Osogbo", "institution_category": "university"},
        {"name": "Adeleke University", "type": "private", "state": "Osun", "city": "Ede", "institution_category": "university"},
        {"name": "Oduduwa University", "type": "private", "state": "Osun", "city": "Ipetumodu", "institution_category": "university"},
        {"name": "Kings University", "type": "private", "state": "Osun", "city": "Ode-Omu", "institution_category": "university"},

        # OYO
        {"name": "Ajayi Crowther University Oyo", "type": "private", "state": "Oyo", "city": "Oyo", "institution_category": "university"},
        {"name": "Lead City University Ibadan", "type": "private", "state": "Oyo", "city": "Ibadan", "institution_category": "university"},
        {"name": "Dominican University", "type": "private", "state": "Oyo", "city": "Ibadan", "institution_category": "university"},
        {"name": "Precious Cornerstone University", "type": "private", "state": "Oyo", "city": "Ibadan", "institution_category": "university"},

        # PLATEAU
        {"name": "Plateau State University", "type": "state", "state": "Plateau", "city": "Bokkos", "institution_category": "university"},
        {"name": "Karl Kumm University", "type": "private", "state": "Plateau", "city": "Vom", "institution_category": "university"},
        {"name": "Federal Polytechnic, Nyak-Shendam", "type": "federal", "state": "Plateau", "city": "Shendam", "institution_category": "polytechnic"},

        # RIVERS
        {"name": "Ignatius Ajuru University of Education", "type": "state", "state": "Rivers", "city": "Port Harcourt", "institution_category": "university"},
        {"name": "PAMO University of Medical Sciences", "type": "private", "state": "Rivers", "city": "Iriebe", "institution_category": "university"},
        {"name": "Federal Polytechnic, Ayakoroama", "type": "federal", "state": "Rivers", "city": "Ayakoroama", "institution_category": "polytechnic"},

        # SOKOTO
        {"name": "Sokoto State University", "type": "state", "state": "Sokoto", "city": "Sokoto", "institution_category": "university"},
        {"name": "Federal Polytechnic, Ilela", "type": "federal", "state": "Sokoto", "city": "Ilela", "institution_category": "polytechnic"},

        # TARABA
        {"name": "Taraba State University", "type": "state", "state": "Taraba", "city": "Jalingo", "institution_category": "university"},
        {"name": "Federal Polytechnic, Bali", "type": "federal", "state": "Taraba", "city": "Bali", "institution_category": "polytechnic"},

        # YOBE
        {"name": "Yobe State University", "type": "state", "state": "Yobe", "city": "Damaturu", "institution_category": "university"},
        {"name": "Federal University, Gashua", "type": "federal", "state": "Yobe", "city": "Gashua", "institution_category": "university"},
        {"name": "Federal Polytechnic, Damaturu", "type": "federal", "state": "Yobe", "city": "Damaturu", "institution_category": "polytechnic"},

        # ZAMFARA
        {"name": "Federal University, Gusau", "type": "federal", "state": "Zamfara", "city": "Gusau", "institution_category": "university"},
        {"name": "Zamfara State University", "type": "state", "state": "Zamfara", "city": "Talata Mafara", "institution_category": "university"},
        {"name": "Federal Polytechnic, Kaura Namoda", "type": "federal", "state": "Zamfara", "city": "Kaura Namoda", "institution_category": "polytechnic"},
    ]

    conn = get_connection()
    cur = conn.cursor()

    print(f"Checking existing and adding up to 200 institutions...")

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
            print(f"✗ Error adding {name}: {e}")
            conn.rollback()

    conn.commit()
    
    # Check current count
    cur.execute("SELECT COUNT(*) FROM schools WHERE institution_category != 'school'")
    total_count = cur.fetchone()[0]
    
    cur.close()
    conn.close()
    
    print(f"Added: {added}")
    print(f"Skipped (already exists): {skipped}")
    print(f"Total Higher Ed in DB: {total_count}")

if __name__ == "__main__":
    seed_comprehensive_higher_ed()
