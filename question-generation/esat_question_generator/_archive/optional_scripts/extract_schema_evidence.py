#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract Evidence Questions for Schemas

This script:
1. Parses Schemas.md to find which schemas have TMUA evidence
2. Loads the papers_index.json from schema_generator cache
3. Matches question IDs to actual question text
4. Creates a JSON file mapping schemas to their evidence questions

Output: schema_evidence.json
Format:
{
  "M1": {
    "title": "Hidden Proportionality / Scaling",
    "evidence_questions": [
      {
        "id": "TMUA_Paper1_2021_Q5",
        "text": "...",
        "year": "2021",
        "exam": "TMUA"
      }
    ]
  }
}
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def parse_schemas_with_evidence(schemas_md_path: Path) -> Dict[str, Dict]:
    """Parse Schemas.md and extract schema info."""
    with open(schemas_md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to match schema headers: ## **M1. Title** or ## **M_a1b2c3d4. Title**
    # Support both sequential (M1) and unique (M_a1b2c3d4) formats
    schema_pattern = re.compile(r'^##\s+\*\*([MPBC](?:\d+|_[a-f0-9]{8}))\.?\s+(.+?)\*\*\s*$', re.MULTILINE)
    
    schemas = {}
    matches = list(schema_pattern.finditer(content))
    
    for i, match in enumerate(matches):
        schema_id = match.group(1)
        title = match.group(2).strip()
        
        # Get content between this schema and the next
        start = match.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        schema_content = content[start:end]
        
        schemas[schema_id] = {
            "title": title,
            "content": schema_content,
            "has_evidence": False,
            "evidence_ids": []
        }
    
    return schemas

def load_question_index(index_path: Path) -> Dict[str, Dict]:
    """Load papers_index.json and create a lookup by question ID."""
    with open(index_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    # Create lookup: question_id -> question_data
    lookup = {}
    for q in questions:
        # Generate question ID: EXAM_Section_YEAR_Qnum
        exam = q.get("exam", "UNKNOWN")
        section = q.get("section", "").replace(" ", "")
        year = q.get("year", "UNK")
        qnum = q.get("qnum", 0)
        
        qid = f"{exam}_{section}_{year}_Q{qnum}"
        lookup[qid] = q
    
    return lookup

def load_schema_coverage(coverage_path: Path) -> Dict[str, Dict]:
    """Load schema_coverage.json to see which schemas have evidence."""
    with open(coverage_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_evidence_for_schemas(schemas: Dict, question_lookup: Dict, 
                                 coverage: Dict) -> Dict[str, Dict]:
    """Match schemas to their evidence questions."""
    result = {}
    
    for schema_id, schema_info in schemas.items():
        if schema_id not in coverage:
            continue
        
        # Check if schema has evidence
        schema_count = coverage[schema_id].get("total", 0)
        if schema_count == 0:
            continue
        
        # Try to find evidence questions
        # Evidence questions should match pattern: TMUA_Paper1_YEAR_Q#
        evidence_questions = []
        
        # Search through question lookup for questions that might match this schema
        # We'll need to check the schema_coverage by_paper data or use another method
        # For now, let's mark schemas that have coverage
        
        result[schema_id] = {
            "title": schema_info["title"],
            "has_evidence": schema_count > 0,
            "evidence_count": schema_count,
            "evidence_questions": evidence_questions  # Will be populated by manual mapping
        }
    
    return result

def main():
    base_dir = Path(__file__).parent
    
    # Paths
    schemas_md = base_dir / "Schemas.md"
    index_json = base_dir.parent / "schema_generator" / "_cache" / "papers_index.json"
    coverage_json = base_dir.parent / "schema_generator" / "_cache" / "schema_coverage.json"
    output_json = base_dir / "schema_evidence.json"
    
    # Check files exist
    if not schemas_md.exists():
        print(f"Error: Schemas.md not found at {schemas_md}")
        return
    
    if not index_json.exists():
        print(f"Error: papers_index.json not found at {index_json}")
        print("Run the schema generator tool first to build the index.")
        return
    
    if not coverage_json.exists():
        print(f"Error: schema_coverage.json not found at {coverage_json}")
        print("No schema coverage data available.")
        return
    
    print("📖 Parsing Schemas.md...")
    schemas = parse_schemas_with_evidence(schemas_md)
    print(f"   Found {len(schemas)} schemas")
    
    print("📚 Loading question index...")
    question_lookup = load_question_index(index_json)
    print(f"   Found {len(question_lookup)} questions")
    
    print("📊 Loading schema coverage...")
    coverage = load_schema_coverage(coverage_json)
    print(f"   Found {len(coverage)} schemas with evidence")
    
    print("🔗 Matching schemas to evidence questions...")
    evidence_data = extract_evidence_for_schemas(schemas, question_lookup, coverage)
    
    # Save results
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(evidence_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Saved evidence mapping to: {output_json}")
    
    # Print summary
    schemas_with_evidence = sum(1 for s in evidence_data.values() if s["has_evidence"])
    total_evidence = sum(s["evidence_count"] for s in evidence_data.values())
    
    print(f"\n📈 Summary:")
    print(f"   Schemas with evidence: {schemas_with_evidence}/{len(schemas)}")
    print(f"   Total evidence questions: {total_evidence}")
    print(f"\n   Top schemas by evidence count:")
    sorted_schemas = sorted(evidence_data.items(), 
                           key=lambda x: x[1]["evidence_count"], 
                           reverse=True)
    for schema_id, info in sorted_schemas[:10]:
        if info["evidence_count"] > 0:
            print(f"     {schema_id}: {info['evidence_count']} questions - {info['title']}")

if __name__ == "__main__":
    main()


























