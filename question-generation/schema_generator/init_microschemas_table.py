"""
Initialize the micro_schemas table if it doesn't exist.
"""
import sys
from pathlib import Path

# Add restructure to path
_restructure_path = str(Path(__file__).parent / "restructure")
if _restructure_path not in sys.path:
    sys.path.insert(0, _restructure_path)

from db import NSAASchemaDB

def init_table():
    """Initialize the micro_schemas table."""
    db = NSAASchemaDB()
    
    # This will create the table if it doesn't exist
    db._init_schema_pipeline_tables()
    
    print("Initialized micro_schemas table (if it didn't exist).")
    print("Now checking if there are any microschemas...")
    
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM micro_schemas")
        count = cursor.fetchone()[0]
        print(f"Current microschemas in database: {count}")

if __name__ == "__main__":
    init_table()
