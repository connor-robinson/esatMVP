#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Sync Module

Syncs generated questions to Supabase database with proper status tracking.
"""

import os
import sys
import json
import re
from typing import Dict, Any, Optional
from datetime import datetime

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        # Python 3.7+
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for older Python versions
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    from supabase import create_client, Client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    print("Warning: supabase-py not installed. Database sync will be disabled.")
    print("Install with: pip install supabase")


def normalize_math_spacing(text: str) -> str:
    """
    Normalizes spacing around math delimiters ($ and $$) in text.
    Adds spaces before and after math blocks unless:
    - There's already a space
    - It's at the start of the string (before opening delimiter)
    - There's punctuation immediately after closing delimiter
    """
    if not text or not isinstance(text, str):
        return text
    
    # Pattern to match $$...$$ blocks (display math) - process these first
    display_math_pattern = re.compile(r'\$\$[^$]*?\$\$')
    
    # Pattern to match $...$ blocks (inline math) - but not part of $$...$$
    # Using negative lookbehind/lookahead to avoid matching $ that's part of $$
    inline_math_pattern = re.compile(r'(?<!\$)\$(?!\$)[^$]*?\$(?!\$)')
    
    # Punctuation that shouldn't have a space after math
    punctuation_after = re.compile(r'^[.,!?;:)\]}]')
    
    result = text
    
    # Find all display math blocks ($$...$$)
    display_matches = list(display_math_pattern.finditer(result))
    
    # Find all inline math blocks ($...$) that aren't part of $$...$$
    inline_matches = []
    for match in inline_math_pattern.finditer(result):
        # Check if this match overlaps with any display math block
        overlaps = any(
            (match.start() >= dm.start() and match.start() < dm.end()) or
            (match.end() > dm.start() and match.end() <= dm.end()) or
            (match.start() < dm.start() and match.end() > dm.end())
            for dm in display_matches
        )
        if not overlaps:
            inline_matches.append(match)
    
    # Combine and sort all matches by position (reverse order for processing)
    all_matches = display_matches + inline_matches
    all_matches.sort(key=lambda m: m.start(), reverse=True)
    
    # Process matches in reverse order to maintain correct indices
    for match in all_matches:
        start, end = match.span()
        before = result[:start]
        after = result[end:]
        
        needs_space_before = False
        needs_space_after = False
        
        # Check if we need space before
        if start > 0:
            char_before = result[start - 1]
            # Need space if previous char is not whitespace
            if not char_before.isspace():
                needs_space_before = True
        
        # Check if we need space after
        if len(after) > 0:
            char_after = after[0]
            # Need space if next char is not whitespace and not punctuation
            if not char_after.isspace() and not punctuation_after.match(char_after):
                needs_space_after = True
        
        # Apply spacing
        new_content = match.group(0)
        if needs_space_before:
            new_content = ' ' + new_content
        if needs_space_after:
            new_content = new_content + ' '
        
        # Replace in result
        result = before + new_content + after
    
    return result


def normalize_question_math_spacing(question_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalizes math spacing in question data fields."""
    normalized = question_data.copy()
    
    # Normalize question_stem
    if 'question_stem' in normalized and normalized['question_stem']:
        normalized['question_stem'] = normalize_math_spacing(normalized['question_stem'])
    
    # Normalize options (dict of option letters to text)
    if 'options' in normalized and isinstance(normalized['options'], dict):
        normalized_options = {}
        for key, value in normalized['options'].items():
            if isinstance(value, str):
                normalized_options[key] = normalize_math_spacing(value)
            else:
                normalized_options[key] = value
        normalized['options'] = normalized_options
    
    # Normalize solution fields
    if 'solution_reasoning' in normalized and normalized['solution_reasoning']:
        normalized['solution_reasoning'] = normalize_math_spacing(normalized['solution_reasoning'])
    
    if 'solution_key_insight' in normalized and normalized['solution_key_insight']:
        normalized['solution_key_insight'] = normalize_math_spacing(normalized['solution_key_insight'])
    
    # Normalize distractor_map (dict of option letters to text)
    if 'distractor_map' in normalized and isinstance(normalized['distractor_map'], dict):
        normalized_distractor_map = {}
        for key, value in normalized['distractor_map'].items():
            if isinstance(value, str):
                normalized_distractor_map[key] = normalize_math_spacing(value)
            else:
                normalized_distractor_map[key] = value
        normalized['distractor_map'] = normalized_distractor_map
    
    return normalized


