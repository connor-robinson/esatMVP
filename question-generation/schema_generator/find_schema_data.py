#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick script to find all data related to a schema ID.
Usage: python find_schema_data.py M_b505df7a
"""

import json
import sys
import io
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, List

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Paths (matching schemagenerator.py)
CACHE_DIR_DEFAULT = Path(__file__).parent.parent / "esat_question_generator" / "schemas" / "_cache"
SCHEMAS_MD_DEFAULT = Path(__file__).parent.parent / "esat_question_generator" / "schemas" / "Schemas_ESAT.md"
INDEX_JSON = CACHE_DIR_DEFAULT / "papers_index.json"
SCHEMAS_META_JSON = CACHE_DIR_DEFAULT / "schemas_meta.json"

@dataclass
class QuestionItem:
    paper_id: str
    pdf_path: str
    year: Optional[str]
    exam: Optional[str]
    section: Optional[str]
    qnum: int
    text: str
    skipped_diagram: bool

def safe_read_text(path: Path) -> str:
    """Safely read text file."""
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"[ERROR] Failed to read {path}: {e}")
        return ""

def find_question_by_id(question_id: str, index: List[QuestionItem]) -> Optional[QuestionItem]:
    """Find a question in the index by its ID."""
    for q in index:
        q_id = f"{q.exam}_{q.section}_{q.year}_Q{q.qnum}".replace(" ", "")
        if q_id == question_id:
            return q
    return None

def extract_schema_from_markdown(schema_id: str, md_content: str) -> Optional[str]:
    """Extract the full schema block from markdown."""
    lines = md_content.splitlines()
    in_schema = False
    schema_lines = []
    
    for i, line in enumerate(lines):
        if line.startswith("## **") and schema_id in line:
            in_schema = True
            schema_lines.append(line)
        elif in_schema:
            if line.strip() == "---":
                schema_lines.append(line)
                break
            schema_lines.append(line)
    
    return "\n".join(schema_lines) if schema_lines else None

def main(schema_id: str):
    print(f"\n{'='*80}")
    print(f"Finding all data for schema: {schema_id}")
    print(f"{'='*80}\n")
    
    # 1. Load metadata
    print("1. METADATA:")
    print("-" * 80)
    if not SCHEMAS_META_JSON.exists():
        print(f"[ERROR] Metadata file not found: {SCHEMAS_META_JSON}")
        return
    
    meta_data = json.loads(safe_read_text(SCHEMAS_META_JSON))
    if schema_id not in meta_data:
        print(f"[ERROR] Schema {schema_id} not found in metadata")
        return
    
    meta = meta_data[schema_id]
    print(json.dumps(meta, indent=2))
    print()
    
    # 2. Get question IDs (evidence)
    question_ids = meta.get("evidence", [])
    print(f"2. LINKED QUESTIONS ({len(question_ids)}):")
    print("-" * 80)
    for qid in question_ids:
        print(f"  - {qid}")
    print()
    
    # 3. Load schema content from markdown
    print("3. SCHEMA CONTENT:")
    print("-" * 80)
    if not SCHEMAS_MD_DEFAULT.exists():
        print(f"[ERROR] Schema markdown file not found: {SCHEMAS_MD_DEFAULT}")
    else:
        md_content = safe_read_text(SCHEMAS_MD_DEFAULT)
        schema_content = extract_schema_from_markdown(schema_id, md_content)
        if schema_content:
            print(schema_content)
        else:
            print(f"[WARNING] Schema {schema_id} not found in markdown file")
    print()
    
    # 4. Load question index and get actual question text
    print("4. ACTUAL QUESTION TEXT:")
    print("-" * 80)
    if not INDEX_JSON.exists():
        print(f"[ERROR] Index file not found: {INDEX_JSON}")
        print(f"       Run 'Index PDFs' in the schema generator first")
        return
    
    index_data = json.loads(safe_read_text(INDEX_JSON))
    index = [QuestionItem(**x) for x in index_data]
    
    for qid in question_ids:
        question = find_question_by_id(qid, index)
        if question:
            print(f"\n[{qid}]")
            print(f"  Exam: {question.exam}")
            print(f"  Section: {question.section}")
            print(f"  Year: {question.year}")
            print(f"  Question #: {question.qnum}")
            print(f"  PDF: {question.pdf_path}")
            print(f"  Skipped (diagram): {question.skipped_diagram}")
            print(f"\n  Question Text:")
            print(f"  {'-' * 76}")
            # Indent the question text (handle Unicode)
            for line in question.text.splitlines():
                try:
                    print(f"  {line}")
                except UnicodeEncodeError:
                    # Replace problematic characters
                    safe_line = line.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
                    print(f"  {safe_line}")
            print()
        else:
            print(f"[WARNING] Question {qid} not found in index")
    
    print(f"\n{'='*80}")
    print("Done!")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python find_schema_data.py <schema_id>")
        print("Example: python find_schema_data.py M_b505df7a")
        sys.exit(1)
    
    schema_id = sys.argv[1]
    main(schema_id)

