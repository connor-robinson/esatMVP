"""
Check how many microschemas are stored in the database.
"""
import sys
from pathlib import Path

# Add restructure to path
_restructure_path = str(Path(__file__).parent / "restructure")
if _restructure_path not in sys.path:
    sys.path.insert(0, _restructure_path)

from db import NSAASchemaDB

def check_microschemas():
    """Check microschemas in the database."""
    db = NSAASchemaDB()
    
    with db._get_connection() as conn:
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='micro_schemas'
        """)
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            print("[ERROR] micro_schemas table does not exist!")
            print("   The table needs to be initialized first.")
            return
        
        # Total count
        cursor.execute("SELECT COUNT(*) FROM micro_schemas")
        total = cursor.fetchone()[0]
        
        print("=" * 60)
        print("MICROSCHEMAS IN DATABASE")
        print("=" * 60)
        print(f"Total microschemas: {total}")
        print()
        
        if total == 0:
            print("[WARN] No microschemas found in database!")
            return
        
        # Count by subject_final
        cursor.execute("""
            SELECT subject_final, COUNT(*) 
            FROM micro_schemas 
            GROUP BY subject_final 
            ORDER BY subject_final
        """)
        subject_counts = cursor.fetchall()
        
        print("By subject_final:")
        for subject, count in subject_counts:
            print(f"  {subject:15s}: {count:4d}")
        print()
        
        # Count by discard status
        cursor.execute("""
            SELECT discard, COUNT(*) 
            FROM micro_schemas 
            GROUP BY discard
        """)
        discard_counts = cursor.fetchall()
        
        print("By discard status:")
        for discard, count in discard_counts:
            status = "Discarded" if discard else "Active"
            print(f"  {status:15s}: {count:4d}")
        print()
        
        # Count active (not discarded) by subject
        cursor.execute("""
            SELECT subject_final, COUNT(*) 
            FROM micro_schemas 
            WHERE discard = 0
            GROUP BY subject_final 
            ORDER BY subject_final
        """)
        active_subject_counts = cursor.fetchall()
        
        print("Active (not discarded) by subject_final:")
        for subject, count in active_subject_counts:
            print(f"  {subject:15s}: {count:4d}")
        print()
        
        # Check for questions with embeddings
        cursor.execute("""
            SELECT COUNT(*) 
            FROM micro_schemas 
            WHERE embedding IS NOT NULL AND embedding != ''
        """)
        with_embeddings = cursor.fetchone()[0]
        
        print(f"Microschemas with embeddings: {with_embeddings}/{total} ({100*with_embeddings/total:.1f}%)")
        print()
        
        # Sample a few question_ids to verify
        cursor.execute("""
            SELECT question_id, subject_final, discard, quality_score
            FROM micro_schemas 
            LIMIT 5
        """)
        samples = cursor.fetchall()
        
        if samples:
            print("Sample microschemas:")
            for qid, subject, discard, quality in samples:
                status = "DISCARDED" if discard else "ACTIVE"
                print(f"  {qid[:30]:30s} | {subject:10s} | {status:10s} | quality: {quality:.2f}")
        
        print("=" * 60)

if __name__ == "__main__":
    check_microschemas()
