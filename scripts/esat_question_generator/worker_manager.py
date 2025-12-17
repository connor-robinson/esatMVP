#!/usr/bin/env python3
"""
Worker Manager for Concurrent Question Generation

Manages multiple concurrent workers generating questions using ThreadPoolExecutor.
Supports up to 8 workers with configurable concurrency.
"""

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
import threading

# Import from project.py
from project import (
    RunConfig, ModelsConfig, run_once,
    safe_load_dotenv
)


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
                 max_workers: int = 2):
        """
        Initialize worker manager.
        
        Args:
            base_dir: Base directory of question generator
            cfg: Run configuration
            models: Models configuration
            max_workers: Maximum number of concurrent workers (default: 2, max: 8)
        """
        self.base_dir = base_dir
        self.cfg = cfg
        self.models = models
        self.max_workers = min(max_workers, 8)  # Cap at 8
        
        self.stats = WorkerStats()
        self.lock = threading.Lock()
        self.results: List[Dict[str, Any]] = []
    
    def _worker_task(self, worker_id: int, question_num: int, total: int) -> Dict[str, Any]:
        """
        Task executed by a single worker.
        
        Args:
            worker_id: Unique worker identifier
            question_num: Question number (1-indexed)
            total: Total number of questions
            
        Returns:
            Result dictionary with status and question info
        """
        print(f"[Worker {worker_id}] Starting question {question_num}/{total}")
        
        try:
            result = run_once(
                base_dir=self.base_dir,
                cfg=self.cfg,
                models=self.models
            )
            
            status = result.get("status", "unknown")
            is_success = status == "accepted"
            
            with self.lock:
                self.stats.total_questions += 1
                if is_success:
                    self.stats.successful += 1
                    print(f"[Worker {worker_id}] ✓ Question {question_num} generated successfully")
                else:
                    self.stats.failed += 1
                    print(f"[Worker {worker_id}] ✗ Question {question_num} failed: {status}")
            
            return {
                "worker_id": worker_id,
                "question_num": question_num,
                "status": status,
                "success": is_success,
                "result": result
            }
            
        except Exception as e:
            with self.lock:
                self.stats.total_questions += 1
                self.stats.failed += 1
            
            print(f"[Worker {worker_id}] ✗ Question {question_num} exception: {e}")
            return {
                "worker_id": worker_id,
                "question_num": question_num,
                "status": "exception",
                "success": False,
                "error": str(e)
            }
    
    def generate_questions(self, n_questions: int, 
                          progress_callback: Optional[Callable[[int, int], None]] = None) -> List[Dict[str, Any]]:
        """
        Generate questions using concurrent workers.
        
        Args:
            n_questions: Number of questions to generate
            progress_callback: Optional callback(completed, total) for progress updates
            
        Returns:
            List of result dictionaries
        """
        self.stats.start_time = time.time()
        self.results = []
        
        print(f"\n{'='*70}")
        print(f"Starting concurrent question generation")
        print(f"Questions: {n_questions}")
        print(f"Workers: {self.max_workers}")
        print(f"{'='*70}\n")
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            futures = {}
            for i in range(n_questions):
                worker_id = (i % self.max_workers) + 1
                future = executor.submit(self._worker_task, worker_id, i + 1, n_questions)
                futures[future] = i
            
            # Collect results as they complete
            completed = 0
            for future in as_completed(futures):
                result = future.result()
                self.results.append(result)
                completed += 1
                
                if progress_callback:
                    progress_callback(completed, n_questions)
        
        self.stats.end_time = time.time()
        
        # Print summary
        print(f"\n{'='*70}")
        print(f"Generation Complete")
        print(f"{'='*70}")
        print(f"Total questions: {self.stats.total_questions}")
        print(f"Successful: {self.stats.successful}")
        print(f"Failed: {self.stats.failed}")
        print(f"Success rate: {self.stats.success_rate:.1f}%")
        print(f"Duration: {self.stats.duration:.1f} seconds")
        print(f"Average time per question: {self.stats.duration / max(self.stats.total_questions, 1):.1f} seconds")
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

