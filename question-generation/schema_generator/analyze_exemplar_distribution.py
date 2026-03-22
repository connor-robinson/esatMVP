#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analyze Exemplar Distribution

Shows how many schemas have how many NSAA/ENGAA exemplars.
"""

import re
import sys
from pathlib import Path
from collections import Counter

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*(([MPBCR])(?:\d+|_[a-f0-9]{8}))\.?\s*(.+?)\*\*\s*$", re.MULTILINE)


def extract_exemplar_questions(schema_text: str) -> tuple:
    """
    Extract exemplar question IDs from a schema block.
    Returns (nsaa_engaa_count, total_count, all_questions)
    """
    nsaa_engaa = []
    all_questions = []
    
    lines = schema_text.splitlines()
    in_exemplar_section = False
    
    for i, line in enumerate(lines):
        if "exemplar questions" in line.lower() and ":" in line:
            in_exemplar_section = True
            continue
        
        if in_exemplar_section:
            if line.strip().startswith("**") and line.strip().endswith("**"):
                if "exemplar" not in line.lower():
                    break
            
            if line.strip() == "---" and i > 0:
                prev_lines = "\n".join(lines[max(0, i-5):i])
                if "## **" in prev_lines:
                    break
            
            match = re.search(r"-\s*`([^`]+)`", line)
            if match:
                question_id = match.group(1).strip()
                all_questions.append(question_id)
                if question_id.startswith("NSAA_") or question_id.startswith("ENGAA_"):
                    nsaa_engaa.append(question_id)
    
    return (len(nsaa_engaa), len(all_questions), all_questions)


def parse_schema_blocks(content: str):
    """Parse all schema blocks and return statistics."""
    schemas = []
    lines = content.splitlines()
    i = 0
    
    while i < len(lines):
        header_match = None
        header_line_idx = None
        
        for j in range(i, len(lines)):
            line = lines[j].strip()
            if line.startswith("## **"):
                header_match = SCHEMA_HEADER_RE.match(line)
                if header_match:
                    header_line_idx = j
                    break
        
        if not header_match or header_line_idx is None:
            break
        
        schema_id = header_match.group(1)
        start_idx = header_line_idx
        end_idx = len(lines)
        
        for j in range(header_line_idx + 1, len(lines)):
            line = lines[j].strip()
            if line.startswith("## **"):
                if SCHEMA_HEADER_RE.match(line):
                    end_idx = j
                    break
        
        schema_lines = lines[start_idx:end_idx]
        schema_text = "\n".join(schema_lines)
        
        nsaa_count, total_count, all_questions = extract_exemplar_questions(schema_text)
        schemas.append((schema_id, nsaa_count, total_count, all_questions))
        
        i = end_idx
    
    return schemas


def main():
    script_dir = Path(__file__).parent
    qgen_root = script_dir.parent
    schemas_file = qgen_root / "esat_question_generator" / "schemas" / "Schemas_ESAT.md"
    
    if not schemas_file.exists():
        print(f"Error: Schemas file not found at {schemas_file}")
        sys.exit(1)
    
    print(f"Reading schemas from {schemas_file}...")
    content = schemas_file.read_text(encoding="utf-8")
    
    print("Parsing schemas...")
    schemas = parse_schema_blocks(content)
    print(f"Found {len(schemas)} total schemas\n")
    
    # Count distribution
    nsaa_count_dist = Counter()
    total_count_dist = Counter()
    schemas_with_fake = 0
    
    for schema_id, nsaa_count, total_count, all_questions in schemas:
        nsaa_count_dist[nsaa_count] += 1
        total_count_dist[total_count] += 1
        
        # Check for fake questions
        has_fake = any(
            q.startswith(("Fake_", "Example_", "SIMULATED", "random_example", "Generic_"))
            for q in all_questions
        )
        if has_fake:
            schemas_with_fake += 1
    
    print("Distribution of NSAA/ENGAA exemplar counts per schema:")
    print("-" * 50)
    for count in sorted(nsaa_count_dist.keys(), reverse=True):
        num_schemas = nsaa_count_dist[count]
        percentage = (num_schemas / len(schemas)) * 100
        print(f"  {count} NSAA/ENGAA exemplars: {num_schemas:4d} schemas ({percentage:5.1f}%)")
    
    print(f"\nDistribution of TOTAL exemplar counts per schema:")
    print("-" * 50)
    for count in sorted(total_count_dist.keys(), reverse=True):
        num_schemas = total_count_dist[count]
        percentage = (num_schemas / len(schemas)) * 100
        print(f"  {count} total exemplars: {num_schemas:4d} schemas ({percentage:5.1f}%)")
    
    print(f"\nSchemas with fake/example questions: {schemas_with_fake} ({schemas_with_fake/len(schemas)*100:.1f}%)")
    
    # Show some examples
    print("\n\nSample schemas with different counts:")
    print("-" * 50)
    
    # Find examples
    examples_0 = [s for s in schemas if s[1] == 0][:3]
    examples_1 = [s for s in schemas if s[1] == 1][:3]
    examples_2 = [s for s in schemas if s[1] == 2][:3]
    examples_3 = [s for s in schemas if s[1] >= 3][:3]
    
    if examples_0:
        print("\nSchemas with 0 NSAA/ENGAA exemplars:")
        for sid, nsaa, total, questions in examples_0:
            print(f"  {sid}: {total} total exemplars - {questions[:3]}")
    
    if examples_1:
        print("\nSchemas with 1 NSAA/ENGAA exemplar:")
        for sid, nsaa, total, questions in examples_1:
            nsaa_qs = [q for q in questions if q.startswith(("NSAA_", "ENGAA_"))]
            print(f"  {sid}: {total} total ({len(nsaa_qs)} NSAA/ENGAA) - {nsaa_qs}")
    
    if examples_2:
        print("\nSchemas with 2 NSAA/ENGAA exemplars:")
        for sid, nsaa, total, questions in examples_2:
            nsaa_qs = [q for q in questions if q.startswith(("NSAA_", "ENGAA_"))]
            print(f"  {sid}: {total} total ({len(nsaa_qs)} NSAA/ENGAA) - {nsaa_qs}")
    
    if examples_3:
        print("\nSchemas with 3+ NSAA/ENGAA exemplars:")
        for sid, nsaa, total, questions in examples_3:
            nsaa_qs = [q for q in questions if q.startswith(("NSAA_", "ENGAA_"))]
            print(f"  {sid}: {total} total ({len(nsaa_qs)} NSAA/ENGAA) - {nsaa_qs}")


if __name__ == "__main__":
    main()






















