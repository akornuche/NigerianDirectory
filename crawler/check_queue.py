from database import get_connection

def check_queue():
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Total Higher Ed
        cur.execute("SELECT COUNT(*) FROM schools WHERE institution_category != 'school'")
        total = cur.fetchone()[0]
        
        # Pending Higher Ed
        cur.execute("SELECT COUNT(*) FROM schools WHERE institution_category != 'school' AND needs_ai_enrichment = TRUE")
        pending = cur.fetchone()[0]
        
        # Enriched Higher Ed
        cur.execute("SELECT COUNT(*) FROM schools WHERE institution_category != 'school' AND needs_ai_enrichment = FALSE")
        enriched = cur.fetchone()[0]
        
        print(f"Total Higher Ed Seeded: {total}")
        print(f"Pending Enrichment: {pending}")
        print(f"Successfully Enriched: {enriched}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_queue()
