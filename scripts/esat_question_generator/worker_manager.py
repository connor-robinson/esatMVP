#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Worker Manager for Concurrent Question Generation

Manages multiple concurrent workers generating questions using ThreadPoolExecutor.
Supports up to 8 workers with configurable concurrency.
"""

import os
import sys
import time
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass
import threading

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

# Import from project.py
from project import (
    RunConfig, ModelsConfig, run_once,
    safe_load_dotenv, get_schemas_sorted_by_category,
    read_text, parse_schemas_from_markdown
)


def load_schema_coverage(coverage_path: str) -> Dict[str, Dict[str, int]]:
    """Load schema coverage JSON and return as dict."""
    try:
        if not os.path.exists(coverage_path):
            print(f"Warning: Schema coverage file not found at {coverage_path}, using defaults")
            return {}
        with open(coverage_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load schema coverage: {e}, using defaults")
        return {}


def calculate_schema_target(schema_id: str, coverage: Dict[str, Dict[str, int]]) -> int:
    """Calculate target: 5 + existing total."""
    existing = coverage.get(schema_id, {}).get("total", 0)
    return 5 + existing


@dataclass
class SystematicGenerationConfig:
    """Configuration for systematic generation mode."""
    mode: str = "random"  # "random" or "systematic"
    category_order: List[str] = None  # e.g., ["M", "P", "B", "C"]
    questions_per_schema: int = 10  # Number of questions per schema (used as fallback)
    schema_coverage_path: Optional[str] = None  # Path to schema_coverage.json
    
    def __post_init__(self):
        if self.category_order is None:
            self.category_order = ["M", "P", "B", "C"]


@dataclass
class WorkerStats:
    """Statistics for worker execution."""
    total_questions: int = 0
    successful: int = 0
    failed: int = 0
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    
    @property
    def duration(self) -> float:
        """Get duration in seconds."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0.0
    
    @property
    def success_rate(self) -> float:
        """Get success rate as percentage."""
        if self.total_questions == 0:
            return 0.0
        return (self.successful / self.total_questions) * 100


