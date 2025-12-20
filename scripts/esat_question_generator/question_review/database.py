#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database module for Question Review application.

Handles all Supabase database operations for question management.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

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
    print("Warning: supabase-py not installed. Install with: pip install supabase")

# Import math spacing normalization from db_sync
try:
    from db_sync import normalize_math_spacing, normalize_question_math_spacing
except ImportError:
    # Fallback if import fails
    def normalize_math_spacing(text: str) -> str:
        return text
    def normalize_question_math_spacing(data: Dict[str, Any]) -> Dict[str, Any]:
        return data


# Status file removed - using process-based status tracking instead


class Database:
    """Database connection and query handler for question review."""
    
    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        """Initialize database connection."""
        if not _SUPABASE_AVAILABLE:
            self.client = None
            self.enabled = False
            raise RuntimeError("supabase-py library not installed")
        
        # Try to load from .env.local file if not provided
        if not supabase_url or not supabase_key:
            base_dir = Path(__file__).parent
            project_root = base_dir.parent.parent.parent
            env_path = project_root / ".env.local"
            
            if env_path.exists():
                try:
                    from dotenv import load_dotenv
                    load_dotenv(env_path)
                except ImportError:
                    pass  # dotenv not available, continue with env vars
        
        self.supabase_url = supabase_url or os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = supabase_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise RuntimeError(
                "Supabase credentials not found. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) "
                "and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )
        
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
            self.enabled = True
        except Exception as e:
            raise RuntimeError(f"Error initializing Supabase client: {e}")
    
    def get_questions(
        self,
        status: Optional[str] = "approved",
        page: int = 1,
        limit: int = 20,
        primary_tag: Optional[str] = None,
        secondary_tag: Optional[str] = None,
        schema: Optional[str] = None,
        difficulty: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Fetch questions with filters and pagination.
        
        Args:
            status: Status filter ("approved", "rejected", "needs_revision", or None for all)
        
        Returns:
            Tuple of (questions list, pagination dict)
        """
        if not self.enabled or not self.client:
            return [], {"page": page, "limit": limit, "total": 0, "totalPages": 0}
        
        # Build query
        query = self.client.table("ai_generated_questions").select("*", count="exact")
        if status is not None:
            query = query.eq("status", status)
        query = query.order("created_at", desc=True)
        
        # Apply filters
        if primary_tag:
            query = query.eq("primary_tag", primary_tag)
        if secondary_tag:
            query = query.contains("secondary_tags", [secondary_tag])
        if schema:
            query = query.eq("schema_id", schema)
        if difficulty:
            query = query.eq("difficulty", difficulty)
        
        # Apply pagination
        from_idx = (page - 1) * limit
        to_idx = from_idx + limit - 1
        query = query.range(from_idx, to_idx)
        
        try:
            response = query.execute()
            questions = response.data if response.data else []
            count = response.count if hasattr(response, 'count') and response.count else len(questions)
            total_pages = max(1, (count + limit - 1) // limit) if count > 0 else 1
            
            pagination = {
                "page": page,
                "limit": limit,
                "total": count,
                "totalPages": total_pages,
            }
            
            return questions, pagination
        except Exception as e:
            print(f"Error fetching questions: {e}")
            return [], {"page": page, "limit": limit, "total": 0, "totalPages": 0}
    
    def get_question_by_id(self, question_id: str) -> Optional[Dict[str, Any]]:
        """Get a single question by ID."""
        if not self.enabled or not self.client:
            return None
        
        try:
            response = self.client.table("ai_generated_questions").select("*").eq("id", question_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error fetching question {question_id}: {e}")
            return None
    
    def update_question_status(
        self,
        question_id: str,
        status: str,
        review_notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update question status.
        
        Valid statuses: "approved", "rejected", "needs_revision"
        """
        if not self.enabled or not self.client:
            return None
        
        valid_statuses = ["approved", "rejected", "needs_revision"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        update_data = {
            "status": status,
            "reviewed_at": datetime.now().isoformat(),
        }
        
        if review_notes is not None:
            update_data["review_notes"] = review_notes
        
        try:
            response = self.client.table("ai_generated_questions").update(update_data).eq("id", question_id).select().execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error updating question status: {e}")
            raise
    
    def update_question_tags(
        self,
        question_id: str,
        primary_tag: Optional[str] = None,
        secondary_tags: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """Update question tags."""
        if not self.enabled or not self.client:
            return None
        
        update_data = {
            "tags_labeled_at": datetime.now().isoformat(),
            "tags_labeled_by": "manual_edit",
        }
        
        if primary_tag is not None:
            update_data["primary_tag"] = primary_tag
        if secondary_tags is not None:
            update_data["secondary_tags"] = secondary_tags
        
        try:
            response = self.client.table("ai_generated_questions").update(update_data).eq("id", question_id).select().execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error updating question tags: {e}")
            raise
    
    def update_question_content(
        self,
        question_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update question content fields.
        
        Automatically applies math spacing normalization to text fields.
        """
        if not self.enabled or not self.client:
            return None
        
        # Normalize math spacing in text fields
        normalized_updates = {}
        for key, value in updates.items():
            if key == "question_stem" and isinstance(value, str):
                normalized_updates[key] = normalize_math_spacing(value)
            elif key == "options" and isinstance(value, dict):
                normalized_options = {}
                for opt_key, opt_value in value.items():
                    if isinstance(opt_value, str):
                        normalized_options[opt_key] = normalize_math_spacing(opt_value)
                    else:
                        normalized_options[opt_key] = opt_value
                normalized_updates[key] = normalized_options
            elif key == "solution_reasoning" and isinstance(value, str):
                normalized_updates[key] = normalize_math_spacing(value)
            elif key == "solution_key_insight" and isinstance(value, str):
                normalized_updates[key] = normalize_math_spacing(value)
            elif key == "distractor_map" and isinstance(value, dict):
                normalized_distractors = {}
                for dist_key, dist_value in value.items():
                    if isinstance(dist_value, str):
                        normalized_distractors[dist_key] = normalize_math_spacing(dist_value)
                    else:
                        normalized_distractors[dist_key] = dist_value
                normalized_updates[key] = normalized_distractors
            else:
                normalized_updates[key] = value
        
        try:
            response = self.client.table("ai_generated_questions").update(normalized_updates).eq("id", question_id).select().execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error updating question content: {e}")
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get question statistics."""
        if not self.enabled or not self.client:
            return {
                "total": 0,
                "byStatus": {},
                "bySchema": {},
                "byDifficulty": {},
            }
        
        try:
            # Get all questions for counting
            status_response = self.client.table("ai_generated_questions").select("status").execute()
            schema_response = self.client.table("ai_generated_questions").select("schema_id").execute()
            difficulty_response = self.client.table("ai_generated_questions").select("difficulty").execute()
            count_response = self.client.table("ai_generated_questions").select("*", count="exact").limit(1).execute()
            
            # Count by status
            by_status = {}
            if status_response.data:
                for item in status_response.data:
                    status = item.get("status", "unknown")
                    by_status[status] = by_status.get(status, 0) + 1
            
            # Count by schema
            by_schema = {}
            if schema_response.data:
                for item in schema_response.data:
                    schema = item.get("schema_id", "unknown")
                    by_schema[schema] = by_schema.get(schema, 0) + 1
            
            # Count by difficulty
            by_difficulty = {}
            if difficulty_response.data:
                for item in difficulty_response.data:
                    difficulty = item.get("difficulty", "unknown")
                    by_difficulty[difficulty] = by_difficulty.get(difficulty, 0) + 1
            
            total = count_response.count if hasattr(count_response, 'count') and count_response.count else 0
            
            return {
                "total": total,
                "byStatus": by_status,
                "bySchema": by_schema,
                "byDifficulty": by_difficulty,
            }
        except Exception as e:
            print(f"Error fetching stats: {e}")
            return {
                "total": 0,
                "byStatus": {},
                "bySchema": {},
                "byDifficulty": {},
            }
    
    def get_schema_progress(self) -> Dict[str, Dict[str, Any]]:
        """
        Get question counts, tags, and difficulty breakdown per schema.
        
        Returns:
            {
                "M1": {
                    "count": 5,
                    "tags": {
                        "primary": ["M1-M1"],
                        "secondary": ["algebra", "equations"]
                    },
                    "difficulty": {"Easy": 2, "Medium": 2, "Hard": 1}
                },
                ...
            }
        """
        if not self.enabled or not self.client:
            return {}
        
        try:
            # Get all approved questions
            response = self.client.table("ai_generated_questions").select(
                "schema_id", "primary_tag", "secondary_tags", "difficulty"
            ).eq("status", "approved").execute()
            
            if not response.data:
                return {}
            
            schema_progress = {}
            
            for question in response.data:
                schema_id = question.get("schema_id")
                if not schema_id:
                    continue
                
                if schema_id not in schema_progress:
                    schema_progress[schema_id] = {
                        "count": 0,
                        "tags": {
                            "primary": set(),
                            "secondary": set()
                        },
                        "difficulty": {}
                    }
                
                schema_progress[schema_id]["count"] += 1
                
                # Collect tags
                primary_tag = question.get("primary_tag")
                if primary_tag:
                    schema_progress[schema_id]["tags"]["primary"].add(primary_tag)
                
                secondary_tags = question.get("secondary_tags", [])
                if isinstance(secondary_tags, list):
                    for tag in secondary_tags:
                        if tag:
                            schema_progress[schema_id]["tags"]["secondary"].add(tag)
                
                # Count difficulty
                difficulty = question.get("difficulty", "Unknown")
                schema_progress[schema_id]["difficulty"][difficulty] = \
                    schema_progress[schema_id]["difficulty"].get(difficulty, 0) + 1
            
            # Convert sets to sorted lists for JSON serialization
            result = {}
            for schema_id, data in schema_progress.items():
                result[schema_id] = {
                    "count": data["count"],
                    "tags": {
                        "primary": sorted(list(data["tags"]["primary"])),
                        "secondary": sorted(list(data["tags"]["secondary"]))
                    },
                    "difficulty": data["difficulty"]
                }
            
            return result
            
        except Exception as e:
            print(f"Error fetching schema progress: {e}")
            return {}
    
    # Generation control methods removed - using process-based tracking instead
    # (All status file code removed to eliminate recursion issues)
    
    # These methods are no longer needed - UI tracks subprocess directly
    def get_generation_status(self) -> Dict[str, Any]:
        """Get current generation status - returns empty dict (not used anymore)."""
        return {}
    
    def start_generation(self, count: int = 1, workers: int = 8) -> Dict[str, Any]:
        """Start generation - no-op (UI handles subprocess directly)."""
        return {}
    
    def stop_generation(self) -> Dict[str, Any]:
        """Stop generation - no-op (UI handles subprocess directly)."""
        return {}
    
    def reset_generation(self) -> Dict[str, Any]:
        """Reset generation - no-op (UI handles subprocess directly)."""
        return {}
    
    def batch_approve_verified_questions(self) -> Dict[str, Any]:
        """
        Batch approve all questions that have passed both verifier and style judge.
        
        Returns:
            Dictionary with count of approved questions and any errors
        """
        if not self.enabled or not self.client:
            return {"approved_count": 0, "error": "Database not enabled"}
        
        try:
            # Get all pending_review questions
            response = self.client.table("ai_generated_questions").select("*").eq("status", "pending_review").execute()
            
            if not response.data:
                return {"approved_count": 0, "message": "No pending questions found"}
            
            approved_count = 0
            errors = []
            
            for question in response.data:
                try:
                    # Check verifier report
                    verifier_report = question.get("verifier_report")
                    if not verifier_report or not isinstance(verifier_report, dict):
                        continue
                    
                    verifier_verdict = verifier_report.get("verdict", "").upper()
                    if verifier_verdict != "PASS":
                        continue
                    
                    # Check style report
                    style_report = question.get("style_report")
                    if not style_report or not isinstance(style_report, dict):
                        continue
                    
                    style_verdict = style_report.get("verdict", "").upper()
                    if style_verdict != "PASS":
                        continue
                    
                    # Both passed - approve the question
                    question_id = question.get("id")
                    if not question_id:
                        continue
                    
                    update_data = {
                        "status": "approved",
                        "reviewed_at": datetime.now().isoformat(),
                        "review_notes": "Auto-approved: Passed verifier and style judge"
                    }
                    
                    self.client.table("ai_generated_questions").update(update_data).eq("id", question_id).execute()
                    approved_count += 1
                    
                except Exception as e:
                    errors.append(f"Error approving question {question.get('id', 'unknown')}: {str(e)}")
            
            result = {
                "approved_count": approved_count,
                "total_checked": len(response.data)
            }
            
            if errors:
                result["errors"] = errors
            
            return result
            
        except Exception as e:
            return {"approved_count": 0, "error": f"Batch approval failed: {str(e)}"}


