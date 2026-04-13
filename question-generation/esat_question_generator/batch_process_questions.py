#!/usr/bin/env python3
"""
Batch Question Processing Pipeline

Processes all questions in Supabase through:
1. Rewrite solutions (humanize, fix KaTeX)
2. Tag with curriculum tags
3. Verify correctness
4. Test rendering

Usage:
    python batch_process_questions.py [--batch-size 8] [--max-attempts 3] [--dry-run]
    
Note: --batch-size now specifies the number of parallel workers, not batch size.
Each worker processes a non-overlapping range of questions.
"""

import os
import sys
import json
import argparse
import uuid
import threading
import concurrent.futures
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
env_path = Path(__file__).parent.parent.parent / ".env.local"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

from project import LLMClient, load_prompts, classifier_call, ModelsConfig, read_text
from curriculum_parser import CurriculumParser, coerce_classifier_topic_code
from db_sync import (
    DatabaseSync,
    normalize_math_spacing,
    normalize_question_math_spacing,
)
from katex_validator import validate_katex_formatting
from batch_process_utils import (
    generate_run_id,
    get_processing_metadata,
    update_processing_metadata,
    build_rewriter_input,
    parse_rewriter_output,
    validate_rewriter_output,
    normalize_rewriter_output,
    map_rewriter_output_to_db,
    format_progress_message
)


