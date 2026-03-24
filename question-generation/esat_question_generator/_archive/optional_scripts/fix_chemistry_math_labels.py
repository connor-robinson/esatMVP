#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix Chemistry Questions Labeled as Math

This script identifies and fixes questions in the database where:
1. Chemistry questions (primary_tag starts with "chemistry-") have Math schema_id (starts with "M")
2. Math questions (primary_tag starts with "M1-" or "M2-") have Chemistry schema_id (starts with "C")

Usage:
    python fix_chemistry_math_labels.py [--dry-run] [--fix]

Options:
    --dry-run: Only identify problems, don't fix them
    --fix: Actually update the database (default is dry-run)
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    from supabase import create_client, Client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    print("Error: supabase-py not installed. Install with: pip install supabase")
    sys.exit(1)


def load_env():
    """Load environment variables from .env.local"""
    base_dir = Path(__file__).parent
    project_root = base_dir.parent.parent
    env_path = project_root / ".env.local"
    
    if env_path.exists():
        load_dotenv(env_path)
    else:
        print(f"Warning: .env.local not found at {env_path}")
        print("Using system environment variables")


def get_supabase_client() -> Optional[Client]:
    """Initialize Supabase client"""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        return None
    
    try:
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Error creating Supabase client: {e}")
        return None


def find_mismatched_questions(client: Client) -> List[Dict[str, Any]]:
    """
    Find questions where schema_id and primary_tag don't match.
    
    Returns list of questions with mismatches.
    """
    print("Searching for mismatched questions...")
    
    # Get all questions with primary_tag
    response = client.table("ai_generated_questions").select(
        "id, generation_id, schema_id, primary_tag, paper, question_stem, difficulty, status"
    ).not_.is_("primary_tag", "null").execute()
    
    if not response.data:
        print("No questions found with primary_tag")
        return []
    
    mismatched = []
    
    for q in response.data:
        schema_id = q.get("schema_id", "")
        primary_tag = q.get("primary_tag", "")
        
        if not schema_id or not primary_tag:
            continue
        
        schema_prefix = schema_id[0].upper() if schema_id else ""
        tag_prefix = primary_tag.split("-")[0].upper() if "-" in primary_tag else ""
        
        # Check for mismatches
        is_mismatch = False
        issue_type = None
        suggested_schema = None
        
        # Case 1: Math schema (M) but Chemistry tag (chemistry-)
        if schema_prefix == "M" and tag_prefix == "CHEMISTRY":
            is_mismatch = True
            issue_type = "Math schema with Chemistry tag"
            # Suggest a Chemistry schema - we'll need to find an appropriate one
            suggested_schema = "C?"  # Placeholder - would need to find actual C schema
        
        # Case 2: Chemistry schema (C) but Math tag (M1- or M2-)
        elif schema_prefix == "C" and (tag_prefix == "M1" or tag_prefix == "M2"):
            is_mismatch = True
            issue_type = "Chemistry schema with Math tag"
            suggested_schema = "M?"  # Placeholder - would need to find actual M schema
        
        # Case 3: Math schema (M) but Biology tag (biology-)
        elif schema_prefix == "M" and tag_prefix == "BIOLOGY":
            is_mismatch = True
            issue_type = "Math schema with Biology tag"
            suggested_schema = "B?"
        
        # Case 4: Math schema (M) but Physics tag (P-)
        elif schema_prefix == "M" and tag_prefix == "P":
            is_mismatch = True
            issue_type = "Math schema with Physics tag"
            suggested_schema = "P?"
        
        if is_mismatch:
            mismatched.append({
                "id": q.get("id"),
                "generation_id": q.get("generation_id"),
                "schema_id": schema_id,
                "primary_tag": primary_tag,
                "paper": q.get("paper"),
                "issue_type": issue_type,
                "suggested_schema": suggested_schema,
                "question_preview": (q.get("question_stem", "") or "")[:100],
                "difficulty": q.get("difficulty"),
                "status": q.get("status")
            })
    
    return mismatched


def fix_question(client: Client, question_id: str, new_primary_tag: Optional[str] = None, 
                 new_schema_id: Optional[str] = None, new_paper: Optional[str] = None) -> bool:
    """
    Fix a single question by updating its tags/schema.
    
    Note: We can't easily change schema_id without knowing which C schema to use,
    so we'll focus on fixing the primary_tag to match the schema_id.
    """
    updates = {}
    
    if new_primary_tag:
        updates["primary_tag"] = new_primary_tag
        # Also update tags_labeled_by to indicate this was a fix
        updates["tags_labeled_by"] = "auto_fix_script"
    
    if new_paper is not None:
        updates["paper"] = new_paper
    
    # Note: We don't update schema_id because:
    # 1. It's a required field and we'd need to know which specific schema to use
    # 2. The schema_id represents what schema was used to generate the question
    # 3. The primary_tag is what matters for filtering/display
    
    if not updates:
        return False
    
    try:
        response = client.table("ai_generated_questions").update(updates).eq("id", question_id).execute()
        return response.data is not None and len(response.data) > 0
    except Exception as e:
        print(f"  Error updating question {question_id}: {e}")
        return False


