"""
Check the status of the microschema generation pipeline.
"""
import sqlite3
from pathlib import Path
from datetime import datetime

db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"

if not db_path.exists():
    print("[ERROR] Database not found!")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

print("=" * 70)
print("PIPELINE STATUS")
print("=" * 70)
print()

# Check microschemas
cursor.execute("SELECT COUNT(*) FROM micro_schemas")
total_microschemas = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 0")
active_microschemas = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 1")
discarded_microschemas = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE embedding IS NOT NULL AND embedding != ''")
embedded_microschemas = cursor.fetchone()[0]

print("Microschemas:")
print(f"  Total: {total_microschemas}")
print(f"  Active (not discarded): {active_microschemas}")
print(f"  Discarded: {discarded_microschemas}")
print(f"  With embeddings: {embedded_microschemas}")
print()

# Check by subject
cursor.execute("""
    SELECT subject_final, COUNT(*) as total, 
           SUM(CASE WHEN discard = 0 THEN 1 ELSE 0 END) as active
    FROM micro_schemas 
    GROUP BY subject_final
    ORDER BY subject_final
""")
subject_stats = cursor.fetchall()

if subject_stats:
    print("By subject:")
    for subject, total, active in subject_stats:
        print(f"  {subject:15s}: {total:4d} total, {active:4d} active")
    print()

# Check schemas_new
cursor.execute("SELECT COUNT(*) FROM schemas_new")
total_schemas = cursor.fetchone()[0]

cursor.execute("""
    SELECT subject, COUNT(*) as count, 
           AVG(json_array_length(exemplar_question_ids)) as avg_questions
    FROM schemas_new
    GROUP BY subject
    ORDER BY subject
""")
schema_stats = cursor.fetchall()

print("Schemas (new format):")
print(f"  Total: {total_schemas}")
if schema_stats:
    print("  By subject:")
    for subject, count, avg_q in schema_stats:
        avg_str = f"{avg_q:.2f}" if avg_q else "0.00"
        print(f"    {subject:15s}: {count:4d} schemas (avg {avg_str} questions per schema)")
print()

# Check questions in queue
cursor.execute("SELECT COUNT(*) FROM questions_queue WHERE status = 'done'")
questions_done = cursor.fetchone()[0]

print(f"Questions in queue (done): {questions_done}")
print()

# Show recent activity
cursor.execute("""
    SELECT question_id, subject_final, discard, quality_score, created_at
    FROM micro_schemas
    ORDER BY created_at DESC
    LIMIT 5
""")
recent = cursor.fetchall()

if recent:
    print("Most recent microschemas:")
    for qid, subject, discard, quality, created_at in recent:
        status = "DISCARDED" if discard else "ACTIVE"
        qid_short = qid[:40] + "..." if len(qid) > 40 else qid
        print(f"  {qid_short:43s} | {subject:10s} | {status:10s} | quality: {quality:6.2f}")
    print()

conn.close()

print("=" * 70)
print("To check again, run: python scripts/schema_generator/check_pipeline_status.py")
print("=" * 70)
