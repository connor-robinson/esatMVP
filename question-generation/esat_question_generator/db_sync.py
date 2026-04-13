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
from typing import Any, Dict, List, Optional
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
    from pipeline_log import init_pipeline_log, plog
except ImportError:

    def plog(*args, **kwargs):
        pass

    def init_pipeline_log(*args, **kwargs):
        return ""

try:
    from correct_option_reconcile import reconcile_correct_option
except ImportError:

    def reconcile_correct_option(question, distractor_map, solution=None):
        return None, None


try:
    from supabase import create_client, Client
    _SUPABASE_AVAILABLE = True
except ImportError:
    _SUPABASE_AVAILABLE = False
    plog(
        "db_sync",
        "supabase_py_missing",
        level="warning",
        detail={"hint": "pip install supabase"},
        echo=True,
        spacer=True,
    )


def canonical_ai_question_status(status: str) -> str:
    """
    Map legacy review statuses to DB values after migration ``20260126200132_restructure_ai_questions_status.sql``:
    allowed values are ``pending``, ``approved``, ``deleted`` only.
    """
    s = (status or "").strip()
    if s in ("pending_review", "needs_revision"):
        return "pending"
    if s in ("rejected",):
        return "deleted"
    if s in ("pending", "approved", "deleted"):
        return s
    return "pending"


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