def determine_correct_tag(schema_id: str, current_tag: str) -> Optional[str]:
    """
    Determine the correct primary_tag based on schema_id.
    
    Since we can't easily change schema_id, we'll fix the tag to match the schema.
    But if the question is clearly chemistry (has chemistry tag), we should note
    that the schema_id is wrong and the question needs to be regenerated.
    """
    schema_prefix = schema_id[0].upper() if schema_id else ""
    tag_prefix = current_tag.split("-")[0].upper() if "-" in current_tag else ""
    
    # If schema is M but tag is chemistry, the question is actually chemistry
    # We can't fix this automatically - the question needs to be regenerated with a C schema
    # But we can at least clear the wrong tag
    if schema_prefix == "M" and tag_prefix == "CHEMISTRY":
        # Question is chemistry but was generated with Math schema
        # Return None to indicate this needs manual review
        return None
    
    # If schema is C but tag is M1/M2, fix the tag to match a chemistry tag
    # But we don't know which specific chemistry tag - would need classifier
    if schema_prefix == "C" and (tag_prefix == "M1" or tag_prefix == "M2"):
        # Question is Math but was generated with Chemistry schema
        # Return None to indicate this needs manual review
        return None
    
    return None  # Default: needs manual review


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Fix chemistry questions labeled as math")
    parser.add_argument("--dry-run", action="store_true", help="Only identify problems, don't fix")
    parser.add_argument("--fix", action="store_true", help="Actually update the database")
    args = parser.parse_args()
    
    load_env()
    
    if not _SUPABASE_AVAILABLE:
        print("Error: Supabase library not available")
        sys.exit(1)
    
    client = get_supabase_client()
    if not client:
        sys.exit(1)
    
    mismatched = find_mismatched_questions(client)
    
    if not mismatched:
        print("\n✅ No mismatched questions found!")
        return
    
    print(f"\n⚠️  Found {len(mismatched)} mismatched questions:\n")
    
    # Group by issue type
    by_issue = {}
    for q in mismatched:
        issue = q["issue_type"]
        if issue not in by_issue:
            by_issue[issue] = []
        by_issue[issue].append(q)
    
    for issue_type, questions in by_issue.items():
        print(f"\n{issue_type}: {len(questions)} questions")
        print("-" * 80)
        for q in questions[:5]:  # Show first 5
            print(f"  ID: {q['id'][:8]}...")
            print(f"  Schema: {q['schema_id']} → Tag: {q['primary_tag']}")
            print(f"  Status: {q['status']}, Difficulty: {q['difficulty']}")
            print(f"  Preview: {q['question_preview']}...")
            print()
        if len(questions) > 5:
            print(f"  ... and {len(questions) - 5} more")
    
    if args.dry_run or not args.fix:
        print("\n🔍 DRY RUN MODE - No changes made")
        print("   Run with --fix to actually update the database")
        print("\n⚠️  WARNING: These questions may need to be regenerated with the correct schema.")
        print("   Simply updating the tag may not be sufficient if the question content")
        print("   doesn't match the schema that was used to generate it.")
        return
    
    print("\n🔧 FIX MODE - Updating questions...")
    print("\n⚠️  WARNING: This script can only fix the primary_tag to match the schema_id.")
    print("   Questions where the schema_id itself is wrong (e.g., chemistry question")
    print("   generated with Math schema) should be regenerated, not just re-tagged.")
    print()
    
    response = input("Continue with fixes? (yes/no): ")
    if response.lower() != "yes":
        print("Cancelled.")
        return
    
    fixed_count = 0
    needs_regen_count = 0
    
    for q in mismatched:
        schema_id = q["schema_id"]
        current_tag = q["primary_tag"]
        schema_prefix = schema_id[0].upper()
        tag_prefix = current_tag.split("-")[0].upper() if "-" in current_tag else ""
        
        # Cases where we can't auto-fix (need regeneration):
        # 1. Math schema but Chemistry tag - question is chemistry, needs C schema
        # 2. Chemistry schema but Math tag - question is math, needs M schema
        if (schema_prefix == "M" and tag_prefix == "CHEMISTRY") or \
           (schema_prefix == "C" and (tag_prefix == "M1" or tag_prefix == "M2")):
            print(f"  ⚠️  {q['id'][:8]}... - Needs regeneration (schema mismatch)")
            needs_regen_count += 1
            # Mark as needs_revision
            try:
                client.table("ai_generated_questions").update({
                    "status": "needs_revision",
                    "review_notes": f"Schema mismatch: {q['issue_type']}. Question needs to be regenerated with correct schema."
                }).eq("id", q["id"]).execute()
            except Exception as e:
                print(f"    Error marking for revision: {e}")
            continue
        
        # For other cases, we could potentially fix, but for safety, mark for review
        print(f"  ⚠️  {q['id'][:8]}... - Marked for manual review")
        try:
            client.table("ai_generated_questions").update({
                "status": "needs_revision",
                "review_notes": f"Tag mismatch detected: {q['issue_type']}. Please review and correct."
            }).eq("id", q["id"]).execute()
        except Exception as e:
            print(f"    Error marking for review: {e}")
    
    print(f"\n✅ Processed {len(mismatched)} questions:")
    print(f"   - {needs_regen_count} marked as 'needs_revision' (require regeneration)")
    print(f"   - {len(mismatched) - needs_regen_count} marked for manual review")


if __name__ == "__main__":
    main()























