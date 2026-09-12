from database import get_connection

def check():
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM schools WHERE institution_category = 'university' AND enriched_history IS NOT NULL")
    uni_count = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM schools WHERE institution_category = 'polytechnic' AND enriched_history IS NOT NULL")
    poly_count = cur.fetchone()[0]
    
    print(f"Enriched Universities: {uni_count}")
    print(f"Enriched Polytechnics: {poly_count}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    check()
