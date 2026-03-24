#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build Schema Examples from TMUA Evidence

This script:
1. Loads schema_coverage.json to see which questions belong to each schema
2. Loads papers_index.json to get actual question text
3. Creates a comprehensive mapping of schemas to their evidence questions
4. Optionally updates Schemas.md to include evidence sections

Usage:
    python build_schema_examples.py              # Just create JSON mapping
    python build_schema_examples.py --update-md  # Also update Schemas.md with evidence
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def load_question_index(index_path: Path) -> Dict[str, Dict]:
    """Load papers_index.json and create lookup by question ID."""
    print(f"Loading question index from: {index_path}")
    with open(index_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    # Create lookup: question_id -> question_data
    lookup = {}
    for q in questions:
        exam = q.get("exam", "UNKNOWN")
        section = q.get("section", "").replace(" ", "")
        year = q.get("year", "UNK")
        qnum = q.get("qnum", 0)
        
        # Try multiple ID formats
        qid1 = f"{exam}_{section}_{year}_Q{qnum}"
        qid2 = f"{exam}_Paper{section[-1]}_{year}_Q{qnum}" if section else qid1
        
        lookup[qid1] = q
        if qid2 != qid1:
            lookup[qid2] = q
    
    print(f"   Indexed {len(questions)} questions")
    return lookup

def load_decisions_log(log_dir: Path) -> Dict[str, List[str]]:
    """Load schema_decisions.jsonl to get schema-to-question mappings."""
    decisions_file = log_dir / "schema_decisions.jsonl"
    
    if not decisions_file.exists():
        print(f"⚠ No decisions log found at {decisions_file}")
        return {}
    
    schema_to_evidence = defaultdict(list)
    
    with open(decisions_file, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                decision = json.loads(line)
                if decision.get("action") == "accept_new":
                    candidate = decision.get("candidate", {})
                    schema_id = candidate.get("candidate_id", "")
                    evidence = candidate.get("evidence", [])
                    
                    if schema_id and evidence:
                        schema_to_evidence[schema_id].extend(evidence)
            except Exception as e:
                continue
    
    print(f"   Found evidence for {len(schema_to_evidence)} schemas from decisions log")
    return dict(schema_to_evidence)

def parse_schemas_md(schemas_path: Path) -> Dict[str, Dict]:
    """Parse Schemas.md to get schema titles."""
    with open(schemas_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Support both sequential (M1) and unique (M_a1b2c3d4) formats
    schema_pattern = re.compile(r'^##\s+\*\*([MPBC](?:\d+|_[a-f0-9]{8}))\.?\s+(.+?)\*\*\s*$', re.MULTILINE)
    schemas = {}
    
    for match in schema_pattern.finditer(content):
        schema_id = match.group(1)
        title = match.group(2).strip()
        schemas[schema_id] = {"title": title}
    
    print(f"   Parsed {len(schemas)} schemas")
    return schemas

def build_evidence_mapping(schemas: Dict, schema_to_evidence: Dict, 
                          question_lookup: Dict) -> Dict[str, Dict]:
    """Build comprehensive evidence mapping."""
    result = {}
    
    for schema_id, schema_info in schemas.items():
        evidence_ids = schema_to_evidence.get(schema_id, [])
        
        if not evidence_ids:
            continue
        
        evidence_questions = []
        for qid in evidence_ids:
            question_data = question_lookup.get(qid)
            if question_data:
                # Clean up question text
                text = question_data.get("text", "").strip()
                # Remove excessive whitespace and underscores
                text = re.sub(r'_+', '', text)
                text = re.sub(r'\n{3,}', '\n\n', text)
                text = text[:500]  # Truncate very long questions
                
                evidence_questions.append({
                    "id": qid,
                    "text": text,
                    "year": question_data.get("year"),
                    "exam": question_data.get("exam"),
                    "section": question_data.get("section"),
                    "qnum": question_data.get("qnum"),
                })
        
        if evidence_questions:
            result[schema_id] = {
                "title": schema_info["title"],
                "evidence_count": len(evidence_questions),
                "evidence_questions": evidence_questions
            }
    
    return result

def main():
    base_dir = Path(__file__).parent
    update_md = "--update-md" in sys.argv
    
    # Paths
    schemas_md = base_dir / "Schemas.md"
    index_json = base_dir.parent / "schema_generator" / "_cache" / "papers_index.json"
    log_dir = base_dir.parent / "schema_generator" / "_logs"
    output_json = base_dir / "schema_evidence.json"
    
    # Check files
    if not schemas_md.exists():
        print(f"✗ Schemas.md not found at {schemas_md}")
        return
    
    if not index_json.exists():
        print(f"✗ papers_index.json not found at {index_json}")
        return
    
    print("=" * 60)
    print("Building Schema Evidence Mapping")
    print("=" * 60)
    
    print("\n1. Parsing Schemas.md...")
    schemas = parse_schemas_md(schemas_md)
    
    print("\n2. Loading question index...")
    question_lookup = load_question_index(index_json)
    
    print("\n3. Loading schema-to-question mappings...")
    schema_to_evidence = load_decisions_log(log_dir)
    
    print("\n4. Building evidence mapping...")
    evidence_data = build_evidence_mapping(schemas, schema_to_evidence, question_lookup)
    
    # Save results
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(evidence_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Saved to: {output_json}")
    
    # Summary
    schemas_with_evidence = len(evidence_data)
    total_evidence = sum(s["evidence_count"] for s in evidence_data.values())
    
    print(f"\n{'='*60}")
    print("Summary:")
    print(f"{'='*60}")
    print(f"Schemas with evidence: {schemas_with_evidence}")
    print(f"Total evidence questions: {total_evidence}")
    
    if evidence_data:
        print(f"\nTop 15 schemas by evidence count:")
        sorted_schemas = sorted(evidence_data.items(), 
                               key=lambda x: x[1]["evidence_count"], 
                               reverse=True)
        for i, (schema_id, info) in enumerate(sorted_schemas[:15], 1):
            print(f"  {i:2d}. {schema_id:6s}: {info['evidence_count']:2d} questions - {info['title']}")
    
    if update_md:
        print("\n⚠ --update-md flag detected, but not implemented yet")
        print("   Use the JSON file to manually add evidence to schemas")

if __name__ == "__main__":
    main()


























