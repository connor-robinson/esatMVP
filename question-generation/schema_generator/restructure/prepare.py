import json
import os
import re
from pathlib import Path
from db import NSAASchemaDB

def clean_text(text: str) -> str:
    """Basic text cleaning."""
    if not text:
        return ""
    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def is_diagram_question(text: str, skipped_diagram: bool) -> bool:
    """Determine if a question likely contains a diagram/graph."""
    if skipped_diagram:
        return True
    
    diagram_keywords = [
        "diagram", "figure", "graph", "image", "sketch", "plot", "illustrated"
    ]
    text_lower = text.lower()
    
    for kw in diagram_keywords:
        if kw in text_lower:
            # Check for false positives like "as shown in the diagram" vs just mentioning the word
            # For now, stay strict as per requirements
            return True
            
    # Text density analysis: if a question is very short but has high qnum, 
    # it might be a diagram-only question where text wasn't extracted well.
    if len(text.strip()) < 50:
        return True
        
    return False

def get_subject_from_text(text: str) -> str:
    """Identify subject from section header text."""
    text_lower = text.lower()
    if "part a" in text_lower and "mathematics" in text_lower:
        return "Maths"
    if "part b" in text_lower and "physics" in text_lower:
        return "Physics"
    if "part c" in text_lower and "chemistry" in text_lower:
        return "Chemistry"
    if "part d" in text_lower and "biology" in text_lower:
        return "Biology"
    if "part e" in text_lower and ("advanced mathematics" in text_lower or "advanced physics" in text_lower):
        # Default to Maths for Part E for now, or we could split
        return "Maths"
    
    # Section 2 often has subject in the name
    if "section 2" in text_lower:
        if "physics" in text_lower: return "Physics"
        if "chemistry" in text_lower: return "Chemistry"
        if "biology" in text_lower: return "Biology"
        if "mathematics" in text_lower: return "Maths"

    return ""

def prepare_nsaa_corpus():
    db = NSAASchemaDB()
    
    qgen_root = Path(__file__).resolve().parent.parent.parent
    paths = [
        qgen_root / "esat_question_generator" / "schemas" / "_cache" / "papers_index.json",
        qgen_root / "schema_generator" / "_cache" / "papers_index.json",
    ]

    index_path = None
    for p in paths:
        if p.exists():
            index_path = str(p)
            break
            
    if not index_path:
        print("Error: papers_index.json not found.")
        return

    print(f"Loading questions from {index_path}...")
    with open(index_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Filter for NSAA only
    nsaa_questions = [q for q in data if q.get("exam") == "NSAA"]
    print(f"Found {len(nsaa_questions)} NSAA entries.")

    # Group by paper_id to track subject context
    papers = {}
    for q in nsaa_questions:
        pid = q.get("paper_id")
        if pid not in papers:
            papers[pid] = []
        papers[pid].append(q)

    total_added = 0
    total_diagrams = 0

    for pid, questions in papers.items():
        # Sort by qnum to maintain sequence
        # Note: qnum might be 0 for headers
        questions.sort(key=lambda x: x.get("qnum", 0))
        
        current_subject = "Maths" # Default for NSAA Section 1 Part A
        
        for q in questions:
            text = q.get("text", "")
            qnum = q.get("qnum", 0)
            
            # Check for subject switch
            new_subj = get_subject_from_text(text)
            if new_subj:
                current_subject = new_subj
                # Header entries usually have qnum 0 or very short text
                if qnum == 0 or len(text.strip()) < 100:
                    continue

            # Identify diagram questions
            if is_diagram_question(text, q.get("skipped_diagram", False)):
                total_diagrams += 1
                continue

            # Basic quality filter
            if len(text.strip()) < 100:
                continue

            # Generate a unique ID for the queue
            # Format: NSAA_YEAR_SEC_QNUM_PID_HASH
            year = q.get("year", "UNK")
            sec = q.get("section", "S1").replace(" ", "")
            qid = f"NSAA_{year}_{sec}_Q{qnum}_{pid[:8]}"
            
            db.add_question_to_queue(qid, clean_text(text), current_subject)
            total_added += 1

    print(f"Finished preparation:")
    print(f"  Total added to queue: {total_added}")
    print(f"  Total diagram questions skipped: {total_diagrams}")

if __name__ == "__main__":
    prepare_nsaa_corpus()
















