"""
Standalone script to split TMUA schemas into Paper 1 and Paper 2 files.
Can be run independently of the main UI.
"""

import os
import sys
from pathlib import Path

# Set TMUA mode before importing schemagenerator (since MODE is set at import time)
os.environ["SCHEMA_MODE"] = "TMUA"

# Add parent directory to path to import from schemagenerator
sys.path.insert(0, str(Path(__file__).parent))

from schemagenerator import (
    MODE, SCHEMAS_DIR_DEFAULT, TMUA_PAPER1_SCHEMAS_MD, TMUA_PAPER2_SCHEMAS_MD,
    load_schemas_meta, save_schemas_meta, extract_schema_blocks_from_markdown, get_tmua_paper_type_from_evidence_ids,
    parse_schema_block, safe_read_text, safe_write_text, find_and_load_env, PROJECT_ROOT_DEFAULT,
    load_used_questions, save_used_questions
)

def split_tmua_schemas():
    """Split TMUA schemas into Paper 1 and Paper 2 files."""
    
    # Ensure we're looking in the right place
    find_and_load_env(PROJECT_ROOT_DEFAULT)
    
    # Double-check MODE is set correctly
    if MODE != "TMUA":
        print(f"Warning: MODE is {MODE}, expected TMUA. Proceeding anyway since this is a TMUA-specific script...")
    
    print("Starting TMUA schema split...")
    
    # Load metadata to get evidence for each schema
    schemas_meta = load_schemas_meta()
    
    # Check all possible schema files
    all_schema_files = [
        TMUA_PAPER1_SCHEMAS_MD,
        TMUA_PAPER2_SCHEMAS_MD,
        SCHEMAS_DIR_DEFAULT / "Schemas_TMUA.md",  # Legacy file
    ]
    
    all_blocks = []  # (schema_id, block_text, source_file)
    
    # Extract all schema blocks from all files
    for schema_file in all_schema_files:
        if schema_file.exists():
            print(f"Reading schemas from: {schema_file.name}")
            md = safe_read_text(schema_file)
            blocks = extract_schema_blocks_from_markdown(md)
            for schema_id, block_text in blocks:
                all_blocks.append((schema_id, block_text, schema_file.name))
    
    if not all_blocks:
        print("No schemas found to split.")
        return
    
    print(f"Found {len(all_blocks)} schemas total")
    
    # Categorize blocks by paper type
    paper1_blocks = []
    paper2_blocks = []
    mixed_blocks = []
    unknown_blocks = []
    
    for schema_id, block_text, source_file in all_blocks:
        # Get evidence from metadata
        meta = schemas_meta.get(schema_id, {})
        evidence_ids = meta.get("evidence", [])
        
        # Also check exemplar questions in the schema block itself
        parsed = parse_schema_block(block_text)
        exemplar_qids = [qid for qid, _ in parsed.get("exemplar_questions", [])]
        
        # Combine all question IDs
        all_qids = list(evidence_ids) + exemplar_qids
        
        # Determine paper type
        if all_qids:
            paper_type, is_mixed = get_tmua_paper_type_from_evidence_ids(all_qids)
            
            if is_mixed:
                mixed_blocks.append((schema_id, block_text, all_qids))
                print(f"  Mixed: {schema_id} (has both Paper 1 and Paper 2 evidence)")
            elif paper_type == "Paper1":
                paper1_blocks.append((schema_id, block_text))
                print(f"  Paper 1: {schema_id}")
            elif paper_type == "Paper2":
                paper2_blocks.append((schema_id, block_text))
                print(f"  Paper 2: {schema_id}")
            else:
                # Unknown - check prefix
                if schema_id.startswith("M"):
                    paper1_blocks.append((schema_id, block_text))
                    print(f"  Paper 1 (by prefix): {schema_id}")
                elif schema_id.startswith("R"):
                    paper2_blocks.append((schema_id, block_text))
                    print(f"  Paper 2 (by prefix): {schema_id}")
                else:
                    unknown_blocks.append((schema_id, block_text))
                    print(f"  Unknown: {schema_id}")
        else:
            # No evidence - infer from prefix
            if schema_id.startswith("M"):
                paper1_blocks.append((schema_id, block_text))
                print(f"  Paper 1 (by prefix, no evidence): {schema_id}")
            elif schema_id.startswith("R"):
                paper2_blocks.append((schema_id, block_text))
                print(f"  Paper 2 (by prefix, no evidence): {schema_id}")
            else:
                unknown_blocks.append((schema_id, block_text))
                print(f"  Unknown (no evidence, no clear prefix): {schema_id}")
    
    # Handle mixed schemas - move to majority paper type and release questions from minority type
    released_questions = {"Paper1": [], "Paper2": []}
    
    for schema_id, block_text, evidence_ids in mixed_blocks:
        # Get metadata for this schema
        meta = schemas_meta.get(schema_id, {})
        all_evidence = meta.get("evidence", [])
        
        # Filter evidence by paper type
        paper1_evidence = [qid for qid in all_evidence if "PAPER1" in str(qid).upper() or "PAPER 1" in str(qid).upper() or "_PAPER1" in str(qid).upper()]
        paper2_evidence = [qid for qid in all_evidence if "PAPER2" in str(qid).upper() or "PAPER 2" in str(qid).upper() or "_PAPER2" in str(qid).upper()]
        
        paper1_count = len(paper1_evidence)
        paper2_count = len(paper2_evidence)
        
        if paper1_count >= paper2_count:
            paper1_blocks.append((schema_id, block_text))
            print(f"  Mixed -> Paper 1 (majority): {schema_id}")
            # Update metadata to only have Paper 1 evidence
            if schema_id in schemas_meta:
                schemas_meta[schema_id]["evidence"] = paper1_evidence
            # Release Paper 2 questions for reuse
            released_questions["Paper2"].extend(paper2_evidence)
        else:
            paper2_blocks.append((schema_id, block_text))
            print(f"  Mixed -> Paper 2 (majority): {schema_id}")
            # Update metadata to only have Paper 2 evidence
            if schema_id in schemas_meta:
                schemas_meta[schema_id]["evidence"] = paper2_evidence
            # Release Paper 1 questions for reuse
            released_questions["Paper1"].extend(paper1_evidence)
    
    # Handle unknown blocks
    for schema_id, block_text in unknown_blocks:
        if schema_id.startswith("M") or not schema_id.startswith("R"):
            paper1_blocks.append((schema_id, block_text))
            print(f"  Unknown -> Paper 1 (default): {schema_id}")
        else:
            paper2_blocks.append((schema_id, block_text))
            print(f"  Unknown -> Paper 2 (default): {schema_id}")
    
    # Write Paper 1 schemas
    paper1_content = "# TMUA Paper 1 Schemas (Mathematical Knowledge)\n\n"
    for schema_id, block_text in paper1_blocks:
        paper1_content += block_text + "\n\n"
    
    # Write Paper 2 schemas
    paper2_content = "# TMUA Paper 2 Schemas (Mathematical Reasoning)\n\n"
    for schema_id, block_text in paper2_blocks:
        paper2_content += block_text + "\n\n"
    
    # Ensure files exist
    TMUA_PAPER1_SCHEMAS_MD.parent.mkdir(parents=True, exist_ok=True)
    TMUA_PAPER2_SCHEMAS_MD.parent.mkdir(parents=True, exist_ok=True)
    
    # Write to files
    safe_write_text(TMUA_PAPER1_SCHEMAS_MD, paper1_content)
    safe_write_text(TMUA_PAPER2_SCHEMAS_MD, paper2_content)
    
    # Delete legacy file if it exists
    legacy_file = SCHEMAS_DIR_DEFAULT / "Schemas_TMUA.md"
    if legacy_file.exists() and legacy_file != TMUA_PAPER1_SCHEMAS_MD and legacy_file != TMUA_PAPER2_SCHEMAS_MD:
        print(f"\nRemoving legacy file: {legacy_file.name}")
        legacy_file.unlink()
    
    # Save updated metadata (with filtered evidence for mixed schemas)
    save_schemas_meta(schemas_meta)
    
    # Remove released questions from used_questions tracking so they can be reused
    released_total = 0
    if released_questions["Paper1"] or released_questions["Paper2"]:
        used_qids = load_used_questions()
        for paper_type, qids in released_questions.items():
            for qid in qids:
                if qid in used_qids:
                    used_qids.remove(qid)
                    released_total += 1
        if released_total > 0:
            save_used_questions(used_qids)
            print(f"\n[SPLIT] Released {released_total} questions from mixed schemas for reuse")
            print(f"  - Paper 1 questions released: {len(released_questions['Paper1'])}")
            print(f"  - Paper 2 questions released: {len(released_questions['Paper2'])}")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"Split complete!")
    print(f"  Paper 1: {len(paper1_blocks)} schemas -> {TMUA_PAPER1_SCHEMAS_MD.name}")
    print(f"  Paper 2: {len(paper2_blocks)} schemas -> {TMUA_PAPER2_SCHEMAS_MD.name}")
    print(f"  Mixed: {len(mixed_blocks)} schemas (assigned to majority paper type)")
    print(f"  Unknown: {len(unknown_blocks)} schemas (assigned by default)")
    if released_total > 0:
        print(f"  Questions released for reuse: {released_total}")
    print(f"{'='*60}")


if __name__ == "__main__":
    split_tmua_schemas()

