"""
Run the microschema extraction pipeline on questions from the database queue.

Usage:
    python run_microschema_extraction.py [limit]
    
    limit: Number of questions to process, or 'all' for all, or 'test' for 10 (default: test)
"""
import sys
import os
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

# Add parent directory for schemagenerator
_schema_gen_path = str(Path(__file__).parent)
if _schema_gen_path not in sys.path:
    sys.path.insert(0, _schema_gen_path)

from db import NSAASchemaDB
from schemagenerator import QuestionItem, Gemini, run_full_schema_pipeline

def load_questions_from_queue(db: NSAASchemaDB, limit: int = None) -> list:
    """Load questions from the database queue and convert to QuestionItem objects."""
    with db._get_connection() as conn:
        cursor = conn.cursor()
        
        # Get questions from queue
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
        
        # Convert to QuestionItem objects
        questions = []
        for qid, text, subject_db in rows:
            # Create a QuestionItem with required fields
            # QuestionItem is a dataclass with: paper_id, pdf_path, year, exam, section, qnum, text, skipped_diagram, subject
            try:
                # Try to parse question_id to extract info if possible
                # Format might be like "NSAA_2022_S1_Q1" or similar
                parts = qid.split('_')
                exam = parts[0] if len(parts) > 0 else "NSAA"
                year = parts[1] if len(parts) > 1 else None
                section_part = parts[2] if len(parts) > 2 else "S1"
                qnum = 1
                
                # Try to extract question number from ID
                for part in parts:
                    if part.startswith('Q'):
                        try:
                            qnum = int(part[1:])
                        except:
                            pass
                
                # Determine section
                if "S1" in section_part or "Section 1" in section_part:
                    section = "Section 1"
                elif "S2" in section_part or "Section 2" in section_part:
                    section = "Section 2"
                else:
                    section = "Section 1"  # Default
                
                # Create paper_id
                paper_id = f"{exam}_{year}_{section_part}" if year else f"{exam}_{section_part}"
                
                # Create pdf_path (placeholder, but required)
                pdf_path = f"papers/{exam}/{year}/{exam} {section}.pdf" if year else f"papers/{exam}/{exam} {section}.pdf"
                
                item = QuestionItem(
                    paper_id=paper_id,
                    pdf_path=pdf_path,
                    year=year,
                    exam=exam,
                    section=section,
                    qnum=qnum,
                    text=text,
                    skipped_diagram=False,  # Assume not skipped
                    subject=subject_db  # Use subject from database
                )
                questions.append(item)
            except Exception as e:
                print(f"[WARN] Failed to create QuestionItem for {qid}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        return questions

def main():
    """Main function to run microschema extraction."""
    print("=" * 70)
    print("MICROSCHEMA EXTRACTION PIPELINE")
    print("=" * 70)
    print()
    
    # Check API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in .env.local")
        print("Please set GEMINI_API_KEY in .env.local file")
        return
    
    # Initialize database
    db_path = Path(__file__).parent / "restructure" / "nsaa_state.db"
    if not db_path.exists():
        print(f"[ERROR] Database not found at: {db_path}")
        return
    
    db = NSAASchemaDB(str(db_path))
    
    # Check how many questions are available
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM questions_queue WHERE status = 'done'")
        total_available = cursor.fetchone()[0]
    
    print(f"[INFO] Found {total_available} questions available in queue")
    
    if total_available == 0:
        print("[WARN] No questions available to process!")
        return
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run microschema extraction pipeline')
    parser.add_argument('limit', nargs='?', default='test', 
                       help='Number of questions to process, or "all" for all, or "test" for 10 (default: test)')
    args = parser.parse_args()
    
    user_input = args.limit.strip().lower()
    
    if user_input == "all":
        limit = None
        questions = load_questions_from_queue(db, limit=None)
        print(f"[INFO] Processing ALL {total_available} questions")
    elif user_input == "test" or user_input == "":
        limit = 10
        questions = load_questions_from_queue(db, limit=10)
        print(f"[INFO] Processing 10 questions (test mode)")
    else:
        try:
            limit = int(user_input)
            if limit > total_available:
                print(f"[WARN] Requested {limit} but only {total_available} available. Processing all available.")
                limit = None
            questions = load_questions_from_queue(db, limit=limit)
            print(f"[INFO] Processing {limit} questions")
        except ValueError:
            print(f"[ERROR] Invalid input '{user_input}'. Using test mode (10 questions)")
            questions = load_questions_from_queue(db, limit=10)
    
    if not questions:
        print("[ERROR] No questions loaded!")
        return
    
    print(f"\n[INFO] Loaded {len(questions)} questions to process")
    print()
    
    # Initialize Gemini client
    print("[INFO] Initializing Gemini client...")
    gemini = Gemini(api_key=api_key)
    print(f"[INFO] Using model: {gemini.get_model_name()}")
    print()
    
    # Progress callback
    def progress_callback(current, total, msg):
        if current % 50 == 0 or current == total:
            print(f"[PROGRESS] {current}/{total}: {msg}")
    
    # Run pipeline
    print("=" * 70)
    print("STARTING PIPELINE")
    print("=" * 70)
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
            print(f"  {subject}: {sub_stats['schemas']} schemas, {sub_stats['questions_grouped']} questions")
        print()
        
        # Check final count in database
        with db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM micro_schemas")
            final_count = cursor.fetchone()[0]
            print(f"Total microschemas now in database: {final_count}")
        
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