class WorkerManager:
    """Manages concurrent question generation workers."""
    
    def __init__(self, base_dir: str, cfg: RunConfig, models: ModelsConfig,
                 max_workers: int = 2, systematic_config: Optional[SystematicGenerationConfig] = None):
        """
        Initialize worker manager.
        
        Args:
            base_dir: Base directory of question generator
            cfg: Run configuration
            models: Models configuration
            max_workers: Maximum number of concurrent workers (default: 2, max: 8)
            systematic_config: Configuration for systematic generation mode
        """
        self.base_dir = base_dir
        self.cfg = cfg
        self.models = models
        self.max_workers = min(max_workers, 8)  # Cap at 8
        self.systematic_config = systematic_config or SystematicGenerationConfig()
        
        self.stats = WorkerStats()
        self.lock = threading.Lock()
        self.results: List[Dict[str, Any]] = []
        
        # Worker status tracking
        self.worker_status: Dict[int, Dict[str, Any]] = {}
        for i in range(1, self.max_workers + 1):
            self.worker_status[i] = {
                "state": "idle",
                "schema": None,
                "stage": None,
                "message": ""
            }
        
        # Systematic generation state
        self.current_schema_index = 0
        self.current_schema_questions = 0
        self.schema_list: List[Tuple[str, str]] = []  # List of (schema_id, category) tuples
        self.schema_coverage: Dict[str, Dict[str, int]] = {}  # Schema coverage data
        self.schema_targets: Dict[str, int] = {}  # Calculated targets per schema
        self.schema_titles: Dict[str, str] = {}  # Schema titles for display
        
        if self.systematic_config.mode == "systematic":
            # Load and sort schemas
            schemas_md = read_text(os.path.join(base_dir, "1. Designer", "Schemas.md"))
            schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=tuple(cfg.allow_schema_prefixes))
            self.schema_list = get_schemas_sorted_by_category(schemas, self.systematic_config.category_order)
            
            # Store schema titles
            for schema_id, schema_data in schemas.items():
                self.schema_titles[schema_id] = schema_data.get("title", schema_id)
            
            # Load schema coverage and calculate targets
            if self.systematic_config.schema_coverage_path:
                self.schema_coverage = load_schema_coverage(self.systematic_config.schema_coverage_path)
                for schema_id, category in self.schema_list:
                    self.schema_targets[schema_id] = calculate_schema_target(schema_id, self.schema_coverage)
            else:
                # Fallback: use questions_per_schema for all schemas
                for schema_id, category in self.schema_list:
                    self.schema_targets[schema_id] = self.systematic_config.questions_per_schema
    
    def _update_worker_status(self, worker_id: int, state: str, schema: Optional[str] = None, 
                             stage: Optional[str] = None, message: str = ""):
        """Update worker status in memory (status_callback will write to file)."""
        with self.lock:
            self.worker_status[worker_id] = {
                "state": state,
                "schema": schema,
                "stage": stage,
                "message": message
            }
    
    def _worker_task(self, worker_id: int, question_num: int, total: int, schema_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Task executed by a single worker.
        
        Args:
            worker_id: Unique worker identifier
            question_num: Question number (1-indexed)
            total: Total number of questions
            schema_id: Optional schema ID to use (for systematic generation)
            
        Returns:
            Result dictionary with status and question info
        """
        # Update worker status: starting
        self._update_worker_status(worker_id, "starting", schema_id, "connecting", "Connecting to Gemini...")
        print(f"[Worker {worker_id}] Starting question {question_num} (target: {total} successful)")
        
        try:
            # Create callbacks to track worker stages
            def on_stage_start(stage, msg):
                stage_lower = stage.lower().replace(" ", "_")
                if msg:
                    message = f"{stage}: {msg}"
                else:
                    # Default messages for each stage
                    stage_messages = {
                        "designer": "Designing question idea...",
                        "implementer": "Implementing question...",
                        "verifier": "Verifying question correctness...",
                        "style judge": "Checking exam authenticity...",
                        "tag labeler": "Assigning curriculum tags..."
                    }
                    message = stage_messages.get(stage_lower, f"{stage}...")
                self._update_worker_status(worker_id, "working", schema_id, stage_lower, message)
            
            def on_stage_complete(stage, result):
                # Move to next stage or continue
                self._update_worker_status(worker_id, "working", schema_id, None, f"Completed {stage}")
            
            def on_stage_error(stage, error):
                stage_lower = stage.lower().replace(" ", "_")
                error_msg = str(error)[:60]  # Limit length
                self._update_worker_status(worker_id, "working", schema_id, stage_lower, f"Error: {error_msg}")
            
            worker_callbacks = {
                "on_stage_start": on_stage_start,
                "on_stage_complete": on_stage_complete,
                "on_stage_error": on_stage_error
            }
            
            result = run_once(
                base_dir=self.base_dir,
                cfg=self.cfg,
                models=self.models,
                forced_schema_id=schema_id,
                callbacks=worker_callbacks
            )
            
            status = result.get("status", "unknown")
            is_success = status == "accepted"
            
            # Extract error details for debugging
            error_details = None
            if "error" in result:
                error_details = result["error"]
            elif not is_success:
                # Try to get error from the result
                run_dir = result.get("run_dir", "")
                if run_dir:
                    # Could read logs here, but for now just use status
                    error_details = f"Status: {status}"
            
            with self.lock:
                self.stats.total_questions += 1
                if is_success:
                    self.stats.successful += 1
                    # Update worker status: completed successfully
                    self._update_worker_status(worker_id, "idle", None, None, "")
                else:
                    self.stats.failed += 1
                    # Update worker status: failed
                    self._update_worker_status(worker_id, "idle", None, None, f"Failed: {status}")
            
            return {
                "worker_id": worker_id,
                "question_num": question_num,
                "status": status,
                "success": is_success,
                "result": result,
                "error": error_details
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            
            with self.lock:
                self.stats.total_questions += 1
                self.stats.failed += 1
                # Update worker status: exception
                self._update_worker_status(worker_id, "idle", None, None, f"Exception: {str(e)[:50]}")
            
            try:
                print(f"[Worker {worker_id}] ✗ Question {question_num} exception: {e}")
            except UnicodeEncodeError:
                print(f"[Worker {worker_id}] [ERROR] Question {question_num} exception: {e}")
            
            # Print full traceback for debugging
            print(f"[Worker {worker_id}] Full traceback:\n{error_trace}")
            
            return {
                "worker_id": worker_id,
                "question_num": question_num,
                "status": "exception",
                "success": False,
                "error": str(e),
                "traceback": error_trace
            }
    
    def generate_questions(self, n_questions: int, 
                          progress_callback: Optional[Callable[[int, int], None]] = None,
                          status_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
                          max_failures: int = 20) -> List[Dict[str, Any]]:
        """
        Generate questions using concurrent workers.
        Continues generating until n_questions successful questions are produced.
        
        Args:
            n_questions: Number of successful questions to generate
            progress_callback: Optional callback(completed, total) for progress updates
            status_callback: Optional callback for detailed status updates
            max_failures: Maximum number of consecutive failures before stopping (default: 20)
            
        Returns:
            List of result dictionaries
        """
        self.stats.start_time = time.time()
        self.results = []
        
        # Initialize systematic generation state
        if self.systematic_config.mode == "systematic":
            self.current_schema_index = 0
            self.current_schema_questions = 0
            if not self.schema_list:
                raise ValueError("No schemas available for systematic generation")
            print(f"\n{'='*70}")
            print(f"Starting SYSTEMATIC question generation")
            print(f"Total schemas: {len(self.schema_list)}")
            print(f"Questions per schema: {self.systematic_config.questions_per_schema}")
            print(f"Total target: {len(self.schema_list) * self.systematic_config.questions_per_schema} questions")
            print(f"Workers: {self.max_workers}")
            print(f"Max consecutive failures: {max_failures}")
            print(f"{'='*70}\n")
        else:
            print(f"\n{'='*70}")
            print(f"Starting concurrent question generation")
            print(f"Target: {n_questions} successful questions")
            print(f"Workers: {self.max_workers}")
            print(f"Max consecutive failures: {max_failures}")
            print(f"{'='*70}\n")
        
        question_counter = 0  # Total questions attempted
        consecutive_failures = 0  # Track consecutive failures
        
        # Schema progress tracking for systematic mode
        schema_progress = {}  # schema_id -> {"target": int, "successful": int, "status": str}
        if self.systematic_config.mode == "systematic":
            for schema_id, category in self.schema_list:
                target = self.schema_targets.get(schema_id, self.systematic_config.questions_per_schema)
                schema_progress[schema_id] = {
                    "target": target,
                    "successful": 0,
                    "status": "pending"
                }
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Keep a pool of active futures
            active_futures = {}
            
            # Calculate target questions
            if self.systematic_config.mode == "random":
                target_questions = n_questions
            else:
                # Calculate total from schema targets
                target_questions = sum(self.schema_targets.values()) if self.schema_targets else len(self.schema_list) * self.systematic_config.questions_per_schema
            
            # Keep generating until we have enough successful questions
            while self.stats.successful < target_questions:
                # No stop checking needed - UI will terminate process directly
                
                # Check if we've hit the failure limit
                if consecutive_failures >= max_failures:
                    print(f"\n{'='*70}")
                    print(f"STOPPING: Maximum consecutive failures ({max_failures}) reached!")
                    print(f"Successful: {self.stats.successful}/{n_questions}")
                    print(f"Total attempts: {self.stats.total_questions}")
                    print(f"Failed: {self.stats.failed}")
                    print(f"{'='*70}\n")
                    break
                
                # Determine current schema for systematic generation
                current_schema_id = None
                if self.systematic_config.mode == "systematic":
                    # Check if we've completed current schema
                    if self.current_schema_index < len(self.schema_list):
                        current_schema_id, current_category = self.schema_list[self.current_schema_index]
                        current_schema_stats = schema_progress[current_schema_id]
                        
                        # Check if we've generated enough for this schema
                        if current_schema_stats["successful"] >= current_schema_stats["target"]:
                            # Move to next schema
                            current_schema_stats["status"] = "complete"
                            self.current_schema_index += 1
                            self.current_schema_questions = 0
                            
                            if self.current_schema_index >= len(self.schema_list):
                                # All schemas complete
                                print(f"\n{'='*70}")
                                print(f"All schemas completed!")
                                print(f"Total successful: {self.stats.successful}")
                                print(f"{'='*70}\n")
                                break
                            
                            current_schema_id, current_category = self.schema_list[self.current_schema_index]
                            current_schema_stats = schema_progress[current_schema_id]
                            current_schema_stats["status"] = "in_progress"
                            print(f"\n[SYSTEMATIC] Moving to schema {current_schema_id} ({current_category})")
                    else:
                        # All schemas done
                        break
                
                # Submit new tasks to keep the pool full
                if self.systematic_config.mode == "random":
                    target_questions = n_questions
                else:
                    # Calculate total from schema targets
                    target_questions = sum(self.schema_targets.values()) if self.schema_targets else len(self.schema_list) * self.systematic_config.questions_per_schema
                
                while len(active_futures) < self.max_workers and self.stats.successful < target_questions:
                    question_counter += 1
                    worker_id = ((question_counter - 1) % self.max_workers) + 1
                    
                    # In systematic mode, only submit if current schema needs more questions
                    if self.systematic_config.mode == "systematic":
                        if current_schema_id and schema_progress[current_schema_id]["successful"] >= schema_progress[current_schema_id]["target"]:
                            break  # Current schema is done, will move to next in next iteration
                    
                    print(f"[DEBUG] Submitting question {question_counter} (Worker {worker_id})" + 
                          (f" [Schema: {current_schema_id}]" if current_schema_id else ""))
                    future = executor.submit(self._worker_task, worker_id, question_counter, target_questions, current_schema_id)
                    active_futures[future] = (question_counter, current_schema_id)
                
                # Wait for at least one task to complete
                if not active_futures:
                    print("[DEBUG] No active futures, exiting loop")
                    break
                
                # Process one completed task at a time
                try:
                    # Use timeout to prevent hanging
                    for future in as_completed(active_futures.keys(), timeout=300):  # 5 minute timeout
                        question_num, used_schema_id = active_futures.pop(future)
                        
                        # No stop checking needed - UI will terminate process directly
                        
                        try:
                            result = future.result()
                            self.results.append(result)
                            
                            # Check if this was successful
                            was_successful = result.get("success", False)
                            
                            if was_successful:
                                consecutive_failures = 0  # Reset failure counter
                                # Update schema progress in systematic mode
                                if self.systematic_config.mode == "systematic" and used_schema_id:
                                    if used_schema_id in schema_progress:
                                        schema_progress[used_schema_id]["successful"] += 1
                                        self.current_schema_questions += 1
                                # Silent - progress shown in status file
                            else:
                                consecutive_failures += 1
                                # Silent - failures tracked in status
                            
                            # Update callbacks
                            if self.systematic_config.mode == "random":
                                target_questions = n_questions
                            else:
                                # Calculate total from schema targets
                                target_questions = sum(self.schema_targets.values()) if self.schema_targets else len(self.schema_list) * self.systematic_config.questions_per_schema
                            
                            if progress_callback:
                                progress_callback(self.stats.successful, target_questions)
                            
                            if status_callback:
                                callback_data = {
                                    "completed": question_counter,
                                    "total": target_questions,
                                    "successful": self.stats.successful,
                                    "failed": self.stats.failed,
                                    "consecutive_failures": consecutive_failures,
                                }
                                # Add worker status
                                callback_data["worker_status"] = {
                                    str(wid): {
                                        "state": status["state"],
                                        "schema": status["schema"],
                                        "stage": status["stage"],
                                        "message": status["message"]
                                    }
                                    for wid, status in self.worker_status.items()
                                }
                                # Add systematic generation info
                                if self.systematic_config.mode == "systematic":
                                    current_schema_id = None
                                    current_schema_progress = None
                                    if self.current_schema_index < len(self.schema_list):
                                        current_schema_id, current_category = self.schema_list[self.current_schema_index]
                                        current_schema_stats = schema_progress.get(current_schema_id, {})
                                        current_schema_progress = {
                                            "target": current_schema_stats.get("target", 0),
                                            "successful": current_schema_stats.get("successful", 0),
                                            "remaining": max(0, current_schema_stats.get("target", 0) - current_schema_stats.get("successful", 0))
                                        }
                                    
                                    callback_data["systematic"] = {
                                        "current_schema_index": self.current_schema_index,
                                        "current_schema": current_schema_id,
                                        "current_schema_title": self.schema_titles.get(current_schema_id, current_schema_id) if current_schema_id else None,
                                        "current_schema_progress": current_schema_progress,
                                        "schema_progress": schema_progress,
                                    }
                                status_callback(callback_data)
                            
                            # Break to continue outer loop and submit new tasks if needed
                            break
                        except Exception as e:
                            # Task raised an exception
                            consecutive_failures += 1
                            print(f"[ERROR] Question {question_num} raised exception: {e}")
                            import traceback
                            print(f"[ERROR] Traceback: {traceback.format_exc()}")
                            break
                except TimeoutError:
                    print(f"[WARNING] Timeout waiting for task completion. Active futures: {len(active_futures)}")
                    # Remove timed out futures (this shouldn't happen, but handle it)
                    break
                
                # Break if we have enough successful questions
                if self.systematic_config.mode == "random":
                    target_questions = n_questions
                else:
                    # Calculate total from schema targets
                    target_questions = sum(self.schema_targets.values()) if self.schema_targets else len(self.schema_list) * self.systematic_config.questions_per_schema
                
                if self.stats.successful >= target_questions:
                    print(f"[DEBUG] Target reached: {self.stats.successful} successful questions")
                    break
                
                # Break if we've hit the failure limit
                if consecutive_failures >= max_failures:
                    break
        
        self.stats.end_time = time.time()
        
        # Print summary
        if self.systematic_config.mode == "random":
            target_questions = n_questions
        else:
            # Calculate total from schema targets
            target_questions = sum(self.schema_targets.values()) if self.schema_targets else len(self.schema_list) * self.systematic_config.questions_per_schema
        
        print(f"\n{'='*70}")
        if self.stats.successful >= target_questions:
            print(f"Generation Complete - Target Reached!")
        elif consecutive_failures >= max_failures:
            print(f"Generation Stopped - Maximum Failures Reached")
        else:
            print(f"Generation Complete")
        print(f"{'='*70}")
        print(f"Target: {target_questions} successful questions")
        if self.systematic_config.mode == "systematic":
            print(f"Mode: Systematic (by schema)")
            print(f"Schemas completed: {self.current_schema_index}/{len(self.schema_list)}")
        print(f"Total attempts: {self.stats.total_questions}")
        print(f"Successful: {self.stats.successful}")
        print(f"Failed: {self.stats.failed}")
        if consecutive_failures >= max_failures:
            print(f"Consecutive failures: {consecutive_failures} (limit: {max_failures})")
        if self.stats.total_questions > 0:
            print(f"Success rate: {self.stats.success_rate:.1f}%")
        print(f"Duration: {self.stats.duration:.1f} seconds")
        if self.stats.total_questions > 0:
            print(f"Average time per question: {self.stats.duration / self.stats.total_questions:.1f} seconds")
        
        # Analyze failure reasons if we have failures
        if self.stats.failed > 0 and self.results:
            print(f"\nFailure Analysis:")
            failure_reasons = {}
            for result in self.results:
                if not result.get("success", False):
                    status = result.get("status", "unknown")
                    error = result.get("error", "")
                    
                    # Categorize failures
                    if "api key" in str(error).lower() or "permission_denied" in str(error).lower() or "403" in str(error):
                        category = "API Key Error"
                    elif "yaml" in str(error).lower() or "parsing" in str(error).lower():
                        category = "YAML Parsing Error"
                    elif "quota" in str(error).lower() or "rate limit" in str(error).lower():
                        category = "Rate Limit/Quota"
                    else:
                        category = status
                    
                    failure_reasons[category] = failure_reasons.get(category, 0) + 1
            
            for reason, count in sorted(failure_reasons.items(), key=lambda x: x[1], reverse=True):
                print(f"  - {reason}: {count}")
        
        print(f"{'='*70}\n")
        
        return self.results


def main():
    """Main entry point for worker manager."""
    # Load environment
    safe_load_dotenv(".env.local")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Configuration
    max_workers = int(os.environ.get("MAX_WORKERS", "2"))
    n_questions = int(os.environ.get("N_ITEMS", "5"))
    
    cfg = RunConfig(
        max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
        max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
        seed=int(os.environ["SEED"]) if os.environ.get("SEED") else None,
        difficulty_weights={
            "Easy": float(os.environ.get("W_EASY", "0.3")),
            "Medium": float(os.environ.get("W_MED", "0.5")),
            "Hard": float(os.environ.get("W_HARD", "0.2")),
        },
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=tuple(os.environ.get("SCHEMA_PREFIXES", "M,P").split(",")),
    )
    
    models = ModelsConfig(
        designer=os.environ.get("MODEL_DESIGNER", "gemini-3-pro-preview"),
        implementer=os.environ.get("MODEL_IMPLEMENTER", "gemini-3-pro-preview"),
        verifier=os.environ.get("MODEL_VERIFIER", "gemini-3-pro-preview"),
        style_judge=os.environ.get("MODEL_STYLE", "gemini-2.5-flash"),
    )
    
    # Create worker manager
    manager = WorkerManager(base_dir, cfg, models, max_workers=max_workers)
    
    # Progress callback
    def progress(completed, total):
        print(f"Progress: {completed}/{total} questions completed ({completed/total*100:.1f}%)")
    
    # Generate questions
    results = manager.generate_questions(n_questions, progress_callback=progress)
    
    # Return exit code based on results
    if manager.stats.successful > 0:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

