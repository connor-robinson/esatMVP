#!/usr/bin/env python3
"""
Wipe all ESAT schema data.

This script clears:
- Schemas_ESAT.md (clears content)
- All cache files (embeddings, metadata, coverage, etc.)
- All log files (candidates, decisions)
- PDF cache files
- Index file (if ESAT-only)
"""

import os
import sys
import json
from pathlib import Path

# Set mode to ESAT
os.environ["SCHEMA_MODE"] = "ESAT"

# Import after setting mode
sys.path.insert(0, str(Path(__file__).parent))
from schemagenerator import (
    SCHEMAS_MD_DEFAULT,
    SCHEMAS_META_JSON,
    SCHEMA_EMBEDDINGS_JSON,
    SCHEMA_COVERAGE_JSON,
    USED_QUESTIONS_JSON,
    DIAGRAM_OVERRIDES_JSON,
    INDEX_JSON,
    CANDIDATES_JSONL,
    DECISIONS_JSONL,
    PDF_CACHE_DIR,
    QuestionItem,
    safe_read_text,
)

def wipe_esat_data():
    """Wipe all ESAT schema data."""
    wiped_files = []
    
    print("Wiping all ESAT data...")
    print(f"Mode: ESAT")
    print()
    
    # Wipe schema file (clear content, keep file)
    if SCHEMAS_MD_DEFAULT.exists():
        SCHEMAS_MD_DEFAULT.write_text("# ESAT Schemas\n\n", encoding="utf-8")
        wiped_files.append(str(SCHEMAS_MD_DEFAULT))
        print(f"[OK] Cleared: {SCHEMAS_MD_DEFAULT.name}")
    
    # Wipe cache files
    cache_files = [
        ("Schema metadata", SCHEMAS_META_JSON),
        ("Schema embeddings", SCHEMA_EMBEDDINGS_JSON),
        ("Schema coverage", SCHEMA_COVERAGE_JSON),
        ("Used questions", USED_QUESTIONS_JSON),
        ("Diagram overrides", DIAGRAM_OVERRIDES_JSON),
    ]
    
    for name, cache_file in cache_files:
        if cache_file.exists():
            cache_file.unlink()
            wiped_files.append(str(cache_file))
            print(f"[OK] Deleted: {name} ({cache_file.name})")
    
    # Wipe index (only if ESAT-only)
    if INDEX_JSON.exists():
        try:
            data = json.loads(safe_read_text(INDEX_JSON))
            items = [QuestionItem(**x) for x in data]
            # Check if all questions are ESAT (not TMUA)
            if all(q.exam != "TMUA" for q in items if q.exam):
                INDEX_JSON.unlink()
                wiped_files.append(str(INDEX_JSON))
                print(f"[OK] Deleted: Index ({INDEX_JSON.name})")
            else:
                print(f"[SKIP] Skipped: Index contains TMUA questions (keeping index)")
        except Exception as e:
            # If we can't parse, wipe it anyway
            INDEX_JSON.unlink()
            wiped_files.append(str(INDEX_JSON))
            print(f"[OK] Deleted: Index ({INDEX_JSON.name}) - unparseable")
    
    # Wipe log files
    log_files = [
        ("Candidates log", CANDIDATES_JSONL),
        ("Decisions log", DECISIONS_JSONL),
    ]
    
    for name, log_file in log_files:
        if log_file.exists():
            log_file.unlink()
            wiped_files.append(str(log_file))
            print(f"[OK] Deleted: {name} ({log_file.name})")
    
    # Wipe PDF cache
    if PDF_CACHE_DIR.exists():
        pdf_cache_count = 0
        for cache_file in PDF_CACHE_DIR.glob("*.json"):
            cache_file.unlink()
            pdf_cache_count += 1
        if pdf_cache_count > 0:
            print(f"[OK] Deleted: {pdf_cache_count} PDF cache files")
    
    print()
    print(f"[OK] Wipe complete! Deleted/cleared {len(wiped_files)} files.")
    print()
    print("All ESAT schema data has been wiped.")
    print("You can now start fresh with schema generation.")

if __name__ == "__main__":
    try:
        wipe_esat_data()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
