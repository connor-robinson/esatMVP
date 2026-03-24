#!/usr/bin/env python3
"""
Batch Labeling Script for Existing Questions

Labels existing questions in the database or JSONL backups with curriculum tags.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
env_path = Path(__file__).parent.parent.parent / ".env.local"
if env_path.exists():
    load_dotenv(env_path)

from project import LLMClient, load_prompts, tag_labeler_call, ModelsConfig, safe_yaml_load
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


def load_questions_from_backups(backup_dir: Path) -> List[Dict[str, Any]]:
    """Load questions from JSONL backup files."""
    questions = []
    if not backup_dir.exists():
        print(f"⚠ Backup directory not found: {backup_dir}")
        return questions
    
    for jsonl_file in backup_dir.rglob("questions.jsonl"):
        print(f"Loading questions from: {jsonl_file}")
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        item = json.loads(line)
                        question_data = item.get("question_data", item)
                        questions.append(question_data)
                    except json.JSONDecodeError as e:
                        print(f"⚠ Error parsing line in {jsonl_file}: {e}")
    
    return questions


def load_questions_from_database(db_sync: DatabaseSync, filter_unlabeled: bool = True) -> List[Dict[str, Any]]:
    """Load questions from Supabase database."""
    if not db_sync.enabled or not db_sync.client:
        print("⚠ Database sync not enabled or client not available")
        return []
    
    try:
        query = db_sync.client.table("ai_generated_questions").select("*")
        
        if filter_unlabeled:
            # Only get questions without tags
            query = query.or_("primary_tag.is.null,tags_labeled_by.is.null")
        
        result = query.execute()
        
        if result.data:
            return result.data
        else:
            return []
    except Exception as e:
        print(f"⚠ Error loading questions from database: {e}")
        return []


def extract_question_package(question: Dict[str, Any]) -> Dict[str, Any]:
    """Extract question_package from question data structure."""
    if "question_package" in question:
        return question["question_package"]
    elif "question" in question:
        # Already in question_package format
        return question
    else:
        # Try to reconstruct
        return {
            "question": {
                "stem": question.get("question_stem", ""),
                "options": question.get("options", {}),
                "correct_option": question.get("correct_option", ""),
            },
            "solution": {
                "reasoning": question.get("solution_reasoning", ""),
                "key_insight": question.get("solution_key_insight", ""),
            },
            "distractor_map": question.get("distractor_map", {}),
        }


def label_question(question: Dict[str, Any], llm: LLMClient, prompts, models: ModelsConfig, 
                   curriculum_parser: CurriculumParser) -> Optional[Dict[str, Any]]:
    """Label a single question with curriculum tags."""
    schema_id = question.get("schema_id", "")
    if not schema_id:
        print(f"⚠ Question missing schema_id, skipping")
        return None
    
    try:
        question_pkg = extract_question_package(question)
        tag_result = tag_labeler_call(llm, prompts, models, question_pkg, schema_id, curriculum_parser)
        
        # Extract tags from result
        primary_tag = tag_result.get("primary_tag", "")
        # Normalize to prefixed format if needed (future-proofing)
        if primary_tag and curriculum_parser:
            normalized_primary = curriculum_parser.normalize_topic_code(primary_tag)
            if normalized_primary:
                primary_tag = normalized_primary
        
        secondary_tags_list = tag_result.get("secondary_tags", [])
        secondary_tags = []
        for tag in secondary_tags_list:
            tag_code = tag.get("code", "") if isinstance(tag, dict) else str(tag)
            if tag_code:
                # Normalize to prefixed format if needed
                if curriculum_parser:
                    normalized_tag = curriculum_parser.normalize_topic_code(tag_code)
                    if normalized_tag:
                        tag_code = normalized_tag
                secondary_tags.append(tag_code)
        
        # Build confidence object
        confidence = {
            "primary": tag_result.get("primary_confidence", 0.0)
        }
        if secondary_tags_list:
            for tag in secondary_tags_list:
                if isinstance(tag, dict):
                    confidence[tag.get("code", "")] = tag.get("confidence", 0.0)
        
        tags = {
            "primary_tag": primary_tag,
            "secondary_tags": secondary_tags,
            "confidence": confidence,
            "labeled_at": datetime.now().isoformat(),
            "labeled_by": "batch_process",
            "reasoning": tag_result.get("reasoning", "")
        }
        
        return tags
    except Exception as e:
        print(f"⚠ Error labeling question {question.get('id', 'unknown')}: {e}")
        return None


def update_question_tags(db_sync: DatabaseSync, question_id: str, tags: Dict[str, Any], 
                        use_generation_id: bool = False) -> bool:
    """Update question tags in the database."""
    if not db_sync.enabled or not db_sync.client:
        return False
    
    try:
        update_data = {
            "primary_tag": tags.get("primary_tag"),
            "secondary_tags": tags.get("secondary_tags", []),
            "tags_confidence": tags.get("confidence"),
            "tags_labeled_at": tags.get("labeled_at"),
            "tags_labeled_by": tags.get("labeled_by"),
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        query = db_sync.client.table("ai_generated_questions")
        
        if use_generation_id:
            query = query.update(update_data).eq("generation_id", question_id)
        else:
            query = query.update(update_data).eq("id", question_id)
        
        result = query.execute()
        
        return result.data is not None and len(result.data) > 0
    except Exception as e:
        print(f"⚠ Error updating tags for question {question_id}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Label existing questions with curriculum tags")
    parser.add_argument("--source", choices=["database", "backups"], default="database",
                       help="Source of questions: database or backups")
    parser.add_argument("--backup-dir", type=str, 
                       default=str(Path(__file__).parent / "backups"),
                       help="Path to backup directory (if source=backups)")
    parser.add_argument("--batch-size", type=int, default=10,
                       help="Number of questions to process in each batch")
    parser.add_argument("--dry-run", action="store_true",
                       help="Dry run mode - don't update database")
    parser.add_argument("--curriculum-file", type=str, default=None,
                       help="Path to curriculum JSON file")
    parser.add_argument("--filter-unlabeled", action="store_true", default=True,
                       help="Only process questions without tags")
    
    args = parser.parse_args()
    
    # Check API key
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("❌ Error: Missing GEMINI_API_KEY environment variable")
        sys.exit(1)
    
    # Load curriculum parser
    base_dir = Path(__file__).parent
    curriculum_file = args.curriculum_file
    if curriculum_file is None:
        curriculum_file = base_dir / "curriculum" / "ESAT_CURRICULUM.json"
    
    try:
        curriculum_parser = CurriculumParser(curriculum_file)
        print(f"✓ Loaded curriculum from: {curriculum_file}")
    except Exception as e:
        print(f"❌ Error loading curriculum: {e}")
        sys.exit(1)
    
    # Load prompts
    try:
        prompts = load_prompts(str(base_dir))
        print("✓ Loaded prompts")
    except Exception as e:
        print(f"❌ Error loading prompts: {e}")
        sys.exit(1)
    
    # Initialize LLM client
    llm = LLMClient(api_key=api_key)
    models = ModelsConfig()
    
    # Load questions
    print(f"\nLoading questions from {args.source}...")
    if args.source == "database":
        db_sync = DatabaseSync()
        questions = load_questions_from_database(db_sync, filter_unlabeled=args.filter_unlabeled)
        print(f"✓ Loaded {len(questions)} questions from database")
    else:
        backup_dir = Path(args.backup_dir)
        questions = load_questions_from_backups(backup_dir)
        print(f"✓ Loaded {len(questions)} questions from backups")
        db_sync = DatabaseSync()  # Still need for updates
    
    if not questions:
        print("⚠ No questions to process")
        return
    
    # Process questions in batches
    total = len(questions)
    successful = 0
    failed = 0
    
    print(f"\nProcessing {total} questions in batches of {args.batch_size}...")
    if args.dry_run:
        print("⚠ DRY RUN MODE - No database updates will be made")
    
    for i in range(0, total, args.batch_size):
        batch = questions[i:i + args.batch_size]
        batch_num = (i // args.batch_size) + 1
        total_batches = (total + args.batch_size - 1) // args.batch_size
        
        print(f"\n--- Batch {batch_num}/{total_batches} ({len(batch)} questions) ---")
        
        for question in batch:
            question_id = question.get("id") or question.get("generation_id", "unknown")
            print(f"Labeling question: {question_id} ({question.get('schema_id', '?')})")
            
            tags = label_question(question, llm, prompts, models, curriculum_parser)
            
            if tags:
                print(f"  ✓ Primary tag: {tags.get('primary_tag')}")
                if tags.get('secondary_tags'):
                    print(f"  ✓ Secondary tags: {', '.join(tags.get('secondary_tags', []))}")
                
                if not args.dry_run:
                    # Determine ID field to use
                    use_generation_id = "generation_id" in question
                    update_id = question.get("generation_id") if use_generation_id else question.get("id")
                    
                    if update_id:
                        if update_question_tags(db_sync, update_id, tags, use_generation_id=use_generation_id):
                            print(f"  ✓ Updated database")
                            successful += 1
                        else:
                            print(f"  ✗ Failed to update database")
                            failed += 1
                    else:
                        print(f"  ⚠ No ID found, skipping database update")
                        failed += 1
                else:
                    successful += 1
            else:
                print(f"  ✗ Failed to label question")
                failed += 1
        
        print(f"\nProgress: {i + len(batch)}/{total} processed ({successful} successful, {failed} failed)")
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total questions: {total}")
    print(f"  Successfully labeled: {successful}")
    print(f"  Failed: {failed}")
    if args.dry_run:
        print(f"  (Dry run - no database updates made)")


if __name__ == "__main__":
    main()

