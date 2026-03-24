"""
Comprehensive check of where microschemas are stored.
"""
import sys
import sqlite3
import json
from pathlib import Path

# Add restructure to path
_restructure_path = str(Path(__file__).parent / "restructure")
if _restructure_path not in sys.path:
    sys.path.insert(0, _restructure_path)

from db import NSAASchemaDB

def check_all_locations():
    """Check all possible locations where microschemas might be stored."""
    print("=" * 70)
    print("COMPREHENSIVE MICROSCHEMA STORAGE CHECK")
    print("=" * 70)
    print()
    
    db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"
    
    # 1. Check database
    print("1. DATABASE CHECK")
    print("-" * 70)
    if not db_path.exists():
        print(f"   [ERROR] Database not found at: {db_path}")
    else:
        print(f"   Database location: {db_path}")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"   Tables in database: {', '.join(tables)}")
        print()
        
        # Check micro_schemas table
        if 'micro_schemas' in tables:
            cursor.execute("SELECT COUNT(*) FROM micro_schemas")
            count = cursor.fetchone()[0]
            print(f"   micro_schemas table: {count} records")
            
            if count > 0:
                cursor.execute("""
                    SELECT subject_final, COUNT(*) 
                    FROM micro_schemas 
                    GROUP BY subject_final
                """)
                subject_counts = cursor.fetchall()
                print("   By subject:")
                for subject, cnt in subject_counts:
                    print(f"     {subject}: {cnt}")
                
                cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 0")
                active = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 1")
                discarded = cursor.fetchone()[0]
                print(f"   Active: {active}, Discarded: {discarded}")
        else:
            print("   [WARN] micro_schemas table does not exist!")
        
        # Check questions_queue
        if 'questions_queue' in tables:
            cursor.execute("SELECT COUNT(*) FROM questions_queue")
            queue_count = cursor.fetchone()[0]
            print(f"   questions_queue: {queue_count} questions")
            
            cursor.execute("SELECT status, COUNT(*) FROM questions_queue GROUP BY status")
            status_counts = cursor.fetchall()
            if status_counts:
                print("   Queue status breakdown:")
                for status, cnt in status_counts:
                    print(f"     {status}: {cnt}")
        
        # Check schemas (old format)
        if 'schemas' in tables:
            cursor.execute("SELECT COUNT(*) FROM schemas")
            schema_count = cursor.fetchone()[0]
            print(f"   schemas (old format): {schema_count} schemas")
        
        conn.close()
    
    print()
    
    # 2. Check cache files
    print("2. CACHE FILES CHECK")
    print("-" * 70)
    cache_dir = Path(__file__).parent / "_cache"
    if cache_dir.exists():
        print(f"   Cache directory: {cache_dir}")
        cache_files = list(cache_dir.glob("*.json"))
        print(f"   Found {len(cache_files)} JSON cache files")
        for f in cache_files[:5]:  # Show first 5
            print(f"     - {f.name}")
    else:
        print("   [INFO] No cache directory found")
    
    print()
    
    # 3. Check log files
    print("3. LOG FILES CHECK")
    print("-" * 70)
    log_dir = Path(__file__).parent / "_logs"
    if log_dir.exists():
        print(f"   Log directory: {log_dir}")
        log_files = list(log_dir.glob("*.json"))
        print(f"   Found {len(log_files)} JSON log files")
        for f in log_files:
            print(f"     - {f.name}")
            try:
                with open(f, 'r') as file:
                    data = json.load(file)
                    if isinstance(data, dict):
                        if 'summary' in data:
                            print(f"       Summary: {data['summary']}")
            except:
                pass
    else:
        print("   [INFO] No log directory found")
    
    print()
    
    # 4. Check for any output files
    print("4. OUTPUT FILES CHECK")
    print("-" * 70)
    script_dir = Path(__file__).parent
    output_files = list(script_dir.glob("*micro*.json")) + list(script_dir.glob("*micro*.txt"))
    if output_files:
        print(f"   Found {len(output_files)} files with 'micro' in name:")
        for f in output_files:
            print(f"     - {f.name} ({f.stat().st_size} bytes)")
    else:
        print("   [INFO] No output files with 'micro' in name found")
    
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    # Final summary
    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        if 'micro_schemas' in tables:
            cursor.execute("SELECT COUNT(*) FROM micro_schemas")
            total = cursor.fetchone()[0]
            if total > 0:
                print(f"[OK] Found {total} microschemas in database")
            else:
                print("[WARN] No microschemas found in database")
        else:
            print("[WARN] micro_schemas table does not exist")
        conn.close()
    else:
        print("[ERROR] Database file not found")

if __name__ == "__main__":
    check_all_locations()
