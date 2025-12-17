#!/usr/bin/env python3
"""
Database Sync Module

Syncs generated questions to Supabase database with proper status tracking.
"""

import os
import json
from typing import Dict, Any, Optional
from datetime import datetime

try:
    from supabase import create_client, Client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    print("Warning: supabase-py not installed. Database sync will be disabled.")
    print("Install with: pip install supabase")


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
        
        self.supabase_url = supabase_url or os.environ.get("SUPABASE_URL")
        self.supabase_key = supabase_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            print("Warning: Supabase credentials not found. Database sync disabled.")
            print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
            self.client = None
            self.enabled = False
            return
        
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
            self.enabled = True
        except Exception as e:
            print(f"Error initializing Supabase client: {e}")
            self.client = None
            self.enabled = False
    
    def sync_question(self, question_item: Dict[str, Any], status: str = "pending_review") -> Optional[str]:
        """
        Sync a question to the database.
        
        Args:
            question_item: Question item from pipeline (from build_bank_item)
            status: Status to assign (default: pending_review)
            
        Returns:
            Database ID if successful, None otherwise
        """
        if not self.enabled or not self.client:
            return None
        
        try:
            # Extract question data
            question_pkg = question_item.get("question_package", {})
            question = question_pkg.get("question", {})
            solution = question_pkg.get("solution", {})
            distractor_map = question_pkg.get("distractor_map", {})
            
            # Prepare database record
            db_record = {
                "generation_id": question_item.get("id", ""),
                "schema_id": question_item.get("schema_id", ""),
                "difficulty": question_item.get("difficulty", ""),
                "status": status,
                "question_stem": question.get("stem", ""),
                "options": question.get("options", {}),
                "correct_option": question.get("correct_option", ""),
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
            
            # Insert into database
            result = self.client.table("ai_generated_questions").insert(db_record).execute()
            
            if result.data and len(result.data) > 0:
                db_id = result.data[0].get("id")
                print(f"✓ Synced question {question_item.get('id')} to database (ID: {db_id})")
                return db_id
            else:
                print(f"⚠ Warning: Question {question_item.get('id')} inserted but no ID returned")
                return None
                
        except Exception as e:
            print(f"✗ Error syncing question {question_item.get('id')}: {e}")
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
                print(f"✓ Updated question {generation_id} status to {status}")
                return True
            else:
                print(f"⚠ Warning: Question {generation_id} not found for status update")
                return False
                
        except Exception as e:
            print(f"✗ Error updating question {generation_id}: {e}")
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
                               status: str = "pending_review") -> Optional[str]:
    """
    Convenience function to sync a question from the pipeline.
    
    Args:
        question_item: Question item from pipeline (from build_bank_item)
        base_dir: Base directory (not used, kept for compatibility)
        status: Status to assign (default: pending_review)
        
    Returns:
        Database ID if successful, None otherwise
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

