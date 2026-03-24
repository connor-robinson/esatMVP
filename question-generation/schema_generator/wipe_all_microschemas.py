"""Wipe all microschemas and schemas_new to start fresh."""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"

if not db_path.exists():
    print("[ERROR] Database not found!")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

print("=" * 70)
print("WIPING ALL MICROSCHEMAS AND SCHEMAS")
print("=" * 70)
print()

# Count before
cursor.execute("SELECT COUNT(*) FROM micro_schemas")
before_micro = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM schemas_new")
before_schemas = cursor.fetchone()[0]

print(f"Before:")
print(f"  Microschemas: {before_micro}")
print(f"  Schemas (new): {before_schemas}")
print()

# Wipe
cursor.execute("DELETE FROM micro_schemas")
deleted_micro = cursor.rowcount
cursor.execute("DELETE FROM schemas_new")
deleted_schemas = cursor.rowcount

conn.commit()
conn.close()

print(f"Deleted:")
print(f"  Microschemas: {deleted_micro}")
print(f"  Schemas (new): {deleted_schemas}")
print()
print("[OK] Database wiped. Ready to start fresh.")
print("=" * 70)
