"""
Show information about the database.
"""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"

print("=" * 70)
print("DATABASE INFORMATION")
print("=" * 70)
print()
print(f"Database Type: SQLite")
print(f"Location: {db_path.absolute()}")
print(f"Exists: {db_path.exists()}")
print()

if not db_path.exists():
    print("[ERROR] Database file not found!")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [row[0] for row in cursor.fetchall()]

print(f"Tables ({len(tables)}):")
for table in tables:
    print(f"  - {table}")
print()

# Get counts for each table
print("Record Counts:")
for table in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"  {table:20s}: {count:6d} records")
    except Exception as e:
        print(f"  {table:20s}: ERROR - {e}")

print()

# Show schema structure for key tables
print("Table Structures:")
print()

for table in ['schemas', 'exemplars', 'questions_queue', 'micro_schemas']:
    if table in tables:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        print(f"{table}:")
        for col in columns:
            col_name, col_type, not_null, default, pk = col[1], col[2], col[3], col[4], col[5]
            pk_str = " [PRIMARY KEY]" if pk else ""
            not_null_str = " NOT NULL" if not_null else ""
            default_str = f" DEFAULT {default}" if default else ""
            print(f"  - {col_name:20s} {col_type:15s}{not_null_str}{default_str}{pk_str}")
        print()

conn.close()

print("=" * 70)
print("Database managed by: NSAASchemaDB class in restructure/db.py")
print("=" * 70)
