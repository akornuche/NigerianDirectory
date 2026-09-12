from database import get_connection

def list_pending():
    conn = get_connection()
    cur = conn.cursor()
    
    query = """
        SELECT name, state, city 
        FROM schools 
        WHERE (enriched_history IS NULL OR enriched_history = '') 
        AND institution_category IN ('university', 'polytechnic', 'college')
        ORDER BY state, name
    """
    cur.execute(query)
    rows = cur.fetchall()
    
    print(f"Total Pending/Insufficient: {len(rows)}")
    for r in rows:
        print(f"- {r[0]} ({r[1]}, {r[2]})")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    list_pending()
