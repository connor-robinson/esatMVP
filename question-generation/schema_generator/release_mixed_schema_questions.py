"""
Release questions from mixed schemas that have already been split.
Filters evidence to only keep questions from the correct paper type,
and releases questions from the wrong paper type for reuse.
"""

import os
import sys
from pathlib import Path

# Set TMUA mode before importing
os.environ["SCHEMA_MODE"] = "TMUA"

sys.path.insert(0, str(Path(__file__).parent))

from schemagenerator import (
    SCHEMAS_DIR_DEFAULT, TMUA_PAPER1_SCHEMAS_MD, TMUA_PAPER2_SCHEMAS_MD,
    load_schemas_meta, save_schemas_meta, parse_schema_summaries,
    safe_read_text, find_and_load_env, PROJECT_ROOT_DEFAULT,
    load_used_questions, save_used_questions
)

def release_mixed_questions():
    """Release questions from schemas that have evidence from the wrong paper type."""
    
    find_and_load_env(PROJECT_ROOT_DEFAULT)
    
    print("Scanning schemas to release questions from wrong paper types...")
    
    # Load metadata
    schemas_meta = load_schemas_meta()
    
    # Load schema summaries to determine which file each schema is in
    paper1_md = safe_read_text(TMUA_PAPER1_SCHEMAS_MD) if TMUA_PAPER1_SCHEMAS_MD.exists() else ""
    paper2_md = safe_read_text(TMUA_PAPER2_SCHEMAS_MD) if TMUA_PAPER2_SCHEMAS_MD.exists() else ""
    
    paper1_summaries = parse_schema_summaries(paper1_md)
    paper2_summaries = parse_schema_summaries(paper2_md)
    
    paper1_ids = {s.schema_id for s in paper1_summaries}
    paper2_ids = {s.schema_id for s in paper2_summaries}
    
    print(f"Found {len(paper1_ids)} schemas in Paper 1 file")
    print(f"Found {len(paper2_ids)} schemas in Paper 2 file")
    print(f"Checking {len(schemas_meta)} schemas in metadata...\n")
    
    released_questions = {"Paper1": [], "Paper2": []}
    filtered_schemas = []
    
    # Check all schemas in metadata
    for schema_id, meta in schemas_meta.items():
        evidence = meta.get("evidence", [])
        if not evidence:
            continue
        
        # Determine which paper type this schema belongs to
        # Check which file it's in, or use prefix as fallback
        is_paper1 = schema_id in paper1_ids or (schema_id.startswith("M") and schema_id not in paper2_ids)
        is_paper2 = schema_id in paper2_ids or (schema_id.startswith("R") and schema_id not in paper1_ids)
        
        # Skip if unclear (in both files or neither - shouldn't happen)
        if is_paper1 and is_paper2:
            continue
        if not is_paper1 and not is_paper2:
            continue
        
        # Filter evidence by paper type
        paper1_evidence = [qid for qid in evidence if "PAPER1" in str(qid).upper() or "PAPER 1" in str(qid).upper() or "_PAPER1" in str(qid).upper()]
        paper2_evidence = [qid for qid in evidence if "PAPER2" in str(qid).upper() or "PAPER 2" in str(qid).upper() or "_PAPER2" in str(qid).upper()]
        
        if is_paper1:
            # Schema is in Paper 1 file - should only have Paper 1 evidence
            if paper2_evidence:
                # Has Paper 2 evidence - filter it out and release those questions
                schemas_meta[schema_id]["evidence"] = paper1_evidence
                released_questions["Paper2"].extend(paper2_evidence)
                filtered_schemas.append((schema_id, "Paper1", len(paper2_evidence)))
                print(f"  {schema_id}: Removed {len(paper2_evidence)} Paper 2 questions (kept {len(paper1_evidence)} Paper 1)")
        
        elif is_paper2:
            # Schema is in Paper 2 file - should only have Paper 2 evidence
            if paper1_evidence:
                # Has Paper 1 evidence - filter it out and release those questions
                schemas_meta[schema_id]["evidence"] = paper2_evidence
                released_questions["Paper1"].extend(paper1_evidence)
                filtered_schemas.append((schema_id, "Paper2", len(paper1_evidence)))
                print(f"  {schema_id}: Removed {len(paper1_evidence)} Paper 1 questions (kept {len(paper2_evidence)} Paper 2)")
    
    if not filtered_schemas:
        print("\nNo schemas found with questions from wrong paper types.")
        print("All schemas already have correctly filtered evidence.")
        return
    
    # Save updated metadata
    save_schemas_meta(schemas_meta)
    print(f"\nUpdated {len(filtered_schemas)} schemas with filtered evidence.")
    
    # Remove released questions from used_questions tracking
    used_qids = load_used_questions()
    released_total = 0
    
    for paper_type, qids in released_questions.items():
        for qid in qids:
            if qid in used_qids:
                used_qids.remove(qid)
                released_total += 1
    
    if released_total > 0:
        save_used_questions(used_qids)
        print(f"\nReleased {released_total} questions for reuse:")
        print(f"  - Paper 1 questions released: {len(released_questions['Paper1'])}")
        print(f"  - Paper 2 questions released: {len(released_questions['Paper2'])}")
        print(f"\nThese questions are now available for generating new schemas!")
    else:
        print("\nNo questions were marked as 'used' that needed to be released.")
    
    print(f"\n{'='*60}")
    print(f"Cleanup complete!")
    print(f"  Schemas filtered: {len(filtered_schemas)}")
    print(f"  Questions released: {released_total}")
    print(f"{'='*60}")


if __name__ == "__main__":
    release_mixed_questions()

