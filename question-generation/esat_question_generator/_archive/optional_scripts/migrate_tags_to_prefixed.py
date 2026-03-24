#!/usr/bin/env python3
"""
Migration Script: Convert Raw Curriculum Tags to Prefixed Format

This script updates existing questions in the database to use prefixed curriculum tags
(e.g., "M1-M1", "M2-MM1", "P-P1") instead of raw codes (e.g., "M1", "MM1", "P1").

Run this script after implementing the prefixed tag system to migrate existing data.
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
env_path = Path(__file__).parent.parent.parent / ".env.local"
if env_path.exists():
    load_dotenv(env_path)

from curriculum_parser import CurriculumParser
from db_sync import DatabaseSync

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def needs_migration(tag: Optional[str]) -> bool:
    """
    Check if a tag needs migration (i.e., it's a raw code, not prefixed).
    
    Args:
        tag: Tag code to check
    
    Returns:
        True if tag needs migration (raw format), False if already prefixed or None
    """
    if not tag:
        return False
    
    # Prefixed tags contain a hyphen (e.g., "M1-M1", "M2-MM1", "P-P1")
    if "-" in tag:
        return False
    
    # Raw codes don't have hyphens (e.g., "M1", "MM1", "P1")
    return True


def migrate_tag(tag: str, parser: CurriculumParser) -> Optional[str]:
    """
    Convert a raw tag code to prefixed format.
    
    Args:
        tag: Raw tag code (e.g., "M1", "MM1", "P1")
        parser: CurriculumParser instance
    
    Returns:
        Prefixed tag code (e.g., "M1-M1", "M2-MM1", "P-P1") or None if invalid
    """
    if not tag:
        return None
    
    # If already prefixed, return as-is
    if "-" in tag:
        return tag if parser.validate_topic_code(tag) else None
    
    # Try to normalize
    normalized = parser.normalize_topic_code(tag)
    return normalized


def migrate_question_tags(question: Dict, parser: CurriculumParser) -> Dict:
    """
    Migrate tags for a single question.
    
    Args:
        question: Question dictionary from database
        parser: CurriculumParser instance
    
    Returns:
        Dictionary with updated tags, or empty dict if no changes needed
    """
    updates = {}
    
    # Migrate primary_tag
    primary_tag = question.get("primary_tag")
    if needs_migration(primary_tag):
        migrated_primary = migrate_tag(primary_tag, parser)
        if migrated_primary:
            updates["primary_tag"] = migrated_primary
            print(f"  Primary tag: {primary_tag} → {migrated_primary}")
        else:
            print(f"  ⚠ Could not migrate primary tag: {primary_tag}")
    
    # Migrate secondary_tags
    secondary_tags = question.get("secondary_tags")
    if secondary_tags and isinstance(secondary_tags, list):
        migrated_secondary = []
        changed = False
        
        for tag in secondary_tags:
            if needs_migration(tag):
                migrated_tag = migrate_tag(tag, parser)
                if migrated_tag:
                    migrated_secondary.append(migrated_tag)
                    changed = True
                    print(f"  Secondary tag: {tag} → {migrated_tag}")
                else:
                    print(f"  ⚠ Could not migrate secondary tag: {tag}")
                    migrated_secondary.append(tag)  # Keep original if migration fails
            else:
                migrated_secondary.append(tag)  # Already prefixed or None
        
        if changed:
            updates["secondary_tags"] = migrated_secondary
    
    return updates


def main():
    parser = argparse.ArgumentParser(
        description="Migrate curriculum tags from raw format to prefixed format"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without making changes"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of questions to process (for testing)"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Curriculum Tag Migration Script")
    print("=" * 60)
    print()
    
    # Load curriculum parser
    try:
        curriculum_parser = CurriculumParser()
        print("✓ Loaded curriculum parser")
    except Exception as e:
        print(f"✗ Failed to load curriculum parser: {e}")
        return 1
    
    # Initialize database sync
    try:
        db_sync = DatabaseSync()
        print("✓ Connected to database")
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        return 1
    
    # Fetch all questions
    print("\nFetching questions from database...")
    try:
        if not db_sync.enabled or not db_sync.client:
            print("✗ Database sync is not enabled or client not available")
            return 1
        questions = db_sync.client.table("ai_generated_questions").select("*").execute()
        questions_data = questions.data if hasattr(questions, 'data') else []
        print(f"✓ Loaded {len(questions_data)} questions")
    except Exception as e:
        print(f"✗ Failed to fetch questions: {e}")
        return 1
    
    if args.limit:
        questions_data = questions_data[:args.limit]
        print(f"  (Limited to {len(questions_data)} questions for testing)")
    
    # Filter questions that need migration
    questions_to_migrate = []
    for q in questions_data:
        primary_tag = q.get("primary_tag")
        secondary_tags = q.get("secondary_tags", [])
        
        if needs_migration(primary_tag) or any(needs_migration(tag) for tag in (secondary_tags or [])):
            questions_to_migrate.append(q)
    
    print(f"\nFound {len(questions_to_migrate)} questions that need migration")
    
    if not questions_to_migrate:
        print("✓ No migration needed - all tags are already in prefixed format!")
        return 0
    
    if args.dry_run:
        print("\n⚠ DRY RUN MODE - No database updates will be made\n")
    
    # Process each question
    migrated_count = 0
    failed_count = 0
    
    for i, question in enumerate(questions_to_migrate, 1):
        question_id = question.get("id", "unknown")
        print(f"\n[{i}/{len(questions_to_migrate)}] Question {question_id}")
        
        try:
            updates = migrate_question_tags(question, curriculum_parser)
            
            if updates:
                if not args.dry_run:
                    # Update in database
                    try:
                        result = db_sync.client.table("ai_generated_questions").update(updates).eq("id", question_id).execute()
                        print(f"  ✓ Updated in database")
                        migrated_count += 1
                    except Exception as e:
                        print(f"  ✗ Failed to update database: {e}")
                        failed_count += 1
                else:
                    print(f"  [DRY RUN] Would update: {updates}")
                    migrated_count += 1
            else:
                print(f"  - No changes needed")
        except Exception as e:
            print(f"  ✗ Error processing question: {e}")
            failed_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"  Total questions processed: {len(questions_to_migrate)}")
    print(f"  Successfully migrated: {migrated_count}")
    print(f"  Failed: {failed_count}")
    if args.dry_run:
        print(f"  (Dry run - no actual changes made)")
    print()
    
    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

