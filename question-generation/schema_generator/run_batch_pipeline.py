"""
Run pipeline in batches of 20 with parallel processing and resume capability.
Does NOT default to mathematics - retries until successful.
"""
import sys
import os
import warnings
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from dotenv import load_dotenv

# Suppress warnings
os.environ['ABSL_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=UserWarning, module='absl')
warnings.filterwarnings('ignore', message='.*ALTS creds ignored.*')

import argparse
from dotenv import load_dotenv

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

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
    from schemagenerator import QuestionItem, Gemini, run_full_schema_pipeline
    print("[DEBUG] Modules imported successfully", flush=True)
except Exception as e:
    print(f"[ERROR] Failed to import: {e}", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)

BATCH_SIZE = 20
MAX_WORKERS = 3  # Parallel agents
MAX_RETRIES = 5  # Retry failed batches

def get_processed_question_ids(db: NSAASchemaDB) -> set:
    """Get set of question IDs that have already been processed."""
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT question_id FROM micro_schemas")
        return {row[0] for row in cursor.fetchall()}

def load_questions_from_queue(db: NSAASchemaDB, exclude_ids: set = None, limit: int = None) -> list:
    """Load questions from queue, excluding already processed ones."""
    if exclude_ids is None:
        exclude_ids = set()
    
    with db._get_connection() as conn:
        cursor = conn.cursor()
        
        if limit:
            cursor.execute("""
                SELECT question_id, text, subject 
                FROM questions_queue 
                WHERE status = 'done'
            """)
        else:
            cursor.execute("""
                SELECT question_id, text, subject 
                FROM questions_queue 
                WHERE status = 'done'
            """)
        
        rows = cursor.fetchall()
        questions = []
        for qid, text, subject_db in rows:
            if qid in exclude_ids:
                continue
            
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
                print(f"[WARN] Failed to create QuestionItem for {qid}: {e}", flush=True)
                continue
        
        if limit:
            questions = questions[:limit]
        
        return questions

def process_batch(batch_num: int, questions: list, api_key: str, db_path: str) -> dict:
    """Process a single batch of questions. Returns stats."""
    print(f"[BATCH {batch_num}] Starting batch with {len(questions)} questions", flush=True)
    
    try:
        # Create fresh database connection and Gemini client for this batch
        db = NSAASchemaDB(db_path)
        gemini = Gemini(api_key=api_key)
        
        def progress_callback(current, total, msg):
            if current % 10 == 0 or current == total or current == 0:
                print(f"[BATCH {batch_num}] {current}/{total}: {msg}", flush=True)
        
        # Run pipeline for this batch
        stats = run_full_schema_pipeline(
            questions,
            gemini,
            db,
            progress_callback=progress_callback
        )
        
        print(f"[BATCH {batch_num}] Complete: {stats['extracted']} extracted, {stats['validated']} validated", flush=True)
        return {"success": True, "stats": stats, "batch_num": batch_num}
        
    except Exception as e:
        print(f"[BATCH {batch_num}] FAILED: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e), "batch_num": batch_num}

def main():
    parser = argparse.ArgumentParser(description='Run pipeline in batches with parallel processing')
    parser.add_argument('--batch-size', type=int, default=BATCH_SIZE,
                       help=f'Questions per batch (default: {BATCH_SIZE})')
    parser.add_argument('--workers', type=int, default=MAX_WORKERS,
                       help=f'Number of parallel workers (default: {MAX_WORKERS})')
    parser.add_argument('--limit', type=int, default=None,
                       help='Total questions to process (default: all)')
    parser.add_argument('--wipe', action='store_true',
                       help='Wipe all microschemas before starting')
    args = parser.parse_args()
    
    print("=" * 70, flush=True)
    print("BATCH PIPELINE WITH PARALLEL PROCESSING", flush=True)
    print("=" * 70, flush=True)
    print(f"Batch size: {args.batch_size}", flush=True)
    print(f"Parallel workers: {args.workers}", flush=True)
    print(f"Max retries per batch: {MAX_RETRIES}", flush=True)
    print(flush=True)
    
    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in .env.local", flush=True)
        return
    
    # Initialize database
    db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"
    if not db_path.exists():
        print(f"[ERROR] Database not found at: {db_path}", flush=True)
        return
    
    db = NSAASchemaDB(str(db_path))
    
    # Wipe if requested
    if args.wipe:
        print("[STEP 1] Wiping existing microschemas and schemas...", flush=True)
        with db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM micro_schemas")
            cursor.execute("DELETE FROM schemas_new")
            conn.commit()
        print("[OK] Database wiped", flush=True)
        print(flush=True)
    
    # Get already processed questions
    print("[STEP 2] Checking for already processed questions...", flush=True)
    processed_ids = get_processed_question_ids(db)
    print(f"[INFO] Found {len(processed_ids)} already processed questions", flush=True)
    print(flush=True)
    
    # Load questions
    print("[STEP 3] Loading questions from queue...", flush=True)
    all_questions = load_questions_from_queue(db, exclude_ids=processed_ids, limit=args.limit)
    print(f"[INFO] Loaded {len(all_questions)} questions to process", flush=True)
    
    if not all_questions:
        print("[INFO] No questions to process!", flush=True)
        return
    
    # Split into batches
    batches = []
    for i in range(0, len(all_questions), args.batch_size):
        batch = all_questions[i:i + args.batch_size]
        batches.append((i // args.batch_size + 1, batch))
    
    print(f"[INFO] Split into {len(batches)} batches", flush=True)
    print(flush=True)
    
    # Process batches with parallel workers
    print("=" * 70, flush=True)
    print("STARTING BATCH PROCESSING", flush=True)
    print("=" * 70, flush=True)
    print(flush=True)
    
    completed = 0
    failed_batches = []
    
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        # Submit all batches
        future_to_batch = {}
        for batch_num, batch_questions in batches:
            future = executor.submit(process_batch, batch_num, batch_questions, api_key, str(db_path))
            future_to_batch[future] = batch_num
        
        # Process results as they complete
        for future in as_completed(future_to_batch):
            batch_num = future_to_batch[future]
            try:
                result = future.result()
                if result["success"]:
                    completed += 1
                    print(f"[PROGRESS] Batch {batch_num} completed ({completed}/{len(batches)})", flush=True)
                else:
                    failed_batches.append((batch_num, result.get("error", "Unknown error")))
                    print(f"[ERROR] Batch {batch_num} failed: {result.get('error', 'Unknown')}", flush=True)
            except Exception as e:
                failed_batches.append((batch_num, str(e)))
                print(f"[ERROR] Batch {batch_num} exception: {e}", flush=True)
    
    # Retry failed batches
    if failed_batches:
        print(flush=True)
        print("=" * 70, flush=True)
        print(f"RETRYING {len(failed_batches)} FAILED BATCHES", flush=True)
        print("=" * 70, flush=True)
        print(flush=True)
        
        for retry in range(MAX_RETRIES):
            if not failed_batches:
                break
            
            print(f"[RETRY] Attempt {retry + 1}/{MAX_RETRIES}", flush=True)
            retry_failed = []
            
            for batch_num, error in failed_batches:
                # Reload the batch questions
                batch_idx = batch_num - 1
                if batch_idx < len(batches):
                    _, batch_questions = batches[batch_idx]
                    result = process_batch(batch_num, batch_questions, api_key, str(db_path))
                    
                    if result["success"]:
                        print(f"[RETRY SUCCESS] Batch {batch_num} succeeded on retry", flush=True)
                    else:
                        retry_failed.append((batch_num, result.get("error", error)))
                        print(f"[RETRY FAILED] Batch {batch_num} still failing", flush=True)
                
                # Small delay between retries
                time.sleep(2)
            
            failed_batches = retry_failed
            if failed_batches:
                print(f"[RETRY] {len(failed_batches)} batches still failed, waiting before next retry...", flush=True)
                time.sleep(10)
    
    # Final summary
    print(flush=True)
    print("=" * 70, flush=True)
    print("BATCH PROCESSING COMPLETE", flush=True)
    print("=" * 70, flush=True)
    print(f"Completed batches: {completed}/{len(batches)}", flush=True)
    if failed_batches:
        print(f"Failed batches: {len(failed_batches)}", flush=True)
        for batch_num, error in failed_batches:
            print(f"  Batch {batch_num}: {error}", flush=True)
    
    # Final database check
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM micro_schemas")
        total_microschemas = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM micro_schemas WHERE discard = 0")
        active_microschemas = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM schemas_new")
        total_schemas = cursor.fetchone()[0]
        
        print(flush=True)
        print("Final database state:", flush=True)
        print(f"  Total microschemas: {total_microschemas}", flush=True)
        print(f"  Active microschemas: {active_microschemas}", flush=True)
        print(f"  Total schemas: {total_schemas}", flush=True)
    
    print(flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    main()
