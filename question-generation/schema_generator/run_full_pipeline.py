"""
Clear all microschemas, generate new ones from all questions, and cluster into schemas.
Target: <= 3 questions per schema.
"""
import sys
import os
import warnings

# Suppress Abseil warnings from Google Generative AI library (must be before imports)
os.environ['ABSL_MIN_LOG_LEVEL'] = '2'  # Suppress INFO and WARNING logs
warnings.filterwarnings('ignore', category=UserWarning, module='absl')
warnings.filterwarnings('ignore', message='.*ALTS creds ignored.*')

import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
project_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(project_root / ".env.local")

# Add paths
_restructure_path = str(Path(__file__).parent / "restructure")
if _restructure_path not in sys.path:
    sys.path.insert(0, _restructure_path)

_schema_gen_path = str(Path(__file__).parent)
if _schema_gen_path not in sys.path:
    sys.path.insert(0, _schema_gen_path)

print("[DEBUG] Importing modules...", flush=True)
try:
    from db import NSAASchemaDB
    print("[DEBUG] NSAASchemaDB imported", flush=True)
except Exception as e:
    print(f"[ERROR] Failed to import NSAASchemaDB: {e}", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    from schemagenerator import QuestionItem, Gemini, run_full_schema_pipeline
    print("[DEBUG] schemagenerator modules imported", flush=True)
except Exception as e:
    print(f"[ERROR] Failed to import from schemagenerator: {e}", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)

def clear_microschemas(db: NSAASchemaDB):
    """Clear all microschemas from the database."""
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM micro_schemas")
        count = cursor.rowcount
        conn.commit()
        print(f"[CLEAR] Deleted {count} microschemas from database")
        return count

def clear_schemas_new(db: NSAASchemaDB):
    """Clear schemas_new table (new format schemas)."""
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM schemas_new")
        count = cursor.rowcount
        conn.commit()
        print(f"[CLEAR] Deleted {count} schemas from schemas_new table")
        return count

def load_questions_from_queue(db: NSAASchemaDB, limit: int = None) -> list:
    """Load questions from the database queue and convert to QuestionItem objects."""
    with db._get_connection() as conn:
        cursor = conn.cursor()
        
        if limit:
            cursor.execute("""
                SELECT question_id, text, subject 
                FROM questions_queue 
                WHERE status = 'done'
                LIMIT ?
            """, (limit,))
        else:
            cursor.execute("""
                SELECT question_id, text, subject 
                FROM questions_queue 
                WHERE status = 'done'
            """)
        
        rows = cursor.fetchall()
        print(f"[LOAD] Found {len(rows)} questions in queue (status='done')")
        
        questions = []
        for qid, text, subject_db in rows:
            try:
                parts = qid.split('_')
                exam = parts[0] if len(parts) > 0 else "NSAA"
                year = parts[1] if len(parts) > 1 else None
                section_part = parts[2] if len(parts) > 2 else "S1"
                qnum = 1
                
                for part in parts:
                    if part.startswith('Q'):
                        try:
                            qnum = int(part[1:])
                        except:
                            pass
                
                if "S1" in section_part or "Section1" in section_part:
                    section = "Section 1"
                elif "S2" in section_part or "Section2" in section_part:
                    section = "Section 2"
                else:
                    section = "Section 1"
                
                paper_id = f"{exam}_{year}_{section_part}" if year else f"{exam}_{section_part}"
                pdf_path = f"papers/{exam}/{year}/{exam} {section}.pdf" if year else f"papers/{exam}/{exam} {section}.pdf"
                
                item = QuestionItem(
                    paper_id=paper_id,
                    pdf_path=pdf_path,
                    year=year,
                    exam=exam,
                    section=section,
                    qnum=qnum,
                    text=text,
                    skipped_diagram=False,
                    subject=subject_db
                )
                questions.append(item)
            except Exception as e:
                print(f"[WARN] Failed to create QuestionItem for {qid}: {e}")
                continue
        
        return questions

def main():
    """Main function to run the full pipeline."""
    # Force output to be flushed immediately
    import sys
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
    
    print("=" * 70, flush=True)
    print("FULL MICROSCHEMA GENERATION AND CLUSTERING PIPELINE", flush=True)
    print("=" * 70, flush=True)
    print(flush=True)
    print("Target: <= 3 questions per schema", flush=True)
    print(flush=True)
    
    parser = argparse.ArgumentParser(description='Clear and regenerate all microschemas, then cluster into schemas')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of questions to process (default: all)')
    parser.add_argument('--skip-clear', action='store_true',
                       help='Skip clearing existing microschemas')
    args = parser.parse_args()
    
    print(f"[DEBUG] Arguments parsed: limit={args.limit}, skip_clear={args.skip_clear}", flush=True)
    
    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in .env.local")
        return
    
    # Initialize database
    db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"
    if not db_path.exists():
        print(f"[ERROR] Database not found at: {db_path}")
        return
    
    db = NSAASchemaDB(str(db_path))
    
    # Step 1: Clear existing microschemas and schemas_new
    if not args.skip_clear:
        print("[STEP 1] Clearing existing microschemas and schemas...")
        clear_microschemas(db)
        clear_schemas_new(db)
        print()
    else:
        print("[STEP 1] Skipping clear (--skip-clear flag set)")
        print()
    
    # Step 2: Load questions
    print("[STEP 2] Loading questions from queue...")
    questions = load_questions_from_queue(db, limit=args.limit)
    
    if not questions:
        print("[ERROR] No questions loaded!")
        return
    
    print(f"[INFO] Loaded {len(questions)} questions to process")
    print()
    
    # Step 3: Initialize Gemini client
    print("[STEP 3] Initializing Gemini client...")
    gemini = Gemini(api_key=api_key)
    print(f"[INFO] Using model: {gemini.get_model_name()}")
    print()
    
    # Step 4: Progress callback
    def progress_callback(current, total, msg):
        if current % 50 == 0 or current == total or current == 0:
            print(f"[PROGRESS] {current}/{total}: {msg}")
    
    # Step 5: Run full pipeline
    print("=" * 70)
    print("STARTING FULL PIPELINE")
    print("=" * 70)
    print()
    print("Pipeline stages:")
    print("  1. Subject classification & filtering")
    print("  2. Micro-schema extraction")
    print("  3. Validation & quality scoring")
    print("  4. Embedding computation")
    print("  5. Anchor-based grouping (target: <= 3 questions per schema)")
    print("  6. Schema writing")
    print()
    
    try:
        stats = run_full_schema_pipeline(
            questions,
            gemini,
            db,
            progress_callback=progress_callback
        )
        
        print()
        print("=" * 70)
        print("PIPELINE COMPLETE")
        print("=" * 70)
        print()
        print(f"Total questions processed: {stats['total_questions']}")
        print(f"Microschemas extracted: {stats['extracted']}")
        print(f"Discarded: {stats['discarded']}")
        print(f"Validated: {stats['validated']}")
        print(f"Embedded: {stats['embedded']}")
        print(f"Schemas created: {stats['schemas_created']}")
        print()
        print("By subject:")
        for subject, sub_stats in stats['by_subject'].items():
            schemas = sub_stats['schemas']
            questions_grouped = sub_stats['questions_grouped']
            avg_per_schema = questions_grouped / schemas if schemas > 0 else 0
            print(f"  {subject}: {schemas} schemas, {questions_grouped} questions (avg: {avg_per_schema:.2f} per schema)")
        print()
        
        # Final database check
        with db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM micro_schemas")
            total_microschemas = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 0")
            active_microschemas = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM schemas_new")
            total_schemas = cursor.fetchone()[0]
            
            print("Final database state:")
            print(f"  Total microschemas: {total_microschemas}")
            print(f"  Active microschemas: {active_microschemas}")
            print(f"  Total schemas (new format): {total_schemas}")
        
    except Exception as e:
        print()
        print("=" * 70)
        print("PIPELINE FAILED")
        print("=" * 70)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    main()
