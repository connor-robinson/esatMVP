"""
Analyze schema distribution: schemas per subject and questions per schema.
"""
import sys
from pathlib import Path

# Add restructure to path
_restructure_path = str(Path(__file__).parent / "restructure")
if _restructure_path not in sys.path:
    sys.path.insert(0, _restructure_path)

from db import NSAASchemaDB

def analyze_schemas():
    """Analyze schemas per subject and questions per schema."""
    db = NSAASchemaDB()
    
    with db._get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Count schemas per subject
        print("=" * 60)
        print("SCHEMAS PER SUBJECT")
        print("=" * 60)
        cursor.execute("SELECT subject, COUNT(*) FROM schemas GROUP BY subject ORDER BY subject")
        subject_counts = cursor.fetchall()
        
        total_schemas = 0
        for subject, count in subject_counts:
            print(f"  {subject:15s}: {count:4d} schemas")
            total_schemas += count
        print(f"  {'TOTAL':15s}: {total_schemas:4d} schemas")
        print()
        
        # 2. Count questions per schema (exemplar counts)
        print("=" * 60)
        print("QUESTIONS PER SCHEMA (by exemplar count)")
        print("=" * 60)
        cursor.execute("""
            SELECT schema_id, COUNT(*) as exemplar_count 
            FROM exemplars 
            GROUP BY schema_id
        """)
        exemplar_counts = cursor.fetchall()
        
        # Group by count buckets
        buckets = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, "10+": 0
        }
        
        for schema_id, count in exemplar_counts:
            if count == 1:
                buckets[1] += 1
            elif count == 2:
                buckets[2] += 1
            elif count == 3:
                buckets[3] += 1
            elif count == 4:
                buckets[4] += 1
            elif count == 5:
                buckets[5] += 1
            elif count == 6:
                buckets[6] += 1
            elif count == 7:
                buckets[7] += 1
            elif count == 8:
                buckets[8] += 1
            elif count == 9:
                buckets[9] += 1
            elif count == 10:
                buckets[10] += 1
            else:
                buckets["10+"] += 1
        
        total_schemas_with_exemplars = len(exemplar_counts)
        print(f"  Schemas with 1  question: {buckets[1]:4d}")
        print(f"  Schemas with 2  questions: {buckets[2]:4d}")
        print(f"  Schemas with 3  questions: {buckets[3]:4d}")
        print(f"  Schemas with 4  questions: {buckets[4]:4d}")
        print(f"  Schemas with 5  questions: {buckets[5]:4d}")
        print(f"  Schemas with 6  questions: {buckets[6]:4d}")
        print(f"  Schemas with 7  questions: {buckets[7]:4d}")
        print(f"  Schemas with 8  questions: {buckets[8]:4d}")
        print(f"  Schemas with 9  questions: {buckets[9]:4d}")
        print(f"  Schemas with 10 questions: {buckets[10]:4d}")
        print(f"  Schemas with 10+ questions: {buckets['10+']:4d}")
        print()
        print(f"  Total schemas with exemplars: {total_schemas_with_exemplars}")
        
        # Check for schemas without exemplars
        cursor.execute("""
            SELECT COUNT(*) 
            FROM schemas s
            LEFT JOIN exemplars e ON s.id = e.schema_id
            WHERE e.schema_id IS NULL
        """)
        schemas_without_exemplars = cursor.fetchone()[0]
        if schemas_without_exemplars > 0:
            print(f"  Schemas without exemplars: {schemas_without_exemplars}")
        print()
        
        # 3. Questions per schema by subject
        print("=" * 60)
        print("QUESTIONS PER SCHEMA BY SUBJECT")
        print("=" * 60)
        
        for subject, _ in subject_counts:
            cursor.execute("""
                SELECT s.id, COUNT(e.id) as exemplar_count
                FROM schemas s
                LEFT JOIN exemplars e ON s.id = e.schema_id
                WHERE s.subject = ?
                GROUP BY s.id
            """, (subject,))
            schema_exemplar_counts = cursor.fetchall()
            
            # Count buckets for this subject
            subject_buckets = {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, "10+": 0
            }
            
            for schema_id, count in schema_exemplar_counts:
                if count == 0:
                    continue  # Skip schemas without exemplars for this analysis
                elif count == 1:
                    subject_buckets[1] += 1
                elif count == 2:
                    subject_buckets[2] += 1
                elif count == 3:
                    subject_buckets[3] += 1
                elif count == 4:
                    subject_buckets[4] += 1
                elif count == 5:
                    subject_buckets[5] += 1
                elif count == 6:
                    subject_buckets[6] += 1
                elif count == 7:
                    subject_buckets[7] += 1
                elif count == 8:
                    subject_buckets[8] += 1
                elif count == 9:
                    subject_buckets[9] += 1
                elif count == 10:
                    subject_buckets[10] += 1
                else:
                    subject_buckets["10+"] += 1
            
            print(f"\n  {subject}:")
            print(f"    1 question:  {subject_buckets[1]:3d} schemas")
            print(f"    2 questions: {subject_buckets[2]:3d} schemas")
            print(f"    3 questions: {subject_buckets[3]:3d} schemas")
            print(f"    4 questions: {subject_buckets[4]:3d} schemas")
            print(f"    5 questions: {subject_buckets[5]:3d} schemas")
            print(f"    6 questions: {subject_buckets[6]:3d} schemas")
            print(f"    7 questions: {subject_buckets[7]:3d} schemas")
            print(f"    8 questions: {subject_buckets[8]:3d} schemas")
            print(f"    9 questions: {subject_buckets[9]:3d} schemas")
            print(f"    10 questions: {subject_buckets[10]:3d} schemas")
            print(f"    10+ questions: {subject_buckets['10+']:3d} schemas")
        
        print()
        print("=" * 60)

if __name__ == "__main__":
    analyze_schemas()