class BatchProcessor:
    """Main batch processing controller."""
    
    def __init__(
        self,
        db_sync: DatabaseSync,
        llm: LLMClient,
        prompts: Any,
        models: ModelsConfig,
        curriculum_parser: CurriculumParser,
        run_id: str,
        batch_size: int = 8,
        max_attempts: int = 3,
        dry_run: bool = False,
        skip_rewrite: bool = False,
        skip_tag: bool = False
    ):
        self.db_sync = db_sync
        self.llm = llm
        self.prompts = prompts
        self.models = models
        self.curriculum_parser = curriculum_parser
        self.run_id = run_id
        self.num_workers = batch_size  # Use batch_size as number of parallel workers
        self.max_attempts = max_attempts
        self.dry_run = dry_run
        self.skip_rewrite = skip_rewrite
        self.skip_tag = skip_tag
        
        # Create run directory
        self.run_dir = Path(__file__).parent / "runs" / run_id
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.run_dir / "batch_process.log"
        
        # Statistics (thread-safe)
        self.stats = {
            "total": 0,
            "done": 0,
            "failed": 0,
            "skipped": 0
        }
        self.stats_lock = threading.Lock()
        self.log_lock = threading.Lock()
        self.db_lock = threading.Lock()  # Lock for database operations
    
    def log(self, message: str):
        """Write to both console and log file (thread-safe)."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        with self.log_lock:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(log_message + "\n")
    
    def query_pending_questions(self) -> List[Dict[str, Any]]:
        """Query questions that need processing."""
        if not self.db_sync.enabled or not self.db_sync.client:
            self.log("ERROR: Database sync not enabled")
            return []
        
        try:
            # Fetch all questions (Supabase JSONB queries are complex, so we filter in Python)
            query = self.db_sync.client.table("ai_generated_questions").select("*")
            result = query.execute()
            
            if not result.data:
                return []
            
            pending = []
            for question in result.data:
                # Skip chemistry questions (schema_id starting with "C")
                schema_id = question.get("schema_id", "")
                if schema_id and schema_id[0].upper() == "C":
                    continue  # Skip chemistry questions
                
                verifier_report = question.get("verifier_report")
                processing = get_processing_metadata(verifier_report)
                status = processing.get("status", "pending")
                
                # Only skip questions that are completely done
                # All other statuses need to be processed to completion
                if status == "done":
                    continue  # Skip only fully completed questions
                
                # Include all other statuses:
                # - "pending": Never processed
                # - "rewritten": Needs tagging, verification, render test
                # - "tagged": Needs verification, render test
                # - "verified": Needs render test
                # - "render_ok": Needs to be marked as done
                # - "failed", "needs_review": Need retry
                # - "running": Might be stuck, should retry
                pending.append(question)
            
            return pending
        
        except Exception as e:
            self.log(f"ERROR querying questions: {e}")
            import traceback
            self.log(traceback.format_exc())
            return []
    
    def _divide_questions_into_ranges(self, questions: List[Dict[str, Any]], num_workers: int) -> List[List[Dict[str, Any]]]:
        """Divide questions into non-overlapping ranges for each worker."""
        total = len(questions)
        if total == 0:
            return []
        
        questions_per_worker = total // num_workers
        remainder = total % num_workers
        
        ranges = []
        start = 0
        for i in range(num_workers):
            # Distribute remainder across first few workers
            size = questions_per_worker + (1 if i < remainder else 0)
            ranges.append(questions[start:start + size])
            start += size
        
        return ranges
    
    def stage_rewrite(self, question: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Stage 1: Rewrite solution text."""
        if self.skip_rewrite:
            # Check if already rewritten
            verifier_report = question.get("verifier_report") or {}
            processing = get_processing_metadata(verifier_report)
            if processing.get("status") in ("rewritten", "tagged", "verified", "render_ok", "done"):
                return True, None, None
            return False, None, "Skip rewrite requested but question not rewritten"
        
        max_retries = 2  # Retry up to 2 times on JSON parse errors
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                # Build input
                input_data = build_rewriter_input(question)
                expected_option_keys = list(input_data["options"].keys())
                
                # Load rewriter prompt
                prompt_path = Path(__file__).parent / "by_subject_prompts" / "Solution_Rewriter.md"
                if not prompt_path.exists():
                    return False, None, f"Rewriter prompt not found: {prompt_path}"
                
                system_prompt = read_text(str(prompt_path))
                
                # Format user prompt with JSON input
                # Add emphasis on proper JSON escaping for LaTeX
                retry_note = f"\n\n⚠️ IMPORTANT: This is attempt {attempt + 1}. " if attempt > 0 else ""
                user_prompt = f"""Input (JSON):
{json.dumps(input_data, indent=2, ensure_ascii=False)}
{retry_note}Return ONLY valid JSON with keys: key_insight_hint, solution_reasoning_katex, distractor_map

CRITICAL KaTeX/JSON RULES:
1. Use ONLY $...$ for inline math and $$...$$ for display math (NEVER use \\[ \\] or \\( \\))
2. ALL backslashes in LaTeX commands MUST be double-escaped in JSON: \\text → \\\\text, \\frac → \\\\frac
3. Every $ sign must be matched (even number of $ in each string)
4. Display math ($$...$$) must have blank lines before and after
5. Common commands: \\\\frac{{a}}{{b}}, \\\\sqrt{{x}}, \\\\text{{text}}, \\\\Delta, \\\\pi, \\\\alpha, etc.

Example CORRECT JSON:
{{
  "solution_reasoning_katex": "We calculate:\n\n$$\\nx = \\\\frac{{-b \\\\pm \\\\sqrt{{b^2 - 4ac}}}}{{2a}}\\n$$\n\nThis gives $x = 2$ or $x = -3$."
}}

Example WRONG (will cause JSON parse error):
{{
  "solution_reasoning_katex": "Use $\\frac{{a}}{{b}}$"  // ✗ Single backslash - INVALID JSON
}}

Example CORRECT:
{{
  "solution_reasoning_katex": "Use $\\\\frac{{a}}{{b}}$"  // ✓ Double backslash - VALID JSON
}}"""
                
                # Call LLM
                import time
                start_time = time.time()
                output_text = self.llm.generate(
                    model=self.models.implementer,  # Use implementer model (gemini-3-pro-preview)
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=0.3 if attempt == 0 else 0.2  # Lower temperature on retry
                )
                llm_time = time.time() - start_time
                self.log(f"[TIMING] LLM call took {llm_time:.2f}s for {question.get('id', 'unknown')[:8]}... (attempt {attempt + 1})")
                
                # Parse output
                parse_start = time.time()
                self.log(f"[DEBUG] Starting JSON parse for {question.get('id', 'unknown')[:8]}... (attempt {attempt + 1})")
                try:
                    output = parse_rewriter_output(output_text, expected_option_keys)
                except (ValueError, json.JSONDecodeError) as e:
                    last_error = str(e)
                    if attempt < max_retries:
                        self.log(f"[WARN] JSON parsing failed for {question.get('id', 'unknown')[:8]}... (attempt {attempt + 1}): {last_error[:200]}")
                        self.log(f"[RETRY] Retrying rewrite for {question.get('id', 'unknown')[:8]}...")
                        continue  # Retry
                    else:
                        self.log(f"[ERROR] JSON parsing failed after {max_retries + 1} attempts for {question.get('id', 'unknown')[:8]}...: {last_error}")
                        raise
                except Exception as e:
                    self.log(f"[ERROR] Unexpected error in JSON parsing for {question.get('id', 'unknown')[:8]}...: {e}")
                    raise
                
                parse_time = time.time() - parse_start
                if attempt > 0:
                    self.log(f"[SUCCESS] JSON parsing succeeded on attempt {attempt + 1} for {question.get('id', 'unknown')[:8]}...")
                self.log(f"[TIMING] JSON parsing took {parse_time:.2f}s for {question.get('id', 'unknown')[:8]}...")
                
                # Validate (uses fast linter + optional Node.js render test)
                self.log(f"[DEBUG] Starting validation for {question.get('id', 'unknown')[:8]}...")
                validate_start = time.time()
                try:
                    is_valid, errors = validate_rewriter_output(output, question)
                except Exception as e:
                    self.log(f"[ERROR] Validation failed for {question.get('id', 'unknown')[:8]}...: {e}")
                    import traceback
                    self.log(traceback.format_exc())
                    raise
                validate_time = time.time() - validate_start
                self.log(f"[TIMING] Validation (including KaTeX) took {validate_time:.2f}s for {question.get('id', 'unknown')[:8]}...")
                if not is_valid:
                    return False, None, f"Validation errors: {', '.join(errors)}"
                
                # Normalize
                self.log(f"[DEBUG] Starting normalization for {question.get('id', 'unknown')[:8]}...")
                normalize_start = time.time()
                try:
                    output = normalize_rewriter_output(output)
                except Exception as e:
                    self.log(f"[ERROR] Normalization failed for {question.get('id', 'unknown')[:8]}...: {e}")
                    raise
                normalize_time = time.time() - normalize_start
                self.log(f"[TIMING] Normalization took {normalize_time:.2f}s for {question.get('id', 'unknown')[:8]}...")
                
                # Map to database format
                self.log(f"[DEBUG] Starting DB mapping for {question.get('id', 'unknown')[:8]}...")
                map_start = time.time()
                try:
                    db_updates = map_rewriter_output_to_db(output)
                except Exception as e:
                    self.log(f"[ERROR] DB mapping failed for {question.get('id', 'unknown')[:8]}...: {e}")
                    raise
                map_time = time.time() - map_start
                self.log(f"[TIMING] DB mapping took {map_time:.2f}s for {question.get('id', 'unknown')[:8]}...")
                self.log(f"[DEBUG] Ready to save for {question.get('id', 'unknown')[:8]}...")
                
                return True, db_updates, None
            
            except Exception as e:
                # If this is the last attempt, return error
                if attempt >= max_retries:
                    error_msg = str(e)
                    self.log(f"ERROR in rewrite stage for {question.get('id', 'unknown')}: {error_msg}")
                    return False, None, error_msg
                # Otherwise, continue to next retry
                last_error = str(e)
                self.log(f"[WARN] Error on attempt {attempt + 1} for {question.get('id', 'unknown')[:8]}...: {last_error[:200]}")
                continue
        
        # If we get here, all retries failed
        return False, None, f"Failed after {max_retries + 1} attempts: {last_error or 'Unknown error'}"
    
    def stage_tag(self, question: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Stage 2: Assign curriculum tags."""
        if self.skip_tag:
            # Check if already tagged
            if question.get("primary_tag"):
                return True, None, None
            return False, None, "Skip tag requested but question not tagged"
        
        try:
            schema_id = question.get("schema_id", "")
            if not schema_id:
                return False, None, "Missing schema_id"
            
            # Build question package for classifier
            question_package = {
                "question": {
                    "stem": question.get("question_stem", ""),
                    "options": question.get("options", {}),
                    "correct_option": question.get("correct_option", "")
                },
                "solution": {
                    "reasoning": question.get("solution_reasoning", ""),
                    "key_insight": question.get("solution_key_insight", "")
                },
                "distractor_map": question.get("distractor_map", {})
            }
            
            # Call classifier (reuses existing logic)
            tag_result = classifier_call(
                self.llm,
                self.prompts,
                self.models,
                question_package,
                schema_id,
                self.curriculum_parser
            )
            
            # Extract tags
            primary_tag = tag_result.get("primary_tag", "")
            secondary_tags = tag_result.get("secondary_tags", [])
            tags_confidence = tag_result.get("primary_confidence", 0.0)
            
            # Normalize primary tag (coerce bare Physics/Biology digits first)
            if primary_tag:
                coerced = coerce_classifier_topic_code(schema_id, primary_tag)
                normalized_primary = self.curriculum_parser.normalize_topic_code(coerced)
                if normalized_primary:
                    primary_tag = normalized_primary
                elif coerced != primary_tag:
                    primary_tag = coerced
            
            # Normalize secondary tags
            normalized_secondary = []
            for tag in secondary_tags:
                if isinstance(tag, dict):
                    tag_code = tag.get("code", "")
                else:
                    tag_code = str(tag)
                
                if tag_code:
                    coerced = coerce_classifier_topic_code(schema_id, tag_code)
                    normalized_tag = self.curriculum_parser.normalize_topic_code(coerced)
                    if normalized_tag:
                        normalized_secondary.append(normalized_tag)
            
            # Build confidence dict
            confidence_dict = {"primary": tags_confidence}
            if isinstance(secondary_tags, list):
                for tag in secondary_tags:
                    if isinstance(tag, dict):
                        tag_code = tag.get("code", "")
                        tag_conf = tag.get("confidence", 0.0)
                        if tag_code:
                            coerced = coerce_classifier_topic_code(schema_id, tag_code)
                            normalized_tag = self.curriculum_parser.normalize_topic_code(coerced)
                            if normalized_tag:
                                confidence_dict[normalized_tag] = tag_conf
            
            # Prepare database updates
            db_updates = {
                "primary_tag": primary_tag,
                "secondary_tags": normalized_secondary,
                "tags_confidence": confidence_dict,
                "tags_labeled_at": datetime.now().isoformat(),
                "tags_labeled_by": "batch_process"
            }
            
            # For Math, sync subjects from classifier paper (``paper`` column was removed; use ``subjects``)
            if schema_id[0].upper() == "M" and "paper" in tag_result:
                p = tag_result["paper"]
                if p in ("Math 1", "Math 2"):
                    db_updates["subjects"] = p
            
            return True, db_updates, None
        
        except Exception as e:
            error_msg = str(e)
            self.log(f"ERROR in tag stage for {question.get('id', 'unknown')}: {error_msg}")
            return False, None, error_msg
    
    def stage_verify(self, question: Dict[str, Any], rewrite_updates: Optional[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
        """Stage 3: Verify rewritten solution and tags."""
        try:
            # Deterministic checks
            errors = []
            
            # Check distractor_map has all option keys
            distractor_map = rewrite_updates.get("distractor_map") if rewrite_updates else question.get("distractor_map")
            options = question.get("options", {})
            if distractor_map:
                missing_keys = set(options.keys()) - set(distractor_map.keys())
                if missing_keys:
                    errors.append(f"distractor_map missing keys: {missing_keys}")
            
            # Check KaTeX formatting (lint only in verify stage - render test in stage_render_test)
            solution_reasoning = rewrite_updates.get("solution_reasoning") if rewrite_updates else question.get("solution_reasoning")
            if solution_reasoning:
                self.log(f"[DEBUG] Validating KaTeX (lint) in verify stage for {question.get('id', 'unknown')[:8]}...")
                is_valid, katex_errors = validate_katex_formatting(solution_reasoning, skip_render_test=True)
                if not is_valid:
                    errors.extend([f"KaTeX: {e}" for e in katex_errors])
            
            # Check tags are valid
            primary_tag = question.get("primary_tag")
            if primary_tag:
                if not self.curriculum_parser.validate_topic_code(primary_tag):
                    errors.append(f"Invalid primary_tag: {primary_tag}")
            
            secondary_tags = question.get("secondary_tags", [])
            for tag in secondary_tags:
                if not self.curriculum_parser.validate_topic_code(tag):
                    errors.append(f"Invalid secondary_tag: {tag}")
            
            # Check secondary != primary
            if primary_tag and primary_tag in secondary_tags:
                errors.append(f"primary_tag {primary_tag} also in secondary_tags")
            
            # For Math: check subjects matches primary_tag (legacy rows may still have ``paper`` in memory)
            schema_id = question.get("schema_id", "")
            if schema_id[0].upper() == "M":
                subj = question.get("subjects") or question.get("paper")
                if primary_tag and subj:
                    if primary_tag.startswith("M1-") and subj != "Math 1":
                        errors.append(f"primary_tag M1-* but subjects is {subj}")
                    elif primary_tag.startswith("M2-") and subj != "Math 2":
                        errors.append(f"primary_tag M2-* but subjects is {subj}")
            
            if errors:
                return False, f"Verification failed: {', '.join(errors)}"
            
            return True, None
        
        except Exception as e:
            return False, f"Verification error: {str(e)}"
    
    def stage_render_test(self, question: Dict[str, Any], rewrite_updates: Optional[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
        """Stage 4: Test KaTeX rendering with actual KaTeX (Node.js)."""
        try:
            self.log(f"[DEBUG] Starting KaTeX render test for {question.get('id', 'unknown')[:8]}...")
            solution_reasoning = rewrite_updates.get("solution_reasoning") if rewrite_updates else question.get("solution_reasoning")
            if solution_reasoning:
                # Run full validation (lint + render test)
                is_valid, errors = validate_katex_formatting(solution_reasoning, skip_render_test=False)
                if not is_valid:
                    return False, f"KaTeX render errors: {', '.join(errors)}"
            
            # Test options
            options = question.get("options", {})
            for opt_key, opt_text in options.items():
                if opt_text:
                    is_valid, errors = validate_katex_formatting(str(opt_text), skip_render_test=False)
                    if not is_valid:
                        return False, f"KaTeX render error in option {opt_key}: {', '.join(errors)}"
            
            return True, None
        
        except Exception as e:
            return False, f"Render test error: {str(e)}"
    
    def _apply_question_update(self, question_id: str, update_data: Dict[str, Any]) -> None:
        """PATCH ai_generated_questions."""
        self.db_sync.client.table("ai_generated_questions").update(update_data).eq("id", question_id).execute()
    
    def save_stage_result(
        self,
        question_id: str,
        stage: str,
        status: str,
        updates: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> bool:
        """Save stage result to database."""
        if self.dry_run:
            if error:
                self.log(f"[DRY RUN] Would save {stage} result for {question_id[:8]}... | ERROR: {error}")
            else:
                self.log(f"[DRY RUN] Would save {stage} result for {question_id[:8]}...")
            return True
        
        if not self.db_sync.enabled or not self.db_sync.client:
            return False
        
        # Use lock to prevent concurrent database access issues
        import time
        db_operation_start = time.time()
        try:
            # Log wait time for lock (if any)
            lock_wait_start = time.time()
            with self.db_lock:
                lock_wait_time = time.time() - lock_wait_start
                if lock_wait_time > 0.1:  # Log if waiting more than 100ms for lock
                    self.log(f"[TIMING] Waited {lock_wait_time:.2f}s for DB lock for {question_id[:8]}...")
                
                # Get current question
                select_start = time.time()
                result = self.db_sync.client.table("ai_generated_questions").select("verifier_report").eq("id", question_id).execute()
                select_time = time.time() - select_start
                if select_time > 0.5:
                    self.log(f"[TIMING] DB select took {select_time:.2f}s for {question_id[:8]}...")
                if not result.data:
                    return False
                
                question = result.data[0]
                verifier_report = question.get("verifier_report") or {}
                
                # Update processing metadata
                verifier_report = update_processing_metadata(
                    verifier_report,
                    status=status,
                    stage=stage,
                    run_id=self.run_id,
                    error=error
                )
                
                # Prepare update data
                update_data = {
                    "verifier_report": verifier_report
                }
                
                # Add field updates if provided
                if updates:
                    update_data.update(updates)
                
                # Normalize math spacing in text fields
                if "solution_reasoning" in update_data or "solution_key_insight" in update_data:
                    normalized = normalize_question_math_spacing(update_data)
                    update_data.update(normalized)
                
                # Update database
                update_start = time.time()
                self._apply_question_update(question_id, update_data)
                update_time = time.time() - update_start
                if update_time > 0.5:
                    self.log(f"[TIMING] DB update took {update_time:.2f}s for {question_id[:8]}...")
                
                total_db_time = time.time() - db_operation_start
                if total_db_time > 1.0:
                    self.log(f"[TIMING] Total DB operation took {total_db_time:.2f}s for {question_id[:8]}...")
                
                return True
        
        except Exception as e:
            error_msg = str(e)
            # Check if it's a connection error that might be retryable
            is_retryable = any(keyword in error_msg.lower() for keyword in [
                "server disconnected",
                "connection",
                "timeout",
                "network",
                "temporarily unavailable"
            ])
            
            if is_retryable:
                # Retry once after a short delay (with lock)
                import time
                time.sleep(0.5)  # Brief delay before retry
                with self.db_lock:
                    try:
                        # Retry the update
                        result = self.db_sync.client.table("ai_generated_questions").select("verifier_report").eq("id", question_id).execute()
                        if result.data:
                            question = result.data[0]
                            verifier_report = question.get("verifier_report") or {}
                            verifier_report = update_processing_metadata(
                                verifier_report,
                                status=status,
                                stage=stage,
                                run_id=self.run_id,
                                error=error
                            )
                            update_data = {"verifier_report": verifier_report}
                            if updates:
                                update_data.update(updates)
                            if "solution_reasoning" in update_data or "solution_key_insight" in update_data:
                                normalized = normalize_question_math_spacing(update_data)
                                update_data.update(normalized)
                            self._apply_question_update(question_id, update_data)
                            self.log(f"Retry successful for {question_id[:8]}... after connection error")
                            return True
                    except Exception as retry_error:
                        self.log(f"ERROR saving {stage} result for {question_id[:8]}... (retry failed): {retry_error}")
                        return False
            
            self.log(f"ERROR saving {stage} result for {question_id[:8]}...: {error_msg}")
            return False
    
    def process_question(self, question: Dict[str, Any]) -> bool:
        """Process a single question through all stages."""
        question_id = question.get("id")
        if not question_id:
            self.log(f"ERROR: Question missing ID")
            return False
        
        self.log(f"Processing question {question_id[:8]}...")
        
        # Check current status to determine where to start
        verifier_report = question.get("verifier_report") or {}
        processing = get_processing_metadata(verifier_report)
        current_status = processing.get("status", "pending")
        rewrite_updates = None
        
        # Stage 1: Rewrite
        if current_status not in ("rewritten", "tagged", "verified", "render_ok", "done"):
            rewrite_success, rewrite_updates, rewrite_error = self.stage_rewrite(question)
            if not rewrite_success:
                error_msg = rewrite_error or "Unknown error in rewrite stage"
                self.log(f"✗ REWRITE FAILED for {question_id[:8]}...: {error_msg}")
                self.save_stage_result(question_id, "REWRITE_FAILED", "failed", error=error_msg)
                with self.stats_lock:
                    self.stats["failed"] += 1
                return False
            
            if rewrite_updates:
                import time
                save_start = time.time()
                self.save_stage_result(question_id, "REWRITE_OK", "rewritten", updates=rewrite_updates)
                save_time = time.time() - save_start
                self.log(f"[TIMING] Database save took {save_time:.2f}s for {question_id[:8]}...")
                
                # Update question dict with new values for next stages
                # No need to reload from DB - we already have the updated data in rewrite_updates
                question.update(rewrite_updates)
        else:
            # Already rewritten, get current values
            rewrite_updates = {
                "solution_reasoning": question.get("solution_reasoning"),
                "solution_key_insight": question.get("solution_key_insight"),
                "distractor_map": question.get("distractor_map")
            }
        
        # Stage 2: Tag
        if current_status not in ("tagged", "verified", "render_ok", "done"):
            tag_success, tag_updates, tag_error = self.stage_tag(question)
            if not tag_success:
                error_msg = tag_error or "Unknown error in tag stage"
                self.log(f"✗ TAG FAILED for {question_id[:8]}...: {error_msg}")
                self.save_stage_result(question_id, "TAG_FAILED", "failed", error=error_msg)
                with self.stats_lock:
                    self.stats["failed"] += 1
                return False
            
            if tag_updates:
                self.save_stage_result(question_id, "TAG_OK", "tagged", updates=tag_updates)
                # Update question dict with new values for next stages (no need to reload from DB)
                question.update(tag_updates)
        
        # Stage 3: Verify
        if current_status not in ("verified", "render_ok", "done"):
            verify_success, verify_error = self.stage_verify(question, rewrite_updates)
            if not verify_success:
                error_msg = verify_error or "Unknown error in verify stage"
                self.log(f"✗ VERIFY FAILED for {question_id[:8]}...: {error_msg}")
                self.save_stage_result(question_id, "VERIFY_FAILED", "failed", error=error_msg)
                with self.stats_lock:
                    self.stats["failed"] += 1
                return False
            
            self.save_stage_result(question_id, "VERIFY_OK", "verified")
        
        # Stage 4: Render Test
        if current_status not in ("render_ok", "done"):
            render_success, render_error = self.stage_render_test(question, rewrite_updates)
            if not render_success:
                error_msg = render_error or "Unknown error in render test stage"
                self.log(f"✗ RENDER TEST FAILED for {question_id[:8]}...: {error_msg}")
                self.save_stage_result(question_id, "RENDER_FAILED", "failed", error=error_msg)
                with self.stats_lock:
                    self.stats["failed"] += 1
                return False
            
            self.save_stage_result(question_id, "RENDER_OK", "render_ok")
        
        # Mark as done
        if current_status != "done":
            self.save_stage_result(question_id, "DONE", "done")
        
        with self.stats_lock:
            self.stats["done"] += 1
        return True
    
    def _worker_process_range(self, worker_id: int, question_range: List[Dict[str, Any]]) -> Dict[str, int]:
        """Process a range of questions assigned to this worker."""
        worker_stats = {"done": 0, "failed": 0}
        
        try:
            for question in question_range:
                question_id = question.get("id", "unknown")
                self.log(f"[Worker {worker_id}] Processing {question_id[:8]}...")
                
                success = self.process_question(question)
                
                if success:
                    worker_stats["done"] += 1
                else:
                    worker_stats["failed"] += 1
                    # Check if we should retry
                    if not self.dry_run and self.db_sync.enabled and self.db_sync.client:
                        result = self.db_sync.client.table("ai_generated_questions").select("verifier_report").eq("id", question_id).execute()
                        if result.data:
                            question = result.data[0]
                    
                    verifier_report = question.get("verifier_report") or {}
                    processing = get_processing_metadata(verifier_report)
                    attempts = processing.get("attempts", 0)
                    
                    if attempts >= self.max_attempts:
                        self.log(f"[Worker {worker_id}] Question {question_id[:8]}... exceeded max attempts, marking as needs_review")
                        self.save_stage_result(
                            question_id,
                            "MAX_ATTEMPTS",
                            "needs_review",
                            error=f"Exceeded {self.max_attempts} attempts"
                        )
                
                # Progress update (stats already updated in process_question)
                with self.stats_lock:
                    verifier_report = question.get("verifier_report") or {}
                    processing_meta = get_processing_metadata(verifier_report)
                    msg = format_progress_message(
                        self.stats["total"],
                        self.stats["done"],
                        self.stats["failed"],
                        question_id,
                        processing_meta.get("stage")
                    )
                    self.log(msg)
        except KeyboardInterrupt:
            self.log(f"[Worker {worker_id}] Interrupted by user")
            raise
        
        self.log(f"[Worker {worker_id}] Completed: {worker_stats['done']} done, {worker_stats['failed']} failed")
        return worker_stats
    
    def run(self):
        """Main processing loop with parallel workers. Continues until all questions are resolved."""
        self.log(f"Starting batch processing (Run ID: {self.run_id})")
        self.log(f"Workers: {self.num_workers}, Dry run: {self.dry_run}")
        self.log("Will continue processing until all questions are resolved (no max attempts limit)")
        
        iteration = 0
        max_iterations_without_progress = 10  # Safety limit to prevent infinite loops
        iterations_without_progress = 0
        last_pending_count = None
        
        while True:
            iteration += 1
            self.log("=" * 60)
            self.log(f"Iteration {iteration}: Querying pending questions...")
            
            # Query all pending questions
            pending = self.query_pending_questions()
            
            # Update total count on first iteration
            if iteration == 1:
                with self.stats_lock:
                    self.stats["total"] = len(pending)
            
            self.log(f"Found {len(pending)} questions to process")
            
            # Check if we're done
            if not pending:
                self.log("No more questions to process - all done!")
                break
            
            # Check for progress
            if last_pending_count is not None:
                if len(pending) >= last_pending_count:
                    iterations_without_progress += 1
                    self.log(f"Warning: No progress made (pending count: {len(pending)}). Iterations without progress: {iterations_without_progress}/{max_iterations_without_progress}")
                    if iterations_without_progress >= max_iterations_without_progress:
                        self.log(f"ERROR: No progress after {max_iterations_without_progress} iterations. Stopping to prevent infinite loop.")
                        self.log("Some questions may be stuck. Check logs for details.")
                        break
                else:
                    iterations_without_progress = 0  # Reset counter on progress
            last_pending_count = len(pending)
            
            # Divide questions into non-overlapping ranges for each worker
            ranges = self._divide_questions_into_ranges(pending, self.num_workers)
            
            # Log range distribution
            for i, question_range in enumerate(ranges, 1):
                if question_range:
                    self.log(f"Worker {i}: {len(question_range)} questions (IDs: {question_range[0].get('id', 'unknown')[:8]}... to {question_range[-1].get('id', 'unknown')[:8]}...)")
            
            # Process in parallel using ThreadPoolExecutor
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=self.num_workers)
            try:
                futures = [
                    executor.submit(self._worker_process_range, worker_id, question_range)
                    for worker_id, question_range in enumerate(ranges, 1)
                    if question_range  # Only submit if range is not empty
                ]
                
                # Wait for all workers to complete, with interrupt handling
                try:
                    for future in concurrent.futures.as_completed(futures):
                        try:
                            worker_stats = future.result(timeout=None)
                        except KeyboardInterrupt:
                            self.log("\n[INTERRUPT] Keyboard interrupt detected, shutting down workers...")
                            raise
                        except Exception as e:
                            self.log(f"ERROR: Worker failed with exception: {e}")
                            import traceback
                            self.log(traceback.format_exc())
                except KeyboardInterrupt:
                    self.log("\n[INTERRUPT] Cancelling all pending workers...")
                    # Cancel all pending futures
                    for future in futures:
                        future.cancel()
                    # Shutdown executor immediately
                    try:
                        # cancel_futures parameter available in Python 3.9+
                        executor.shutdown(wait=False, cancel_futures=True)
                    except TypeError:
                        # Fallback for older Python versions
                        executor.shutdown(wait=False)
                    raise
            finally:
                # Ensure executor is properly shut down
                try:
                    try:
                        executor.shutdown(wait=False, cancel_futures=True)
                    except TypeError:
                        executor.shutdown(wait=False)
                except Exception:
                    pass
            
            # Log progress after iteration
            with self.stats_lock:
                self.log(f"Progress after iteration {iteration}: Done: {self.stats['done']}, Failed: {self.stats['failed']}")
        
        # Final summary
        self.log("=" * 60)
        self.log(f"Batch processing complete after {iteration} iteration(s)!")
        with self.stats_lock:
            self.log(f"Total: {self.stats['total']}")
            self.log(f"Done: {self.stats['done']}")
            self.log(f"Failed: {self.stats['failed']}")
        self.log(f"Run ID: {self.run_id}")
        self.log(f"Log file: {self.log_file}")


def main():
    parser = argparse.ArgumentParser(description="Batch process questions in Supabase")
    parser.add_argument("--batch-size", type=int, default=8, help="Number of parallel workers to process questions")
    parser.add_argument("--max-attempts", type=int, default=3, help="Max retries per question")
    parser.add_argument("--resume-run-id", type=str, help="Resume from specific run ID")
    parser.add_argument("--dry-run", action="store_true", help="Don't save to database")
    parser.add_argument("--skip-rewrite", action="store_true", help="Skip rewrite stage")
    parser.add_argument("--skip-tag", action="store_true", help="Skip tag stage")
    
    args = parser.parse_args()
    
    cloud_project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    cloud_location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()
    if not cloud_project or not cloud_location:
        print("ERROR: Missing GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_LOCATION")
        sys.exit(1)
    
    # Initialize components
    db_sync = DatabaseSync()
    if not db_sync.enabled:
        print("ERROR: Database sync not enabled. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    llm = LLMClient(api_key="")
    
    # Load prompts
    base_dir = Path(__file__).parent
    try:
        prompts = load_prompts(str(base_dir))
    except Exception as e:
        print(f"ERROR loading prompts: {e}")
        sys.exit(1)
    
    # Load models config
    models = ModelsConfig(
        implementer="gemini-2.5-pro",  # Changed from gemini-3-pro-preview to avoid quota limits
        classifier=os.environ.get("MODEL_CLASSIFIER", "gemini-2.5-flash"),
    )
    
    # Load curriculum parser
    curriculum_file = base_dir / "curriculum" / "ESAT_CURRICULUM.json"
    try:
        curriculum_parser = CurriculumParser(str(curriculum_file))
    except Exception as e:
        print(f"ERROR loading curriculum: {e}")
        sys.exit(1)
    
    # Generate or use provided run ID
    run_id = args.resume_run_id or generate_run_id()
    
    # Create processor
    processor = BatchProcessor(
        db_sync=db_sync,
        llm=llm,
        prompts=prompts,
        models=models,
        curriculum_parser=curriculum_parser,
        run_id=run_id,
        batch_size=args.batch_size,
        max_attempts=args.max_attempts,
        dry_run=args.dry_run,
        skip_rewrite=args.skip_rewrite,
        skip_tag=args.skip_tag
    )
    
    # Run processing
    try:
        processor.run()
    except KeyboardInterrupt:
        print("\n\n[INTERRUPT] Keyboard interrupt received. Shutting down gracefully...")
        print("Progress has been saved. You can resume with --resume-run-id if needed.")
        print(f"Run ID: {processor.run_id}")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

