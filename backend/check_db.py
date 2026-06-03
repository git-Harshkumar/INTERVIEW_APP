"""
Quick script to check the 'interview' database tables and users.
Run with: .\venv\Scripts\python check_db.py
"""
import psycopg2

conn = psycopg2.connect(
    host="127.0.0.1",
    port=5432,
    user="postgres",
    password="harsh123",
    database="interview"
)
cursor = conn.cursor()

# List all tables
cursor.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
""")
tables = cursor.fetchall()
print("📋 Tables in 'interview' database:")
if tables:
    for t in tables:
        print(f"   - {t[0]}")
else:
    print("   (no tables yet — start the backend to auto-create them)")

# If 'users' table exists, show its contents
if ('users',) in tables:
    cursor.execute("SELECT id, name, email, created_at FROM users")
    rows = cursor.fetchall()
    print(f"\n👤 Users ({len(rows)} total):")
    if rows:
        for r in rows:
            print(f"   ID={r[0]}, Name={r[1]}, Email={r[2]}, Created={r[3]}")
    else:
        print("   (no users registered yet)")

cursor.close()
conn.close()
