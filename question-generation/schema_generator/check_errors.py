"""
Check for errors and rate limits in the pipeline.
"""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"

if not db_path.exists():
    print("[ERROR] Database not found!")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

print("=" * 70)
print("ERROR AND RATE LIMIT CHECK")
print("=" * 70)
print()

# Check for error-related discard reasons
cursor.execute("""
    SELECT question_id, discard_reason, subject_final, quality_score
    FROM micro_schemas 
    WHERE discard_reason LIKE '%error%' 
       OR discard_reason LIKE '%rate%'
       OR discard_reason LIKE '%limit%'
       OR discard_reason LIKE '%429%'
       OR discard_reason LIKE '%failed%'
       OR discard_reason LIKE '%exception%'
    ORDER BY created_at DESC
    LIMIT 20
""")
errors = cursor.fetchall()

if errors:
    print(f"Found {len(errors)} microschemas with error-related discard reasons:")
    print()
    for qid, reason, subject, quality in errors:
        qid_short = qid[:50] + "..." if len(qid) > 50 else qid
        print(f"  {qid_short:53s} | {subject:10s} | quality: {quality:6.2f}")
        print(f"    Reason: {reason}")
        print()
else:
    print("No error-related discard reasons found in database.")
    print()

# Check for very low quality scores (might indicate errors)
cursor.execute("""
    SELECT COUNT(*) 
    FROM micro_schemas 
    WHERE quality_score < -5
""")
low_quality_count = cursor.fetchone()[0]

if low_quality_count > 0:
    print(f"Found {low_quality_count} microschemas with very low quality scores (< -5)")
    print("These might indicate processing issues.")
    print()

# Check processing progress
cursor.execute("SELECT COUNT(*) FROM micro_schemas")
total = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 0")
active = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 1")
discarded = cursor.fetchone()[0]

print("Processing Status:")
print(f"  Total microschemas: {total}")
print(f"  Active: {active}")
print(f"  Discarded: {discarded}")
print(f"  Discard rate: {100*discarded/total:.1f}%" if total > 0 else "  Discard rate: N/A")
print()

# Check if process seems stuck (no recent updates)
cursor.execute("""
    SELECT MAX(created_at) 
    FROM micro_schemas
""")
last_update = cursor.fetchone()[0]

if last_update:
    print(f"Last microschema created: {last_update}")
    print("(If this is old, the process might be stuck or waiting)")
    print()

conn.close()

print("=" * 70)
print("To see live output, stop the background process and run:")
print("  python scripts\\schema_generator\\run_full_pipeline.py > pipeline.log 2>&1")
print("=" * 70)
