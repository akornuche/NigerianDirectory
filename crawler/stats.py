from database import get_connection

def stats():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM schools WHERE needs_ai_enrichment = FALSE")
    enriched = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM schools WHERE needs_ai_enrichment = TRUE")
    pending = cur.fetchone()[0]
    
    print(f"Enriched: {enriched}")
    print(f"Pending: {pending}")
    print(f"Total: {enriched + pending}")
    
    conn.close()

if __name__ == "__main__":
    stats()