def solution_text_fields_for_db(solution: Any) -> tuple[str, str]:
    """
    Map ``question_package.solution`` to ``(solution_reasoning, solution_key_insight)``
    for ``ai_generated_questions``, including folding ``steps`` / ``solution_steps``.
    """
    if not isinstance(solution, dict):
        return "", ""

    def _str_field(val: Any) -> str:
        if val is None:
            return ""
        if isinstance(val, str):
            return val
        return str(val)

    reasoning = _str_field(solution.get("reasoning"))
    if not reasoning.strip():
        try:
            from project import synthesize_reasoning_from_solution_steps

            reasoning = synthesize_reasoning_from_solution_steps(solution) or ""
        except ImportError:
            pass
    key_insight = _str_field(solution.get("key_insight"))
    return reasoning.strip(), key_insight.strip()


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
            plog(
                "db_sync",
                "credentials_missing",
                level="warning",
                detail={
                    "SUPABASE_URL": "SET" if self.supabase_url else "NOT SET",
                    "SUPABASE_SERVICE_ROLE_KEY": "SET" if self.supabase_key else "NOT SET",
                },
                echo=True,
                spacer=True,
            )
            self.client = None
            self.enabled = False
            return
        
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
            self.enabled = True
        except Exception as e:
            plog("db_sync", "client_init_error", level="error", detail={"error": str(e)}, echo=True)
            self.client = None
            self.enabled = False
    
    def sync_question(self, question_item: Dict[str, Any], status: str = "pending") -> Optional[str]:
        """
        Sync a question to the database.
        
        Only saves questions that pass both verifier and style judge.
        Questions that don't pass are not saved to the database.
        
        Args:
            question_item: Question item from pipeline (from build_bank_item)
            status: Status to assign (default: pending — use canonical_ai_question_status values)
            
        Returns:
            Database ID if successful, None otherwise (if question doesn't pass checks)
        """
        if not self.enabled or not self.client:
            plog(
                "db_sync",
                "sync_disabled",
                detail={"generation_id": question_item.get("id", "unknown")},
                echo=False,
            )
            return None
        
        gen_id = ""
        try:
            gen_id = (question_item.get("id") or "").strip()

            # Only save questions that pass both verifier and style judge
            verifier_report = question_item.get("verifier_report", {})
            style_report = question_item.get("style_report", {})
            
            verifier_verdict = verifier_report.get("verdict", "").upper() if isinstance(verifier_report, dict) else ""
            style_verdict = style_report.get("verdict", "").upper() if isinstance(style_report, dict) else ""
            
            if verifier_verdict != "PASS" or style_verdict != "PASS":
                # Don't save questions that don't pass both checks
                plog(
                    "db_sync",
                    "question_not_saved_verifier_style",
                    detail={
                        "id": question_item.get("id", "unknown"),
                        "verifier": verifier_verdict,
                        "style": style_verdict,
                    },
                    echo=False,
                )
                return None
            
            db_status = canonical_ai_question_status(status)

            if gen_id:
                existing_uuid = self.get_question_db_id(gen_id)
                if existing_uuid:
                    plog(
                        "db_sync",
                        "insert_skip_exists",
                        detail={
                            "generation_id": gen_id,
                            "db_id_prefix": (existing_uuid or "")[:8],
                        },
                        echo=False,
                    )
                    return existing_uuid
            
            # Extract question data
            question_pkg = question_item.get("question_package", {})
            question = question_pkg.get("question", {})
            solution = question_pkg.get("solution", {})
            distractor_map = question_pkg.get("distractor_map", {})
            
            # Extract correct_option; reconcile with distractor_map / solution when mismatched
            correct_option = (question.get("correct_option") or "").strip().upper()[:1]
            dm_raw = distractor_map if isinstance(distractor_map, dict) else {}
            reco, reco_reason = reconcile_correct_option(question, dm_raw, solution)
            if reco and reco in "ABCDEFGH":
                if reco != correct_option:
                    plog(
                        "db_sync",
                        "correct_option_reconciled",
                        detail={"from": correct_option or None, "to": reco, "reason": reco_reason},
                        echo=True,
                    )
                correct_option = reco
                question["correct_option"] = reco

            if not correct_option or correct_option not in "ABCDEFGH":
                letters: List[str] = []
                opts = question.get("options")
                if isinstance(opts, dict):
                    for k in opts.keys():
                        c = str(k).strip().upper()[:1]
                        if c in "ABCDEFGH":
                            letters.append(c)
                    letters = sorted(set(letters))
                correct_option = letters[0] if letters else "A"
                question["correct_option"] = correct_option
                plog(
                    "db_sync",
                    "correct_option_invalid_fallback",
                    detail={
                        "fallback": correct_option,
                        "had_option_keys": bool(letters),
                    },
                    level="warning",
                    echo=True,
                )
            
            # Extract tags if available
            tags_raw = question_item.get("tags", {})
            tags_data = tags_raw if isinstance(tags_raw, dict) else {}
            primary_tag_code = tags_data.get("primary_tag") if tags_data else None
            secondary_tags_codes = tags_data.get("secondary_tags", []) if tags_data else []
            tags_confidence_raw = tags_data.get("confidence") if tags_data else None
            tags_labeled_at = tags_data.get("labeled_at") if tags_data else None
            tags_labeled_by = tags_data.get("labeled_by") if tags_data else None

            schema_id = (question_item.get("schema_id") or "").strip()
            explicit_tt = (question_item.get("test_type") or "").strip().upper()
            # ESAT mathematics schemas use ``M_<hash>`` ids, same string pattern as TMUA Paper 1 — do not infer TMUA from prefix.
            env_tt = (os.environ.get("PIPELINE_TEST_TYPE") or "").strip().upper()
            if explicit_tt in ("ESAT", "TMUA"):
                test_type_row = explicit_tt
            elif env_tt == "TMUA":
                test_type_row = "TMUA"
            elif env_tt == "ESAT":
                test_type_row = "ESAT"
            else:
                test_type_row = "ESAT"

            raw_idea = question_item.get("idea_plan")
            idea_plan_d = raw_idea if isinstance(raw_idea, dict) else {}
            # Pipeline-only: ESAT Math 1/2 or TMUA Paper1/2 — never a DB column (use ``subjects``).
            paper = (
                question_item.get("paper")
                or tags_data.get("paper")
                or idea_plan_d.get("paper")
            )
            if test_type_row == "TMUA" and paper not in ("Paper1", "Paper2"):
                if schema_id.startswith("R_"):
                    paper = "Paper2"
                elif schema_id.startswith("M_"):
                    paper = "Paper1"

            # Map tag codes to curriculum text names (ESAT curriculum only when not TMUA schema row)
            paper_id = None
            if test_type_row == "ESAT" and schema_id:
                first_char = schema_id[0].upper()
                if first_char == "M":
                    if paper == "Math 1":
                        paper_id = "math1"
                    elif paper == "Math 2":
                        paper_id = "math2"
                    else:
                        paper_id = "math1"  # Default to math1
                elif first_char == "P":
                    paper_id = "physics"
                elif first_char == "C":
                    paper_id = "chemistry"
                elif first_char == "B":
                    paper_id = "biology"
            
            # Map tags to text if we have a paper_id and curriculum parser
            primary_tag = primary_tag_code
            secondary_tags = secondary_tags_codes
            tags_confidence = tags_confidence_raw
            
            if paper_id and (primary_tag_code or secondary_tags_codes):
                try:
                    from curriculum_parser import CurriculumParser
                    parser = CurriculumParser()
                    if primary_tag_code:
                        primary_tag = parser.map_tag_code_to_text(primary_tag_code, paper_id)
                    if secondary_tags_codes:
                        secondary_tags = [
                            parser.map_tag_code_to_text(tag, paper_id)
                            for tag in secondary_tags_codes
                        ]
                    # Map tags_confidence keys if it's a dict
                    if tags_confidence_raw and isinstance(tags_confidence_raw, dict):
                        tags_confidence = {
                            parser.map_tag_code_to_text(k, paper_id): v
                            for k, v in tags_confidence_raw.items()
                        }
                except Exception as e:
                    plog(
                        "db_sync",
                        "tag_map_failed",
                        level="warning",
                        detail={"error": str(e)},
                        echo=False,
                    )
                    # Fall back to original codes
                    primary_tag = primary_tag_code
                    secondary_tags = secondary_tags_codes
                    tags_confidence = tags_confidence_raw
            
            # DB ``subjects`` (NOT NULL): ESAT papers or TMUA Paper 1 / Paper 2
            subjects = None
            if test_type_row == "TMUA":
                if schema_id.startswith("R_"):
                    subjects = "Paper 2"
                elif schema_id.startswith("M_"):
                    subjects = "Paper 1"
                elif paper == "Paper2":
                    subjects = "Paper 2"
                elif paper == "Paper1":
                    subjects = "Paper 1"
                else:
                    subjects = "Paper 1"
            elif schema_id:
                first_char = schema_id[0].upper()
                if first_char == "M":
                    if paper == "Math 1":
                        subjects = "Math 1"
                    elif paper == "Math 2":
                        subjects = "Math 2"
                    else:
                        subjects = "Math 1"
                elif first_char == "P":
                    subjects = "Physics"
                elif first_char == "C":
                    subjects = "Chemistry"
                elif first_char == "B":
                    subjects = "Biology"
            
            reasoning_db, key_insight_db = solution_text_fields_for_db(solution)

            # Prepare database record
            snap = question_item.get("schema_block_snapshot")
            db_record = {
                "generation_id": question_item.get("id", ""),
                "schema_id": question_item.get("schema_id", ""),
                "difficulty": question_item.get("difficulty", ""),
                "status": canonical_ai_question_status(str(db_status)),
                "question_stem": question.get("stem", ""),
                "options": question.get("options", {}),
                "correct_option": correct_option,
                "solution_reasoning": reasoning_db or "",
                "solution_key_insight": key_insight_db or "",
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
            if snap and str(snap).strip():
                db_record["schema_block_snapshot"] = str(snap).strip()
            
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

            # Add subjects field (required; replaces removed ``paper`` column — see 20260126200135_rename_paper_to_subjects.sql)
            if subjects:
                db_record["subjects"] = subjects
            elif test_type_row == "TMUA":
                db_record["subjects"] = (
                    "Paper 2" if schema_id.startswith("R_") else "Paper 1"
                )
            elif schema_id:
                first_char = schema_id[0].upper()
                if first_char == "M":
                    db_record["subjects"] = "Math 1"
                elif first_char == "P":
                    db_record["subjects"] = "Physics"
                elif first_char == "C":
                    db_record["subjects"] = "Chemistry"
                elif first_char == "B":
                    db_record["subjects"] = "Biology"
                else:
                    db_record["subjects"] = "Math 1"
            else:
                db_record["subjects"] = "Math 1"

            db_record["test_type"] = test_type_row
            # PostgREST rejects unknown columns; legacy code or merges must never send ``paper``.
            db_record.pop("paper", None)

            result = self.client.table("ai_generated_questions").insert(db_record).execute()

            if result.data and len(result.data) > 0:
                db_id = result.data[0].get("id")
                plog(
                    "db_sync",
                    "insert_ok",
                    detail={
                        "generation_id": question_item.get("id", "unknown"),
                        "db_id_prefix": (db_id or "")[:8],
                    },
                    echo=False,
                )
                return db_id
            else:
                # Insert returned no data - check for errors
                error_msg = "Unknown error"
                if hasattr(result, 'error') and result.error:
                    error_msg = str(result.error)
                elif hasattr(result, 'message'):
                    error_msg = str(result.message)
                plog(
                    "db_sync",
                    "insert_failed",
                    level="warning",
                    detail={"id": question_item.get("id", "unknown"), "error": error_msg},
                    echo=False,
                )
                return None
                
        except Exception as e:
            # Only log actual errors, not expected ones
            error_str = str(e)
            
            # Ignore expected errors:
            # 23505 = duplicate key (question already exists - this is fine!)
            # 23514 = check constraint violation
            if "23505" in error_str or "duplicate" in error_str.lower():
                if gen_id:
                    existing_uuid = self.get_question_db_id(gen_id)
                    if existing_uuid:
                        plog(
                            "db_sync",
                            "insert_ok_after_duplicate",
                            detail={
                                "generation_id": gen_id,
                                "db_id_prefix": (existing_uuid or "")[:8],
                            },
                            echo=False,
                        )
                        return existing_uuid
                return None
            elif "23514" in error_str or "check constraint" in error_str.lower():
                plog(
                    "db_sync",
                    "constraint_violation",
                    level="error",
                    detail={
                        "id": question_item.get("id", "unknown"),
                        "error": error_str[:1200],
                    },
                    echo=True,
                    spacer=True,
                )
                return None
            else:
                # Unknown error - log it
                plog(
                    "db_sync",
                    "sync_exception",
                    level="error",
                    detail={
                        "id": question_item.get("id", "unknown"),
                        "error": error_str[:1200],
                    },
                    echo=True,
                    spacer=True,
                )
                return None
    
    def update_question_status(self, generation_id: str, status: str) -> bool:
        """
        Update the status of a question in the database.
        
        Args:
            generation_id: Generation ID of the question
            status: New status (pending, approved, or deleted)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            return False
        
        try:
            update_data = {
                "status": canonical_ai_question_status(status),
            }

            result = self.client.table("ai_generated_questions")\
                .update(update_data)\
                .eq("generation_id", generation_id)\
                .execute()
            
            if result.data and len(result.data) > 0:
                plog(
                    "db_sync",
                    "status_updated",
                    detail={"generation_id": generation_id, "status": status},
                    echo=False,
                )
                return True
            else:
                plog(
                    "db_sync",
                    "status_update_not_found",
                    level="warning",
                    detail={"generation_id": generation_id},
                    echo=False,
                )
                return False

        except Exception as e:
            plog(
                "db_sync",
                "status_update_error",
                level="error",
                detail={"generation_id": generation_id, "error": str(e)},
                echo=False,
            )
            return False
    
    def get_question_db_id(self, generation_id: str) -> Optional[str]:
        """Return Postgres ``id`` (uuid) for ``generation_id``, or None."""
        if not self.enabled or not self.client or not (generation_id or "").strip():
            return None
        try:
            result = (
                self.client.table("ai_generated_questions")
                .select("id")
                .eq("generation_id", generation_id.strip())
                .limit(1)
                .execute()
            )
            if result.data and len(result.data) > 0:
                return result.data[0].get("id")
        except Exception as e:
            plog("db_sync", "get_question_db_id_error", detail={"error": str(e)}, echo=False)
        return None

    def question_exists(self, generation_id: str) -> bool:
        """
        Check if a question already exists in the database.
        
        Args:
            generation_id: Generation ID to check
            
        Returns:
            True if exists, False otherwise
        """
        return self.get_question_db_id(generation_id) is not None


def sync_question_from_pipeline(question_item: Dict[str, Any], base_dir: str,
                               status: str = "pending") -> Optional[str]:
    """
    Convenience function to sync a question from the pipeline.
    
    Only saves questions that pass both verifier and style judge.
    
    Args:
        question_item: Question item from pipeline (from build_bank_item)
        base_dir: Base directory (not used, kept for compatibility)
        status: Status to assign (default: pending; legacy pending_review is mapped automatically)
        
    Returns:
        Database ID if successful, None otherwise (if question doesn't pass checks)
    """
    init_pipeline_log(base_dir)
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

