#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Filter Top Schemas by Exemplar Count

Filters schemas to only keep those with 3 or more NSAA/ENGAA exemplar questions.
Writes the filtered schemas to a new file.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# Support both sequential (M1) and unique (M_a1b2c3d4) formats
SCHEMA_HEADER_RE = re.compile(r"^##\s+\*\*(([MPBCR])(?:\d+|_[a-f0-9]{8}))\.?\s*(.+?)\*\*\s*$", re.MULTILINE)


def extract_exemplar_questions(schema_text: str) -> List[str]:
    """
    Extract exemplar question IDs from a schema block.
    Only returns questions that start with NSAA_ or ENGAA_.
    """
    exemplars = []
    
    # Find the "Exemplar questions:" section
    lines = schema_text.splitlines()
    in_exemplar_section = False
    
    for i, line in enumerate(lines):
        # Check if we're entering the exemplar section
        if "exemplar questions" in line.lower() and ":" in line:
            in_exemplar_section = True
            continue
        
        # If we hit another section header or schema separator, stop
        if in_exemplar_section:
            # Check for section headers (Core move, Seen in, etc.)
            if line.strip().startswith("**") and line.strip().endswith("**"):
                if "exemplar" not in line.lower():
                    break
            
            # Check for schema separator
            if line.strip() == "---" and i > 0:
                # Make sure we're not at the start of a schema
                prev_lines = "\n".join(lines[max(0, i-5):i])
                if "## **" in prev_lines:
                    break
            
            # Extract question IDs from lines like: - `NSAA_Section1_2016_Q1`: justification
            # Pattern: - `QUESTION_ID`: justification
            match = re.search(r"-\s*`([^`]+)`", line)
            if match:
                question_id = match.group(1).strip()
                # Only count NSAA or ENGAA questions
                if question_id.startswith("NSAA_") or question_id.startswith("ENGAA_"):
                    exemplars.append(question_id)
    
    return exemplars


def parse_schema_blocks(content: str) -> List[Tuple[str, str, int]]:
    """
    Parse all schema blocks from the markdown content.
    Returns list of (schema_id, full_schema_text, exemplar_count) tuples.
    """
    schemas = []
    
    lines = content.splitlines()
    i = 0
    
    while i < len(lines):
        # Look for schema header
        header_match = None
        header_line_idx = None
        
        for j in range(i, len(lines)):
            line = lines[j].strip()
            # Check for schema header
            if line.startswith("## **"):
                header_match = SCHEMA_HEADER_RE.match(line)
                if header_match:
                    header_line_idx = j
                    break
        
        if not header_match or header_line_idx is None:
            break
        
        schema_id = header_match.group(1)
        # Find the end of this schema (next schema header or end of file)
        start_idx = header_line_idx
        end_idx = len(lines)
        
        # Look for next schema header
        for j in range(header_line_idx + 1, len(lines)):
            line = lines[j].strip()
            if line.startswith("## **"):
                # Check if it's a real schema header (not just markdown code block)
                if SCHEMA_HEADER_RE.match(line):
                    end_idx = j
                    break
        
        # Extract schema block
        schema_lines = lines[start_idx:end_idx]
        schema_text = "\n".join(schema_lines)
        
        # Count exemplar questions
        exemplars = extract_exemplar_questions(schema_text)
        exemplar_count = len(exemplars)
        
        schemas.append((schema_id, schema_text, exemplar_count))
        
        i = end_idx
    
    return schemas


def main():
    script_dir = Path(__file__).parent
    qgen_root = script_dir.parent
    schemas_file = qgen_root / "esat_question_generator" / "schemas" / "Schemas_ESAT.md"
    output_file = qgen_root / "esat_question_generator" / "schemas" / "Schemas_ESAT_Top.md"
    
    if not schemas_file.exists():
        print(f"Error: Schemas file not found at {schemas_file}")
        sys.exit(1)
    
    print(f"Reading schemas from {schemas_file}...")
    content = schemas_file.read_text(encoding="utf-8")
    
    # Parse all schemas
    print("Parsing schemas...")
    schemas = parse_schema_blocks(content)
    print(f"Found {len(schemas)} total schemas")
    
    # Filter to only keep schemas with 2+ NSAA/ENGAA exemplars
    print("\nFiltering schemas with 2+ NSAA/ENGAA exemplars...")
    filtered_schemas = [(sid, text, count) for sid, text, count in schemas if count >= 2]
    
    print(f"\n✅ Found {len(filtered_schemas)} schemas with 2+ NSAA/ENGAA exemplars")
    
    # Show breakdown by count
    count_breakdown = {}
    for _, _, count in filtered_schemas:
        count_breakdown[count] = count_breakdown.get(count, 0) + 1
    
    print("\nBreakdown by exemplar count:")
    for count in sorted(count_breakdown.keys(), reverse=True):
        print(f"  {count} exemplars: {count_breakdown[count]} schemas")
    
    # Build new content
    print("\nBuilding filtered file...")
    
    # Preserve the header
    header_lines = []
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith("## **"):
            break
        header_lines.append(line)
    
    # Build new content with filtered schemas
    new_lines = header_lines.copy()
    new_lines.append("")  # Empty line after header
    new_lines.append("<!-- Filtered: Only schemas with 2+ NSAA/ENGAA exemplar questions -->")
    new_lines.append("")  # Empty line
    
    for i, (schema_id, schema_text, count) in enumerate(filtered_schemas):
        if i > 0:
            new_lines.append("")  # Empty line between schemas
            new_lines.append("---")  # Separator
            new_lines.append("")
        
        # Add schema text
        new_lines.append(schema_text)
    
    new_content = "\n".join(new_lines)
    
    # Write to new file
    print(f"\nWriting filtered schemas to {output_file}...")
    output_file.write_text(new_content, encoding="utf-8")
    
    print(f"\n✅ Done! Created {output_file}")
    print(f"   - {len(filtered_schemas)} schemas with 2+ NSAA/ENGAA exemplars")
    print(f"   - {len(schemas) - len(filtered_schemas)} schemas filtered out")


if __name__ == "__main__":
    main()

