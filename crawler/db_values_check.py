from database import get_connection

def check():
    conn = get_connection()
    cur = conn.cursor()
    
    print("--- Institution Categories ---")
    cur.execute("SELECT DISTINCT institution_category FROM schools")
    for r in cur.fetchall(): print(f"'{r[0]}'")
    
    print("\n--- Types ---")
    cur.execute("SELECT DISTINCT type FROM schools")
    for r in cur.fetchall(): print(f"'{r[0]}'")
    
    print("\n--- University Types ---")
    cur.execute("SELECT DISTINCT type FROM schools WHERE institution_category = 'university'")
    for r in cur.fetchall(): print(f"'{r[0]}'")
    
    print("\n--- School Levels ---")
    cur.execute("SELECT DISTINCT levels FROM schools WHERE institution_category = 'school' LIMIT 10")
    for r in cur.fetchall(): print(f"'{r[0]}'")

    print("\n--- School Curricula ---")
    cur.execute("SELECT DISTINCT curriculum FROM schools WHERE institution_category = 'school' LIMIT 10")
    for r in cur.fetchall(): print(f"'{r[0]}'")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    check()
