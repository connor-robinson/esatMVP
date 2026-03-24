#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sort Schemas by Number of Exemplar Questions

Sorts schemas in Schemas_ESAT.md by the number of real NSAA/ENGAA exemplar questions.
Schemas with exactly 4 exemplars are sorted first, then by count descending.

Only counts questions that start with NSAA_ or ENGAA_ (real exam questions).
"""

import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

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
    
    # Split by schema separators (---)
    # But we need to be careful because --- appears in multiple places
    # Better approach: find all schema headers and extract blocks
    
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


def sort_schemas(schemas: List[Tuple[str, str, int]]) -> List[Tuple[str, str, int]]:
    """
    Sort schemas:
    1. First: schemas with exactly 4 exemplars (sorted by schema_id)
    2. Then: all others sorted by exemplar count descending, then by schema_id
    """
    schemas_with_4 = []
    other_schemas = []
    
    for schema_id, schema_text, count in schemas:
        if count == 4:
            schemas_with_4.append((schema_id, schema_text, count))
        else:
            other_schemas.append((schema_id, schema_text, count))
    
    # Sort schemas_with_4 by schema_id (alphabetically)
    schemas_with_4.sort(key=lambda x: x[0])
    
    # Sort other_schemas by count descending, then by schema_id
    other_schemas.sort(key=lambda x: (-x[2], x[0]))
    
    return schemas_with_4 + other_schemas


def main():
    script_dir = Path(__file__).parent
    qgen_root = script_dir.parent
    schemas_file = qgen_root / "esat_question_generator" / "schemas" / "Schemas_ESAT.md"
    
    if not schemas_file.exists():
        print(f"Error: Schemas file not found at {schemas_file}")
        sys.exit(1)
    
    print(f"Reading schemas from {schemas_file}...")
    content = schemas_file.read_text(encoding="utf-8")
    
    # Parse all schemas
    print("Parsing schemas...")
    schemas = parse_schema_blocks(content)
    print(f"Found {len(schemas)} schemas")
    
    # Count exemplars for each
    print("\nExemplar counts (NSAA/ENGAA only):")
    for schema_id, _, count in schemas:
        print(f"  {schema_id}: {count} exemplars")
    
    # Sort schemas
    print("\nSorting schemas...")
    sorted_schemas = sort_schemas(schemas)
    
    # Count how many have 4 exemplars
    schemas_with_4 = sum(1 for _, _, count in sorted_schemas if count == 4)
    print(f"\nSchemas with exactly 4 exemplars: {schemas_with_4}")
    print(f"Total schemas: {len(sorted_schemas)}")
    
    # Reconstruct the file
    print("\nReconstructing file...")
    
    # Preserve the header
    header_lines = []
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith("## **"):
            break
        header_lines.append(line)
    
    # Build new content
    new_lines = header_lines.copy()
    new_lines.append("")  # Empty line after header
    
    for i, (schema_id, schema_text, count) in enumerate(sorted_schemas):
        if i > 0:
            new_lines.append("")  # Empty line between schemas
            new_lines.append("---")  # Separator
            new_lines.append("")
        
        # Add schema text
        new_lines.append(schema_text)
    
    new_content = "\n".join(new_lines)
    
    # Write back to file
    print(f"\nWriting sorted schemas to {schemas_file}...")
    schemas_file.write_text(new_content, encoding="utf-8")
    
    print("\n✅ Done! Schemas sorted by exemplar count.")
    print(f"   - {schemas_with_4} schemas with exactly 4 exemplars (sorted first)")
    print(f"   - {len(sorted_schemas) - schemas_with_4} other schemas (sorted by count descending)")


if __name__ == "__main__":
    main()






