class DatabaseSync:
    """Handles syncing questions to Supabase database."""
    
    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        """
        Initialize database sync.
        
        Args:
            supabase_url: Supabase project URL (defaults to env var)
            supabase_key: Supabase service role key (defaults to env var)
        """
        if not _SUPABASE_AVAILABLE:
            self.client = None
            self.enabled = False
            return
        
        # Try to load from .env.local file if not provided
        if not supabase_url or not supabase_key:
            from pathlib import Path
            import sys
            base_dir = Path(__file__).parent
            project_root = base_dir.parent.parent
            env_path = project_root / ".env.local"
            
            if env_path.exists():
                from dotenv import load_dotenv
                load_dotenv(env_path)
        
        self.supabase_url = supabase_url or os.environ.get("SUPABASE_URL")
        self.supabase_key = supabase_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            print("Warning: Supabase credentials not found. Database sync disabled.")
            print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
            print(f"SUPABASE_URL: {'SET' if self.supabase_url else 'NOT SET'}")
            print(f"SUPABASE_SERVICE_ROLE_KEY: {'SET' if self.supabase_key else 'NOT SET'}")
            self.client = None
            self.enabled = False
            return
        
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
            self.enabled = True
        except Exception as e:
            print(f"[DB_SYNC] Error initializing Supabase client: {e}")
            self.client = None
            self.enabled = False
    
    def sync_question(self, question_item: Dict[str, Any], status: str = "approved") -> Optional[str]:
        """
        Sync a question to the database.
        
        Only saves questions that pass both verifier and style judge.
        Questions that don't pass are not saved to the database.
        
        Args:
            question_item: Question item from pipeline (from build_bank_item)
            status: Status to assign (default: approved, but will only save if verifier+style pass)
            
        Returns:
            Database ID if successful, None otherwise (if question doesn't pass checks)
        """
        if not self.enabled or not self.client:
            return None
        
        try:
            # Only save questions that pass both verifier and style judge
            verifier_report = question_item.get("verifier_report", {})
            style_report = question_item.get("style_report", {})
            
            verifier_verdict = verifier_report.get("verdict", "").upper() if isinstance(verifier_report, dict) else ""
            style_verdict = style_report.get("verdict", "").upper() if isinstance(style_report, dict) else ""
            
            if verifier_verdict != "PASS" or style_verdict != "PASS":
                # Don't save questions that don't pass both checks
                return None
            
            # Status is always "approved" for saved questions
            status = "approved"
            
            # Extract question data
            question_pkg = question_item.get("question_package", {})
            question = question_pkg.get("question", {})
            solution = question_pkg.get("solution", {})
            distractor_map = question_pkg.get("distractor_map", {})
            
            # Extract correct_option and validate
            correct_option = question.get("correct_option", "").strip().upper()
            # If empty or invalid, use fallback
            if not correct_option or correct_option not in "ABCDEFGH":
                correct_option = "A"
            
            # Extract tags if available
            tags_data = question_item.get("tags", {})
            primary_tag = tags_data.get("primary_tag") if tags_data else None
            secondary_tags = tags_data.get("secondary_tags", []) if tags_data else []
            tags_confidence = tags_data.get("confidence") if tags_data else None
            tags_labeled_at = tags_data.get("labeled_at") if tags_data else None
            tags_labeled_by = tags_data.get("labeled_by") if tags_data else None
            
            # Prepare database record
            db_record = {
                "generation_id": question_item.get("id", ""),
                "schema_id": question_item.get("schema_id", ""),
                "difficulty": question_item.get("difficulty", ""),
                "status": status,
                "question_stem": question.get("stem", ""),
                "options": question.get("options", {}),
                "correct_option": correct_option,
                "solution_reasoning": solution.get("reasoning", ""),
                "solution_key_insight": solution.get("key_insight", ""),
                "distractor_map": distractor_map,
                "idea_plan": question_item.get("idea_plan", {}),
                "verifier_report": question_item.get("verifier_report", {}),
                "style_report": question_item.get("style_report", {}),
                "models_used": question_item.get("models", {}),
                "generation_attempts": question_item.get("attempts", 0),
                "token_usage": question_item.get("token_usage"),
                "run_id": question_item.get("_run_id", ""),
                "created_at": question_item.get("created_at", datetime.now().isoformat()),
            }
            
            # Normalize math spacing in text fields
            db_record = normalize_question_math_spacing(db_record)
            
            # Add tags if available
            if primary_tag:
                db_record["primary_tag"] = primary_tag
            if secondary_tags:
                db_record["secondary_tags"] = secondary_tags
            if tags_confidence:
                db_record["tags_confidence"] = tags_confidence
            if tags_labeled_at:
                db_record["tags_labeled_at"] = tags_labeled_at
            if tags_labeled_by:
                db_record["tags_labeled_by"] = tags_labeled_by
            
            # Insert into database (silently)
            result = self.client.table("ai_generated_questions").insert(db_record).execute()
            
            if result.data and len(result.data) > 0:
                db_id = result.data[0].get("id")
                return db_id
            else:
                # Only log errors, not warnings
                if hasattr(result, 'error') and result.error:
                    print(f"[DB_SYNC] Error syncing {question_item.get('id')}: {result.error}")
                return None
                
        except Exception as e:
            # Only log actual errors, not every failure
            error_str = str(e)
            if "23514" not in error_str and "check constraint" not in error_str.lower():
                # Not a constraint violation - log it
                print(f"[DB_SYNC] Error syncing {question_item.get('id')}: {error_str[:200]}")
            return None
    
    def update_question_status(self, generation_id: str, status: str, 
                              reviewed_by: Optional[str] = None,
                              review_notes: Optional[str] = None) -> bool:
        """
        Update the status of a question in the database.
        
        Args:
            generation_id: Generation ID of the question
            status: New status
            reviewed_by: User ID who reviewed (optional)
            review_notes: Review notes (optional)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            return False
        
        try:
            update_data = {
                "status": status,
                "reviewed_at": datetime.now().isoformat(),
            }
            
            if reviewed_by:
                update_data["reviewed_by"] = reviewed_by
            if review_notes:
                update_data["review_notes"] = review_notes
            
            result = self.client.table("ai_generated_questions")\
                .update(update_data)\
                .eq("generation_id", generation_id)\
                .execute()
            
            if result.data and len(result.data) > 0:
                try:
                    print(f"✓ Updated question {generation_id} status to {status}")
                except UnicodeEncodeError:
                    print(f"[OK] Updated question {generation_id} status to {status}")
                return True
            else:
                print(f"⚠ Warning: Question {generation_id} not found for status update")
                return False
                
        except Exception as e:
            try:
                print(f"✗ Error updating question {generation_id}: {e}")
            except UnicodeEncodeError:
                print(f"[ERROR] Error updating question {generation_id}: {e}")
            return False
    
    def question_exists(self, generation_id: str) -> bool:
        """
        Check if a question already exists in the database.
        
        Args:
            generation_id: Generation ID to check
            
        Returns:
            True if exists, False otherwise
        """
        if not self.enabled or not self.client:
            return False
        
        try:
            result = self.client.table("ai_generated_questions")\
                .select("id")\
                .eq("generation_id", generation_id)\
                .limit(1)\
                .execute()
            
            return result.data and len(result.data) > 0
        except Exception as e:
            print(f"Error checking question existence: {e}")
            return False


def sync_question_from_pipeline(question_item: Dict[str, Any], base_dir: str,
                               status: str = "approved") -> Optional[str]:
    """
    Convenience function to sync a question from the pipeline.
    
    Only saves questions that pass both verifier and style judge.
    
    Args:
        question_item: Question item from pipeline (from build_bank_item)
        base_dir: Base directory (not used, kept for compatibility)
        status: Status to assign (default: approved, but only saved if verifier+style pass)
        
    Returns:
        Database ID if successful, None otherwise (if question doesn't pass checks)
    """
    sync = DatabaseSync()
    return sync.sync_question(question_item, status)


if __name__ == "__main__":
    # Test database sync
    sync = DatabaseSync()
    
    if sync.enabled:
        print("Database sync is enabled")
        
        # Test question existence check
        test_id = "M6-Easy-test123"
        exists = sync.question_exists(test_id)
        print(f"Question {test_id} exists: {exists}")
    else:
        print("Database sync is disabled (credentials not configured)")

