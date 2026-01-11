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


def calculate_schema_target(schema_id: str, schema_data: dict) -> int:
    """
    Calculate target based on 4+N logic.
    Formula: 4 questions per schema + 1 more per exemplar question attached to it.
    """
    exemplar_ids = schema_data.get("exemplar_ids", [])
    return 4 + len(exemplar_ids)


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
            schemas_path = Path(base_dir) / "schemas" / "Schemas_NSAA.md"
            schemas_md = read_text(str(schemas_path))
            schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=tuple(cfg.allow_schema_prefixes))
            self.schema_list = get_schemas_sorted_by_category(schemas, self.systematic_config.category_order)
            
            # Store schema titles
            for schema_id, schema_data in schemas.items():
                self.schema_titles[schema_id] = schema_data.get("title", schema_id)
            
            # Load schema coverage and calculate targets
            if self.systematic_config.schema_coverage_path:
                self.schema_coverage = load_schema_coverage(self.systematic_config.schema_coverage_path)
                for schema_id, category in self.schema_list:
                    schema_data = schemas.get(schema_id, {})
                    self.schema_targets[schema_id] = calculate_schema_target(schema_id, schema_data)
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
    
    def _get_next_available_schema(self, schema_progress: dict, active_futures: dict) -> Optional[str]:
        """
        Thread-safe method to find the next schema that needs a question.
        Takes into account both successful questions and 'in-flight' questions.
        """
        with self.lock:
            # Count how many questions are currently in-flight for each schema
            in_flight = {}
            for future in active_futures:
                _, sid = active_futures[future]
                if sid:
                    in_flight[sid] = in_flight.get(sid, 0) + 1
            
            # Find the first schema that hasn't reached its target (success + in_flight)
            for schema_id, _ in self.schema_list:
                progress = schema_progress.get(schema_id)
                if not progress: continue
                
                total_planned = progress["successful"] + in_flight.get(schema_id, 0)
                if total_planned < progress["target"]:
                    return schema_id
            
            return None

    def _get_next_available_schema(self, schema_progress: dict, active_futures: dict) -> Optional[str]:
        """
        Thread-safe method to find the next schema that needs a question.
        Takes into account both successful questions and 'in-flight' questions.
        """
        with self.lock:
            # Count how many questions are currently in-flight for each schema
            in_flight = {}
            for future in active_futures:
                _, sid = active_futures[future]
                if sid:
                    in_flight[sid] = in_flight.get(sid, 0) + 1
            
            # Find the first schema that hasn't reached its target (success + in_flight)
            for schema_id, _ in self.schema_list:
                progress = schema_progress.get(schema_id)
                if not progress: continue
                
                total_planned = progress["successful"] + in_flight.get(schema_id, 0)
                if total_planned < progress["target"]:
                    return schema_id
            
            return None

    def generate_questions(self, n_questions: int, 
                          progress_callback: Optional[Callable[[int, int], None]] = None,
                          status_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
                          max_failures: int = 20) -> List[Dict[str, Any]]:
        """
        Generate questions using concurrent workers.
        Continues generating until target successful questions are produced.
        """
        self.stats.start_time = time.time()
        self.results = []
        
        # Calculate target questions
        if self.systematic_config.mode == "systematic":
            # In systematic mode, we ignore N_ITEMS and generate everything needed by schemas
            target_questions = sum(self.schema_targets.values()) if self.schema_targets else len(self.schema_list) * self.systematic_config.questions_per_schema
        else:
            target_questions = n_questions

        print(f"\n{'='*70}")
        if self.systematic_config.mode == "systematic":
            print(f"Starting SYSTEMATIC question generation")
            print(f"Total schemas: {len(self.schema_list)}")
            print(f"Total target questions (4+N logic): {target_questions}")
        else:
            print(f"Starting concurrent question generation")
            print(f"Target: {target_questions} successful questions")
        print(f"Workers: {self.max_workers}")
        print(f"Max consecutive failures: {max_failures}")
        print(f"{'='*70}\n")
        
        question_counter = 0  # Total questions attempted
        consecutive_failures = 0  # Track consecutive failures
        
        # Schema progress tracking for systematic mode
        schema_progress = {}
        if self.systematic_config.mode == "systematic":
            for schema_id, _ in self.schema_list:
                target = self.schema_targets.get(schema_id, self.systematic_config.questions_per_schema)
                schema_progress[schema_id] = {
                    "target": target,
                    "successful": 0,
                    "status": "pending"
                }
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            active_futures = {}
            
            while self.stats.successful < target_questions:
                # Check failure limit
                if consecutive_failures >= max_failures:
                    print(f"\n{'='*70}")
                    print(f"STOPPING: Maximum consecutive failures ({max_failures}) reached!")
                    print(f"Successful: {self.stats.successful}/{target_questions}")
                    print(f"{'='*70}\n")
                    break
                
                # Submit new tasks to keep pool full
                while len(active_futures) < self.max_workers and self.stats.successful < target_questions:
                    schema_id = None
                    if self.systematic_config.mode == "systematic":
                        schema_id = self._get_next_available_schema(schema_progress, active_futures)
                        if not schema_id:
                            break  # No more schemas need work
                    
                    question_counter += 1
                    worker_id = ((question_counter - 1) % self.max_workers) + 1
                    
                    # Submit task
                    future = executor.submit(self._worker_task, worker_id, question_counter, target_questions, schema_id)
                    active_futures[future] = (question_counter, schema_id)
                
                if not active_futures:
                    break
                
                # Process completed tasks
                try:
                    # Use a short timeout to check for new spots frequently
                    for future in as_completed(active_futures.keys(), timeout=1.0):
                        question_num, used_schema_id = active_futures.pop(future)
                        
                        try:
                            result = future.result()
                            self.results.append(result)
                            
                            was_successful = result.get("success", False)
                            if was_successful:
                                consecutive_failures = 0
                                if self.systematic_config.mode == "systematic" and used_schema_id:
                                    with self.lock:
                                        schema_progress[used_schema_id]["successful"] += 1
                            else:
                                consecutive_failures += 1
                            
                            # Callbacks
                            if progress_callback:
                                progress_callback(self.stats.successful, target_questions)
                            
                            if status_callback:
                                callback_data = {
                                    "completed": question_counter,
                                    "total": target_questions,
                                    "successful": self.stats.successful,
                                    "failed": self.stats.failed,
                                    "consecutive_failures": consecutive_failures,
                                    "worker_status": {
                                        str(wid): {
                                            "state": s["state"],
                                            "schema": s["schema"],
                                            "stage": s["stage"],
                                            "message": s["message"]
                                        } for wid, s in self.worker_status.items()
                                    }
                                }
                                if self.systematic_config.mode == "systematic":
                                    callback_data["systematic"] = {"schema_progress": schema_progress}
                                status_callback(callback_data)
                                
                        except Exception as e:
                            print(f"Error retrieving result for question {question_num}: {e}")
                            consecutive_failures += 1
                        
                        # Break to re-fill pool
                        break
                        
                except Exception:
                    # Timeout error is expected, loop again to check if pool needs re-filling
                    pass
        
        self.stats.end_time = time.time()
        
        # Print summary
        print(f"\n{'='*70}")
        if self.stats.successful >= target_questions:
            print(f"Generation Complete - All Schemas Saturated!")
        elif consecutive_failures >= max_failures:
            print(f"Generation Stopped - Maximum Failures Reached")
        else:
            print(f"Generation Complete")
        print(f"{'='*70}")
        print(f"Total Required: {target_questions}")
        print(f"Total Successful: {self.stats.successful}")
        print(f"Total Attempts: {self.stats.total_questions}")
        print(f"Duration: {self.stats.duration:.1f} seconds")
        
        # Failure Analysis
        if self.stats.failed > 0 and self.results:
            print(f"\nFailure Analysis:")
            failure_reasons = {}
            for result in self.results:
                if not result.get("success", False):
                    status = result.get("status", "unknown")
                    error = result.get("error", "")
                    
                    if "api key" in str(error).lower() or "403" in str(error):
                        category = "Auth Error"
                    elif "quota" in str(error).lower() or "429" in str(error):
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
    
    # Determine mode
    mode = os.environ.get("GENERATION_MODE", "systematic")
    systematic_cfg = SystematicGenerationConfig(
        mode=mode,
        questions_per_schema=int(os.environ.get("QUESTIONS_PER_SCHEMA", "5")),
        schema_coverage_path=os.path.join(base_dir, "schema_coverage.json")
    )

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
    
    from project import get_default_models_config
    models = get_default_models_config()
    
    # Create worker manager
    manager = WorkerManager(base_dir, cfg, models, max_workers=max_workers, systematic_config=systematic_cfg)
    
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

