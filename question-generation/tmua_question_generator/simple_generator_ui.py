#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TMUA Simple Question Generator UI

A clean, hands-off Tkinter interface for batch question generation.
Works systematically through schemas (Paper 1 → Paper 2), saves immediately to Supabase and local backup.
"""

import os
import sys
import re
import json
import time
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import OrderedDict

# Import curriculum parser for tag labeling
try:
    from curriculum_parser import CurriculumParser
    CURRICULUM_PARSER_AVAILABLE = True
except ImportError:
    CURRICULUM_PARSER_AVAILABLE = False
    print("Warning: curriculum_parser not available. Tag labeling will be disabled.")

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Import from project.py
from project import (
    RunConfig, ModelsConfig, run_once, parse_schemas_from_markdown, read_text,
    safe_load_dotenv, choose_difficulty, get_default_models_config,
    is_tmua_allow_schema_prefixes,
    normalize_tmua_difficulty_weights,
)

# Import database sync
try:
    from db_sync import sync_question_from_pipeline
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("Warning: Supabase not available")


def _schema_prefixes_from_env_tuple() -> Tuple[str, ...]:
    raw = os.environ.get("SCHEMA_PREFIXES", "M,R")
    return tuple(p.strip() for p in raw.split(",") if p.strip())


class SchemaQueue:
    """Manages the queue of schemas to generate questions for."""
    
    def __init__(
        self,
        schemas: Dict[str, dict],
        coverage: Dict[str, int],
        paper_schema_map: Dict[str, str],  # Maps schema_id -> "Paper1" or "Paper2"
        supabase_client=None,
        start_offsets: Optional[Dict[str, int]] = None,
        stop_offsets: Optional[Dict[str, int]] = None,
    ):
        """
        Initialize schema queue.

        Args:
            schemas: Dict of {schema_id: {"block": text, "title": text}}
            coverage: Dict of {schema_id: current_count} from database
            paper_schema_map: Dict mapping schema_id -> "Paper1" or "Paper2"
            supabase_client: Optional Supabase client for refreshing coverage
            start_offsets: Optional dict of {prefix: start_index}, e.g. {"M": 0, "R": 0}
                to start from a specific index in the ordered list
            stop_offsets: Optional dict of {prefix: stop_index}, e.g. {"M": 50, "R": 50}
                to stop at a specific index (exclusive)
        """
        self.schemas = schemas
        self.coverage = coverage  # Current counts from DB
        self.generated = {sid: 0 for sid in schemas.keys()}  # Counts in this session
        self.paper_schema_map = paper_schema_map  # Track which paper each schema belongs to
        self.supabase = supabase_client
        self.start_offsets = start_offsets or {}
        self.stop_offsets = stop_offsets or {}
        self.queue_lock = threading.Lock()  # Lock for thread-safe queue operations
        
        # Order schemas: Paper 1 (M_) first, then Paper 2 (R_)
        self.ordered_schema_ids = self._order_schemas(list(schemas.keys()))
        
    def _order_schemas(self, schema_ids: List[str]) -> List[str]:
        """Order schemas by paper (Paper 1 first, then Paper 2), then by schema ID."""
        # Group schemas by paper
        paper1_schemas = [sid for sid in schema_ids if self.paper_schema_map.get(sid) == "Paper1"]
        paper2_schemas = [sid for sid in schema_ids if self.paper_schema_map.get(sid) == "Paper2"]
        
        # Sort within each paper by schema ID (alphabetically for M_xxx and R_xxx)
        paper1_schemas.sort()
        paper2_schemas.sort()
        
        # Combine: Paper 1 first, then Paper 2
        ordered = paper1_schemas + paper2_schemas
        
        # Apply start/stop offsets if provided
        if not self.start_offsets and not self.stop_offsets:
            return ordered
        
        filtered: List[str] = []
        paper1_count = sum(1 for sid in ordered if self.paper_schema_map.get(sid) == "Paper1")
        
        for idx, sid in enumerate(ordered):
            paper = self.paper_schema_map.get(sid, "Paper1")
            
            # Determine which prefix to use for offset checking
            prefix = "M" if paper == "Paper1" else "R"
            
            # Check start offset
            start_idx = self.start_offsets.get(prefix)
            if start_idx is not None:
                # Adjust index based on paper
                if paper == "Paper2":
                    paper_idx = idx - paper1_count
                    if paper_idx < start_idx:
                        continue
                else:
                    if idx < start_idx:
                        continue
            
            # Check stop offset
            stop_idx = self.stop_offsets.get(prefix)
            if stop_idx is not None:
                if paper == "Paper2":
                    paper_idx = idx - paper1_count
                    if paper_idx >= stop_idx:
                        continue
                else:
                    if idx >= stop_idx:
                        continue
            
            filtered.append(sid)
        
        return filtered
    
    def get_required_count(self, schema_id: str) -> int:
        """
        Get required question count for a schema.
        
        Formula: 4 questions per schema + 1 more per exemplar question attached to it.
        """
        schema_data = self.schemas.get(schema_id, {})
        exemplar_ids = schema_data.get("exemplar_ids", [])
        return 4 + len(exemplar_ids)
    
    def get_current_count(self, schema_id: str) -> int:
        """
        Get current question count from DB plus in-flight session-generated questions.
        
        This includes both:
        - Questions already saved to DB (from coverage)
        - Questions generated in this session that are in-flight (from generated dict)
        """
        db_count = self.coverage.get(schema_id, 0)
        session_count = self.generated.get(schema_id, 0)
        return db_count + session_count
    
    def is_complete(self, schema_id: str) -> bool:
        """Check if schema has met its requirement."""
        return self.get_current_count(schema_id) >= self.get_required_count(schema_id)
    
    def refresh_coverage_from_db(self):
        """Refresh coverage counts from Supabase database."""
        if not self.supabase:
            return  # Can't refresh without Supabase
        
        try:
            # Query Supabase for current counts
            response = self.supabase.table("ai_generated_questions").select("schema_id").execute()
            
            # Count questions per schema
            new_coverage = {}
            if response.data:
                for row in response.data:
                    schema_id = row.get("schema_id")
                    if schema_id:  # Skip rows with missing schema_id
                        new_coverage[schema_id] = new_coverage.get(schema_id, 0) + 1
            
            # Preserve existing coverage for schemas we know about but may not have questions yet
            for schema_id in self.schemas.keys():
                if schema_id not in new_coverage:
                    new_coverage[schema_id] = self.coverage.get(schema_id, 0)
            
            # Update coverage from DB
            self.coverage = new_coverage
            print(f"🔄 Refreshed coverage from database: {len([s for s in new_coverage.values() if s > 0])} schemas with questions, {len(new_coverage)} total schemas tracked")
        except Exception as e:
            error_str = str(e)
            if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                pass  # Network issue - keep existing coverage
            else:
                print(f"⚠ Warning: Failed to refresh coverage from database: {e}")
                import traceback
                traceback.print_exc()
    
    def get_next_incomplete(self, schema_start_index: Optional[int] = None, schema_end_index: Optional[int] = None) -> Optional[str]:
        """
        Get the next schema that needs questions (thread-safe to prevent over-generation).
        
        Args:
            schema_start_index: If provided, only consider schemas starting from this index (0-based).
            schema_end_index: If provided, only consider schemas up to (but not including) this index.
        """
        with self.queue_lock:
            # Refresh coverage from DB before selecting next schema
            self.refresh_coverage_from_db()
            
            # Determine which schemas to check based on range
            schemas_to_check = self.ordered_schema_ids
            if schema_start_index is not None or schema_end_index is not None:
                start = schema_start_index if schema_start_index is not None else 0
                end = schema_end_index if schema_end_index is not None else len(self.ordered_schema_ids)
                schemas_to_check = self.ordered_schema_ids[start:end]
            
            # Find first incomplete schema in the assigned range
            for schema_id in schemas_to_check:
                db_count = self.coverage.get(schema_id, 0)
                session_count = self.generated.get(schema_id, 0)
                current = db_count + session_count
                required = self.get_required_count(schema_id)
                
                if current < required:
                    # Reserve this schema by incrementing session count
                    self.generated[schema_id] = session_count + 1
                    if schema_start_index is not None:
                        range_info = f"[range {schema_start_index}-{schema_end_index-1 if schema_end_index else len(self.ordered_schema_ids)-1}]"
                    else:
                        range_info = ""
                    paper = self.paper_schema_map.get(schema_id, "Unknown")
                    print(f"🎯 {range_info} Selected {schema_id} ({paper}): {current}/{required} (DB: {db_count}, session: {session_count}→{session_count+1}, needs {required - current} more)")
                    return schema_id
                elif db_count < required:
                    # Safety check: Even if current count says complete, verify DB has enough
                    self.generated[schema_id] = session_count + 1
                    if schema_start_index is not None:
                        range_info = f"[range {schema_start_index}-{schema_end_index-1 if schema_end_index else len(self.ordered_schema_ids)-1}]"
                    else:
                        range_info = ""
                    paper = self.paper_schema_map.get(schema_id, "Unknown")
                    print(f"⚠ {range_info} {schema_id} ({paper}) appears complete ({current}/{required}) but DB only has {db_count} - continuing to generate")
                    return schema_id
            
            return None
    
    def increment_schema_count(self, schema_id: str):
        """Increment generated count for a schema."""
        self.generated[schema_id] = self.generated.get(schema_id, 0) + 1
    
    def get_progress_summary(self) -> Dict[str, any]:
        """Get overall progress summary."""
        total_required = sum(self.get_required_count(sid) for sid in self.ordered_schema_ids)
        total_current = sum(self.get_current_count(sid) for sid in self.ordered_schema_ids)
        
        return {
            "total_required": total_required,
            "total_current": total_current,
            "percentage": (total_current / total_required * 100) if total_required > 0 else 0,
            "complete_schemas": sum(1 for sid in self.ordered_schema_ids if self.is_complete(sid)),
            "total_schemas": len(self.ordered_schema_ids)
        }
    
    def get_paper_progress(self) -> Dict[str, Dict[str, int]]:
        """Get progress summary by paper (Paper 1 vs Paper 2)."""
        paper_stats = {}
        
        for paper in ["Paper1", "Paper2"]:
            paper_schemas = [sid for sid in self.ordered_schema_ids if self.paper_schema_map.get(sid) == paper]
            if paper_schemas:
                required = sum(self.get_required_count(sid) for sid in paper_schemas)
                current = sum(self.get_current_count(sid) for sid in paper_schemas)
                paper_stats[paper] = {
                    'current': current,
                    'required': required
                }
        
        return paper_stats


class GenerationController:
    """Controls the generation process."""
    
    def __init__(self, base_dir: str, queue: SchemaQueue, schemas: Dict[str, dict],
                 cfg: RunConfig, models: ModelsConfig, ui_callback, ui_instance=None,
                 max_workers: int = 2):
        self.base_dir = base_dir
        self.queue = queue
        self.schemas = schemas
        self.cfg = cfg
        self.models = models
        self.ui_callback = ui_callback
        self.ui_instance = ui_instance
        self.max_workers = max_workers
        
        self.stopped = False
        self.thread = None
        self.lock = threading.Lock()
        
        # Statistics
        self.attempts = 0
        self.failures = 0
        self.start_time = None
        self.last_generated_id = None
        self.session_start_time = None
        
        # Initialize curriculum parser for tag labeling
        self.curriculum_parser = None
        if CURRICULUM_PARSER_AVAILABLE and cfg.enable_tag_labeling:
            try:
                curriculum_path = Path(base_dir) / "by_paper_prompts" / "Spec.md"
                self.curriculum_parser = CurriculumParser(str(curriculum_path))
                print("✓ Curriculum parser loaded for tag labeling")
            except Exception as e:
                print(f"⚠ Warning: Failed to load curriculum parser: {e}")
                print("  Tag labeling will be disabled.")
        
    def start(self):
        """Start generation in background thread."""
        if self.thread and self.thread.is_alive():
            return
        
        self.stopped = False
        self.start_time = time.time()
        self.session_start_time = datetime.now().isoformat()
        self.thread = threading.Thread(target=self._generation_loop, daemon=True)
        self.thread.start()
    
    def stop(self):
        """Stop generation."""
        self.stopped = True
    
    def _update_difficulty_weights(self):
        """Update difficulty weights from file (allows mid-run changes)."""
        try:
            if self.ui_instance:
                new_weights = self.ui_instance._load_difficulty_weights()
            else:
                new_weights = self.cfg.difficulty_weights
            self.cfg.difficulty_weights = new_weights
        except Exception as e:
            print(f"⚠ Warning: Failed to update difficulty weights: {e}")
    
    def _choose_difficulty_for_schema(self, schema_id: str) -> str:
        """Choose difficulty based on current progress."""
        current_count = self.queue.get_current_count(schema_id)
        # Use standard difficulty weights for all schemas
        return choose_difficulty(self.cfg)
    
    def _worker_task(self, schema_id: str, difficulty: str):
        """Single worker task to generate one question."""
        with self.lock:
            self.attempts += 1
            current_attempt = self.attempts
        
        try:
            # Generate question
            original_difficulty = self.cfg.difficulty_weights
            self.cfg.difficulty_weights = {difficulty: 1.0}
            
            result = run_once(
                base_dir=self.base_dir,
                cfg=self.cfg,
                models=self.models,
                callbacks={
                    "on_stage_start": lambda stage, info: self.ui_callback("stage", f"[{schema_id}] {stage}: {info}"),
                },
                forced_schema_id=schema_id,
                curriculum_parser=self.curriculum_parser
            )
            
            # Restore original difficulty weights
            self.cfg.difficulty_weights = original_difficulty
            
            if result.get("status") == "accepted":
                item = result.get("item")
                if item:
                    # Save to database
                    db_save_successful = False
                    db_save_error = None
                    try:
                        if SUPABASE_AVAILABLE:
                            db_id = sync_question_from_pipeline(item, self.base_dir, status="pending_review")
                            if db_id:
                                db_save_successful = True
                                print(f"[STATS] DB save confirmed successful, db_id: {db_id[:8] if db_id else 'None'}...")
                            else:
                                # Check if question exists in DB
                                generation_id = item.get("id", "")
                                if generation_id and self.queue.supabase:
                                    try:
                                        check_response = self.queue.supabase.table("ai_generated_questions")\
                                            .select("id")\
                                            .eq("generation_id", generation_id)\
                                            .limit(1)\
                                            .execute()
                                        if check_response.data and len(check_response.data) > 0:
                                            db_save_successful = True
                                            print(f"[STATS] DB save succeeded (question exists in DB despite None return)")
                                        else:
                                            db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                    except Exception:
                                        db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                else:
                                    db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                    except Exception as e:
                        db_save_error = str(e)
                        print(f"⚠ Warning: Failed to save to Supabase: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Local backup
                    try:
                        self._save_to_backup(item)
                    except Exception as e:
                        print(f"Warning: Failed to save to backup: {e}")
                    
                    if db_save_successful:
                        generation_id = item.get("id")
                        print(f"✅ SUCCESS: saved {generation_id} to database")
                        
                        with self.lock:
                            self.last_generated_id = generation_id
                        
                        # Refresh coverage from DB
                        try:
                            with self.queue.queue_lock:
                                self.queue.refresh_coverage_from_db()
                        except Exception:
                            pass
                        
                        # Clear the reservation
                        with self.queue.queue_lock:
                            if self.queue.generated.get(schema_id, 0) > 0:
                                self.queue.generated[schema_id] -= 1
                        
                        # Refresh stats from DB
                        try:
                            self._refresh_stats_from_db()
                        except Exception:
                            pass
                        
                        self.ui_callback("success", {
                            "schema_id": schema_id,
                            "question_id": generation_id
                        })
                    else:
                        # Decrement session count since we didn't save
                        with self.queue.queue_lock:
                            if self.queue.generated.get(schema_id, 0) > 0:
                                self.queue.generated[schema_id] -= 1
                        with self.lock:
                            self.failures += 1
                            failure_rate = (self.failures / self.attempts * 100) if self.attempts > 0 else 0
                            print(f"❌ FAILURE: DB save failed for {schema_id} - {db_save_error} (Failures: {self.failures}/{self.attempts}, {failure_rate:.1f}%)")
                        self.ui_callback("failure", {
                            "schema_id": schema_id,
                            "reason": db_save_error or "DB save failed"
                        })
                else:
                    with self.queue.queue_lock:
                        if self.queue.generated.get(schema_id, 0) > 0:
                            self.queue.generated[schema_id] -= 1
                    with self.lock:
                        self.failures += 1
                        print(f"❌ FAILURE: Accepted but no item for {schema_id} (Failures: {self.failures}/{self.attempts})")
                    self.ui_callback("failure", {
                        "schema_id": schema_id,
                        "reason": "Accepted but no item"
                    })
            else:
                # Generation failed
                with self.queue.queue_lock:
                    if self.queue.generated.get(schema_id, 0) > 0:
                        self.queue.generated[schema_id] -= 1
                with self.lock:
                    self.failures += 1
                    failure_reason = result.get("status", "unknown")
                    failure_rate = (self.failures / self.attempts * 100) if self.attempts > 0 else 0
                    print(f"❌ FAILURE: Generation failed for {schema_id} - status: {failure_reason} (Failures: {self.failures}/{self.attempts}, {failure_rate:.1f}%)")
                self.ui_callback("failure", {
                    "schema_id": schema_id,
                    "reason": failure_reason
                })
                
        except Exception as e:
            with self.queue.queue_lock:
                if self.queue.generated.get(schema_id, 0) > 0:
                    self.queue.generated[schema_id] -= 1
            with self.lock:
                self.failures += 1
                failure_rate = (self.failures / self.attempts * 100) if self.attempts > 0 else 0
                print(f"❌ EXCEPTION in worker task for {schema_id}: {e} (Failures: {self.failures}/{self.attempts}, {failure_rate:.1f}%)")
            import traceback
            traceback.print_exc()
            self.ui_callback("error", {"message": str(e)})
            
        finally:
            stats = self._get_stats()
            self.ui_callback("stats", stats)

    def _generation_loop(self):
        """Parallel generation loop with schema range partitioning."""
        try:
            # Calculate schema ranges for each agent to avoid collisions
            total_schemas = len(self.queue.ordered_schema_ids)
            schemas_per_agent = max(1, total_schemas // self.max_workers)
            
            # Assign each agent a non-overlapping range of schemas
            agent_ranges = []
            for i in range(self.max_workers):
                start_idx = i * schemas_per_agent
                end_idx = total_schemas if i == self.max_workers - 1 else (i + 1) * schemas_per_agent
                if start_idx < total_schemas:
                    agent_ranges.append((start_idx, end_idx))
                    print(f"🤖 Agent {i+1} assigned schemas {start_idx}-{end_idx-1} ({end_idx - start_idx} schemas)")
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                active_futures = {}
                agent_id_to_future = {}
                
                def get_schema_for_agent(agent_idx: int) -> Optional[str]:
                    """Get next schema for a specific agent's assigned range."""
                    if agent_idx < len(agent_ranges):
                        start_idx, end_idx = agent_ranges[agent_idx]
                        return self.queue.get_next_incomplete(schema_start_index=start_idx, schema_end_index=end_idx)
                    return None
                
                last_stats_refresh = time.time()
                
                while not self.stopped:
                    # Periodically refresh stats from DB (every 5 seconds)
                    current_time = time.time()
                    if current_time - last_stats_refresh > 5.0:
                        stats = self._get_stats()
                        self.ui_callback("stats", stats)
                        last_stats_refresh = current_time
                    
                    # Fill the pool - each agent works on their assigned range
                    for agent_idx in range(self.max_workers):
                        if len(active_futures) >= self.max_workers:
                            break
                        
                        # Check if this agent already has a task running
                        if any(agent_id_to_future.get(f) == agent_idx for f in active_futures.keys()):
                            continue
                        
                        # Get next schema in this agent's assigned range
                        schema_id = get_schema_for_agent(agent_idx)
                        
                        if not schema_id:
                            continue  # This agent has no more work
                        
                        self._update_difficulty_weights()
                        difficulty = self._choose_difficulty_for_schema(schema_id)
                        
                        # Update status label
                        self.ui_callback("status", {
                            "text": f"Running {len(active_futures)+1}/{self.max_workers} parallel agents...",
                            "color": "blue"
                        })
                        
                        # Submit task with agent ID for tracking
                        future = executor.submit(self._worker_task, schema_id, difficulty)
                        active_futures[future] = schema_id
                        agent_id_to_future[future] = agent_idx
                    
                    if not active_futures:
                        # All done! Final stats refresh
                        stats = self._get_stats()
                        self.ui_callback("stats", stats)
                        if not self.stopped:
                            self.ui_callback("status", {"text": "All schemas complete!", "color": "green"})
                        break
                    
                    # Wait for at least one task to finish
                    done_futures = []
                    try:
                        for future in as_completed(active_futures.keys(), timeout=1.0):
                            done_futures.append(future)
                            break
                    except Exception:
                        pass
                    
                    # Clean up done futures
                    for f in done_futures:
                        if f in active_futures:
                            active_futures.pop(f)
                            
        except Exception as e:
            print(f"Fatal error in generation loop: {e}")
            import traceback
            traceback.print_exc()
            self.ui_callback("error", {"message": f"Fatal: {str(e)}"})
        finally:
            self.stopped = True
    
    def _save_to_backup(self, item: dict):
        """Save question to local backup file."""
        backup_dir = Path(self.base_dir) / "backups" / datetime.now().strftime("%Y-%m-%d")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        backup_file = backup_dir / "questions.jsonl"
        with open(backup_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    
    def _refresh_stats_from_db(self):
        """Refresh success count and last generated ID from database."""
        if not self.queue.supabase or not self.session_start_time:
            return
        
        try:
            response = self.queue.supabase.table("ai_generated_questions")\
                .select("generation_id")\
                .gte("created_at", self.session_start_time)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if response.data and len(response.data) > 0:
                last_id = response.data[0].get("generation_id")
                if last_id:
                    self.last_generated_id = last_id
        except Exception as e:
            error_str = str(e)
            if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                pass
            else:
                print(f"⚠ Warning: Failed to refresh last generated ID from database: {e}")
    
    def _get_stats(self) -> dict:
        """Get current statistics - reads successes from DB, attempts/failures from memory."""
        self._refresh_stats_from_db()
        
        with self.lock:
            attempts = self.attempts
            failures = self.failures
            last_id = self.last_generated_id
        
        # Get successes from database
        successes = 0
        if self.queue.supabase and self.session_start_time:
            try:
                response = self.queue.supabase.table("ai_generated_questions")\
                    .select("id")\
                    .gte("created_at", self.session_start_time)\
                    .execute()
                
                if response.data:
                    successes = len(response.data)
                
                if response.data and len(response.data) > 0:
                    recent_response = self.queue.supabase.table("ai_generated_questions")\
                        .select("generation_id")\
                        .gte("created_at", self.session_start_time)\
                        .order("created_at", desc=True)\
                        .limit(1)\
                        .execute()
                    if recent_response.data and len(recent_response.data) > 0:
                        last_id = recent_response.data[0].get("generation_id")
                        if last_id:
                            with self.lock:
                                self.last_generated_id = last_id
                            last_id = self.last_generated_id
            except Exception as e:
                error_str = str(e)
                if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                    pass
                else:
                    print(f"⚠ Warning: Failed to get success count from database: {e}")
        
        elapsed = time.time() - self.start_time if self.start_time else 0
        success_rate = (successes / attempts * 100) if attempts > 0 else 0
        
        return {
            "attempts": attempts,
            "successes": successes,
            "failures": failures,
            "success_rate": success_rate,
            "elapsed": elapsed,
            "last_generated_id": last_id
        }


class SimpleGeneratorUI:
    """Simple Tkinter UI for batch generation."""
    
    def __init__(
        self,
        base_dir: str,
        paper_selection: Optional[Tuple[str, ...]] = None,
        start_offsets: Optional[Dict[str, int]] = None,
        stop_offsets: Optional[Dict[str, int]] = None,
    ):
        self.base_dir = base_dir
        self.base_dir_path = Path(base_dir)
        
        # Load environment
        project_root = Path(base_dir).parent.parent
        env_path = project_root / ".env.local"
        safe_load_dotenv(str(env_path))
        
        # Initialize Supabase client
        self.supabase = None
        if SUPABASE_AVAILABLE:
            try:
                supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
                supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
                if supabase_url and supabase_key:
                    self.supabase = create_client(supabase_url, supabase_key)
            except Exception as e:
                print(f"Failed to initialize Supabase: {e}")
        
        # Get paper selection: use parameter first, then env var, then default to both
        if paper_selection:
            self.paper_selection = paper_selection
        else:
            paper_selection_env = os.environ.get("PAPER_SELECTION", "Paper1,Paper2")
            self.paper_selection = tuple(p.strip() for p in paper_selection_env.split(",") if p.strip())
            if not self.paper_selection:
                self.paper_selection = ("Paper1", "Paper2")  # Default to both papers
        
        print(f"📋 Generating questions for papers: {', '.join(self.paper_selection)}")
        
        # Load schemas from both Paper 1 and Paper 2 files
        current_dir = os.path.dirname(os.path.abspath(__file__))
        scripts_dir = os.path.dirname(current_dir)
        esat_schemas_dir = os.path.join(scripts_dir, "esat_question_generator", "schemas")
        
        schemas_paper1_path = os.path.join(esat_schemas_dir, "Schemas_TMUA_Paper1.md")
        schemas_paper2_path = os.path.join(esat_schemas_dir, "Schemas_TMUA_Paper2.md")
        
        if not os.path.exists(schemas_paper1_path):
            raise FileNotFoundError(f"TMUA Paper 1 schema file not found: {schemas_paper1_path}")
        if not os.path.exists(schemas_paper2_path):
            raise FileNotFoundError(f"TMUA Paper 2 schema file not found: {schemas_paper2_path}")
        
        # Load both schema files
        schemas_paper1_md = read_text(schemas_paper1_path)
        schemas_paper2_md = read_text(schemas_paper2_path)
        
        # Parse both files
        paper1_prefixes = ("M",)  # Paper 1 always uses M_ prefix
        paper2_prefixes = ("R",)  # Paper 2 always uses R_ prefix
        
        schemas_paper1 = parse_schemas_from_markdown(schemas_paper1_md, allow_prefixes=paper1_prefixes)
        schemas_paper2 = parse_schemas_from_markdown(schemas_paper2_md, allow_prefixes=paper2_prefixes)
        
        # Combine schemas and track which paper they came from
        self.schemas = {**schemas_paper1, **schemas_paper2}
        self.paper_schema_map = {}
        for sid in schemas_paper1.keys():
            self.paper_schema_map[sid] = "Paper1"
        for sid in schemas_paper2.keys():
            self.paper_schema_map[sid] = "Paper2"
        
        # Filter schemas based on paper selection
        if "Paper1" not in self.paper_selection:
            # Remove Paper 1 schemas
            for sid in list(self.schemas.keys()):
                if self.paper_schema_map.get(sid) == "Paper1":
                    del self.schemas[sid]
                    del self.paper_schema_map[sid]
        
        if "Paper2" not in self.paper_selection:
            # Remove Paper 2 schemas
            for sid in list(self.schemas.keys()):
                if self.paper_schema_map.get(sid) == "Paper2":
                    del self.schemas[sid]
                    del self.paper_schema_map[sid]
        
        print(f"📖 Loaded {len(schemas_paper1)} Paper 1 schemas and {len(schemas_paper2)} Paper 2 schemas")
        print(f"📋 Using {len(self.schemas)} schemas after filtering")
        
        # Get coverage from database
        self.coverage = self._get_schema_coverage()
        
        # Initialize queue
        self.queue = SchemaQueue(
            self.schemas,
            self.coverage,
            self.paper_schema_map,
            self.supabase,
            start_offsets=start_offsets,
            stop_offsets=stop_offsets,
        )
        
        # Debug: Print first 20 schemas to verify order
        print("\nSchema generation order (first 20):")
        for i, sid in enumerate(self.queue.ordered_schema_ids[:20], 1):
            paper = self.paper_schema_map.get(sid, "Unknown")
            print(f"  {i}. {sid} ({paper})")
        print(f"  ... ({len(self.queue.ordered_schema_ids)} total schemas)\n")
        
        # Initialize config with default difficulty weights
        difficulty_weights = self._load_difficulty_weights()
        dist_str = ", ".join(f"{k}={difficulty_weights[k]:.1%}" for k in sorted(difficulty_weights))
        print(f"📊 Difficulty distribution: {dist_str}")
        print(f"💡 Tip: Edit 'difficulty_weights.txt' in this directory to change weights mid-run!")
        
        max_workers = int(os.environ.get("MAX_WORKERS", "2"))
        self.cfg = RunConfig(
            max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
            max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
            seed=None,
            difficulty_weights=difficulty_weights,
            schema_weights=None,
            out_dir="runs",
            allow_schema_prefixes=_schema_prefixes_from_env_tuple(),
            enable_tag_labeling=True,
        )
        
        # Use centralized model config
        self.models = get_default_models_config()
        if not os.environ.get("MODEL_IMPLEMENTER"):
            self.models.implementer = "models/gemini-3-pro-preview"
        
        # Initialize controller
        self.controller = GenerationController(
            self.base_dir,
            self.queue,
            self.schemas,
            self.cfg,
            self.models,
            self._ui_callback,
            ui_instance=self,
            max_workers=max_workers
        )
        
        # Create UI
        self.root = tk.Tk()
        self.root.title("TMUA Question Generator")
        self.root.geometry("800x700")
        self.root.resizable(True, True)
        
        self._create_ui()
    
    def _load_difficulty_weights(self) -> Dict[str, float]:
        """Load difficulty weights from file or use defaults."""
        weights_file = self.base_dir_path / "difficulty_weights.txt"
        tmua = is_tmua_allow_schema_prefixes(_schema_prefixes_from_env_tuple())
        default_weights: Dict[str, float] = (
            {"Hard": 0.5, "Extreme": 0.5}
            if tmua
            else {"Easy": 0.1, "Medium": 0.3, "Hard": 0.6}
        )
        
        if weights_file.exists():
            try:
                with open(weights_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    parsed: Dict[str, float] = {}
                    for line in content.split('\n'):
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            key, value = line.split('=', 1)
                            key = key.strip()
                            value = value.strip()
                            parsed[key] = float(value)
                    if tmua:
                        only_he = {k: parsed[k] for k in ("Hard", "Extreme") if k in parsed}
                        return normalize_tmua_difficulty_weights(only_he if only_he else None)
                    weights = {k: parsed[k] for k in default_weights if k in parsed}
                    if weights:
                        total = sum(weights.values())
                        if total > 0:
                            return {k: v / total for k, v in weights.items()}
            except Exception as e:
                print(f"⚠ Warning: Failed to load difficulty_weights.txt: {e}")
                print(f"   Using defaults: {default_weights}")
        
        # Create default file if it doesn't exist
        try:
            with open(weights_file, 'w', encoding='utf-8') as f:
                f.write("# Difficulty weights (values will be normalized to sum to 1.0)\n")
                if tmua:
                    f.write("# TMUA: only Hard and Extreme are used.\n")
                f.write("# Edit this file to change weights mid-run!\n")
                for k in sorted(default_weights):
                    f.write(f"{k}={default_weights[k]}\n")
        except Exception:
            pass
        
        return default_weights if not tmua else normalize_tmua_difficulty_weights(None)
        
    def _get_schema_coverage(self) -> Dict[str, int]:
        """Get current schema coverage from Supabase (prioritized) or JSON file."""
        # PRIORITY 1: Query Supabase for real-time coverage
        if self.supabase:
            try:
                # Try RPC function first
                try:
                    response = self.supabase.rpc("get_schema_coverage").execute()
                    if response.data:
                        coverage = {row["schema_id"]: row["total"] for row in response.data}
                        print(f"✓ Loaded schema coverage from Supabase (RPC): {len(coverage)} schemas")
                        return coverage
                except Exception:
                    pass
                
                # Fallback: Direct query
                response = self.supabase.table("ai_generated_questions").select("schema_id").execute()
                if response.data:
                    coverage = {}
                    for row in response.data:
                        schema_id = row["schema_id"]
                        coverage[schema_id] = coverage.get(schema_id, 0) + 1
                    print(f"✓ Loaded schema coverage from Supabase (direct query): {len(coverage)} schemas")
                    return coverage
            except Exception as e:
                print(f"Warning: Failed to get schema coverage from Supabase: {e}")
        
        print("⚠ No schema coverage found - starting from zero")
        return {}
    
    def _create_ui(self):
        """Create the UI layout."""
        # Title
        title_frame = ttk.Frame(self.root, padding="10")
        title_frame.pack(fill=tk.X)
        
        title_label = ttk.Label(
            title_frame,
            text="TMUA Question Generator",
            font=("Arial", 16, "bold")
        )
        title_label.pack()
        
        # Control buttons
        control_frame = ttk.Frame(self.root, padding="10")
        control_frame.pack(fill=tk.X)
        
        self.start_button = ttk.Button(
            control_frame,
            text="Start Generation",
            command=self._on_start,
            width=20
        )
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        self.stop_button = ttk.Button(
            control_frame,
            text="Stop",
            command=self._on_stop,
            width=20,
            state=tk.DISABLED
        )
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        # Status
        status_frame = ttk.Frame(self.root, padding="10")
        status_frame.pack(fill=tk.X)
        
        self.status_label = ttk.Label(
            status_frame,
            text="Ready to start",
            font=("Arial", 10)
        )
        self.status_label.pack(anchor=tk.W)
        
        self.stage_label = ttk.Label(
            status_frame,
            text="",
            font=("Arial", 9),
            foreground="gray"
        )
        self.stage_label.pack(anchor=tk.W)
        
        # Schema progress (scrolled list)
        progress_frame = ttk.LabelFrame(self.root, text="Schema Progress", padding="10")
        progress_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.progress_text = scrolledtext.ScrolledText(
            progress_frame,
            height=15,
            font=("Consolas", 9),
            state=tk.DISABLED
        )
        self.progress_text.pack(fill=tk.BOTH, expand=True)
        
        # Overall stats
        stats_frame = ttk.LabelFrame(self.root, text="Overall Progress", padding="10")
        stats_frame.pack(fill=tk.X, padx=10, pady=10)
        
        self.overall_label = ttk.Label(
            stats_frame,
            text="0/0 questions (0.0%)",
            font=("Arial", 10)
        )
        self.overall_label.pack(anchor=tk.W)
        
        self.progress_bar = ttk.Progressbar(
            stats_frame,
            mode='determinate',
            length=400
        )
        self.progress_bar.pack(fill=tk.X, pady=5)
        
        # Paper-specific stats
        self.paper1_label = ttk.Label(
            stats_frame,
            text="Paper 1: 0/0",
            font=("Arial", 9)
        )
        self.paper1_label.pack(anchor=tk.W)
        
        self.paper2_label = ttk.Label(
            stats_frame,
            text="Paper 2: 0/0",
            font=("Arial", 9)
        )
        self.paper2_label.pack(anchor=tk.W)
        
        self.last_gen_label = ttk.Label(
            stats_frame,
            text="Last Generated: None",
            font=("Arial", 9)
        )
        self.last_gen_label.pack(anchor=tk.W)
        
        self.success_rate_label = ttk.Label(
            stats_frame,
            text="Success Rate: 0% (0/0 attempts)",
            font=("Arial", 9)
        )
        self.success_rate_label.pack(anchor=tk.W)
        
        self.elapsed_label = ttk.Label(
            stats_frame,
            text="Elapsed: 0m 0s",
            font=("Arial", 9)
        )
        self.elapsed_label.pack(anchor=tk.W)
        
        # Initial update
        self._update_progress_display()
        
        # Initial stats refresh
        if hasattr(self, 'controller') and self.controller:
            stats = self.controller._get_stats()
            self._update_stats_display(stats)
    
    def _on_start(self):
        """Handle start button click."""
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.controller.start()
        self._update_progress_display()
    
    def _on_stop(self):
        """Handle stop button click."""
        self.controller.stop()
        self.stop_button.config(state=tk.DISABLED)
        self.start_button.config(state=tk.NORMAL)
        self.status_label.config(text="Stopped", foreground="red")
    
    def _ui_callback(self, event_type: str, data: dict):
        """Callback from controller to update UI."""
        # Ensure we're only accessing root from main thread via after()
        try:
            if event_type == "status":
                self.root.after(0, lambda: self.status_label.config(
                    text=data.get("text", ""),
                    foreground=data.get("color", "black")
                ))
            elif event_type == "stage":
                self.root.after(0, lambda: self.stage_label.config(text=data))
            elif event_type == "success":
                self.root.after(0, self._update_progress_display)
            elif event_type == "failure":
                self.root.after(0, self._update_progress_display)
            elif event_type == "stats":
                self.root.after(0, lambda: self._update_stats_display(data))
            elif event_type == "error":
                # messagebox can be problematic from threads, wrap in after()
                error_msg = data.get("message", "Unknown error")
                self.root.after(0, lambda msg=error_msg: messagebox.showerror("Error", msg))
        except RuntimeError as e:
            # "main thread is not in main loop" - ignore if root not ready yet
            if "main thread is not in main loop" not in str(e):
                raise
            # Otherwise just log it, don't crash
            print(f"[WARNING] UI callback failed (root not ready): {event_type}")
        except AttributeError:
            # root might not exist yet
            print(f"[WARNING] UI callback failed (root not initialized): {event_type}")
    
    def _update_progress_display(self):
        """Update the schema progress display."""
        # Refresh coverage from database before displaying
        with self.queue.queue_lock:
            self.queue.refresh_coverage_from_db()
        
        # Refresh stats from DB
        if self.controller:
            stats = self.controller._get_stats()
            self._update_stats_display(stats)
        
        self.progress_text.config(state=tk.NORMAL)
        self.progress_text.delete(1.0, tk.END)
        
        for schema_id in self.queue.ordered_schema_ids:
            db_count = self.queue.coverage.get(schema_id, 0)
            session_count = self.queue.generated.get(schema_id, 0)
            current = self.queue.get_current_count(schema_id)
            required = self.queue.get_required_count(schema_id)
            is_complete = self.queue.is_complete(schema_id)
            paper = self.queue.paper_schema_map.get(schema_id, "Unknown")
            
            # Determine status symbol
            if is_complete:
                symbol = "✓"
                status = "[COMPLETE]"
            elif current > 0:
                symbol = "▶"
                status = "[IN PROGRESS]"
            else:
                symbol = " "
                status = "[PENDING]"
            
            # Show detailed breakdown
            if session_count > 0:
                line = f"{symbol} {schema_id} ({paper}): {current}/{required} (DB:{db_count} + session:{session_count}) {status}\n"
            else:
                line = f"{symbol} {schema_id} ({paper}): {current}/{required} questions {status}\n"
            
            self.progress_text.insert(tk.END, line)
        
        self.progress_text.config(state=tk.DISABLED)
        
        # Update overall progress
        summary = self.queue.get_progress_summary()
        self.overall_label.config(
            text=f"{summary['total_current']}/{summary['total_required']} questions ({summary['percentage']:.1f}%)"
        )
        self.progress_bar['value'] = summary['percentage']
        
        # Update paper-specific progress
        paper_progress = self.queue.get_paper_progress()
        if 'Paper1' in paper_progress:
            p1 = paper_progress['Paper1']
            self.paper1_label.config(text=f"Paper 1: {p1['current']}/{p1['required']}")
        else:
            self.paper1_label.config(text="Paper 1: 0/0")
        if 'Paper2' in paper_progress:
            p2 = paper_progress['Paper2']
            self.paper2_label.config(text=f"Paper 2: {p2['current']}/{p2['required']}")
        else:
            self.paper2_label.config(text="Paper 2: 0/0")
    
    def _update_stats_display(self, stats: dict):
        """Update statistics display."""
        # Update last generated ID
        last_id = stats.get("last_generated_id")
        if last_id:
            display_id = last_id if len(last_id) <= 30 else last_id[:27] + "..."
            self.last_gen_label.config(text=f"Last Generated: {display_id}")
        else:
            self.last_gen_label.config(text="Last Generated: None")
        
        # Update success rate
        attempts = stats.get("attempts", 0)
        successes = stats.get("successes", 0)
        success_rate = stats.get("success_rate", 0)
        
        if attempts > 0:
            self.success_rate_label.config(
                text=f"Success Rate: {success_rate:.1f}% ({successes}/{attempts} attempts)"
            )
        else:
            self.success_rate_label.config(
                text="Success Rate: 0% (0/0 attempts)"
            )
        
        # Update elapsed time
        elapsed = stats.get("elapsed", 0)
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)
        self.elapsed_label.config(text=f"Elapsed: {minutes}m {seconds}s")
    
    def run(self):
        """Run the UI."""
        self.root.mainloop()


def main():
    """Main entry point."""
    base_dir = Path(__file__).parent
    
    # Check for API key
    project_root = base_dir.parent.parent
    env_path = project_root / ".env.local"
    safe_load_dotenv(str(env_path))
    
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in environment")
        print(f"Please add it to {env_path}")
        sys.exit(1)
    
    if not SUPABASE_AVAILABLE:
        print("Warning: Supabase not available. Install with: pip install supabase")
        response = input("Continue without Supabase? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)

    # Interactive prompt for paper selection
    print("\n" + "=" * 60)
    print("TMUA Question Generator - Paper Selection")
    print("=" * 60)
    print("\nWhich papers would you like to generate questions for?")
    print("  Paper1 = Mathematical Knowledge (M_ schemas)")
    print("  Paper2 = Mathematical Reasoning (R_ schemas)")
    print("\nYou can select:")
    print("  - Single paper: Paper1 or Paper2")
    print("  - Both papers: Paper1,Paper2 or press Enter for default")

    selected = input(
        "\nEnter papers (e.g., Paper1 or Paper1,Paper2, or press Enter for both): "
    ).strip()

    # Parse selection
    if not selected:
        selected_papers = ("Paper1", "Paper2")
        print("✓ Using both papers: Paper1, Paper2")
    else:
        papers = [p.strip() for p in selected.split(",") if p.strip()]
        valid_papers = []
        for p in papers:
            if p in ("Paper1", "Paper2"):
                valid_papers.append(p)
            else:
                print(f"⚠ Warning: '{p}' is not a valid paper (Paper1, Paper2). Ignoring.")

        if not valid_papers:
            print("❌ No valid papers selected. Using both papers as default.")
            selected_papers = ("Paper1", "Paper2")
        else:
            selected_papers = tuple(valid_papers)
            print(f"✓ Selected papers: {', '.join(selected_papers)}")

    print("\n" + "=" * 60 + "\n")

    # Create and run UI
    app = SimpleGeneratorUI(
        str(base_dir),
        paper_selection=selected_papers,
    )
    app.run()


if __name__ == "__main__":
    main()




"""
TMUA Simple Question Generator UI

A clean, hands-off Tkinter interface for batch question generation.
Works systematically through schemas (Paper 1 → Paper 2), saves immediately to Supabase and local backup.
"""

import os
import sys
import re
import json
import time
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import OrderedDict

# Import curriculum parser for tag labeling
try:
    from curriculum_parser import CurriculumParser
    CURRICULUM_PARSER_AVAILABLE = True
except ImportError:
    CURRICULUM_PARSER_AVAILABLE = False
    print("Warning: curriculum_parser not available. Tag labeling will be disabled.")

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Import from project.py
from project import (
    RunConfig, ModelsConfig, run_once, parse_schemas_from_markdown, read_text,
    safe_load_dotenv, choose_difficulty, get_default_models_config,
    is_tmua_allow_schema_prefixes,
    normalize_tmua_difficulty_weights,
)

# Import database sync
try:
    from db_sync import sync_question_from_pipeline
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("Warning: Supabase not available")


def _schema_prefixes_from_env_tuple() -> Tuple[str, ...]:
    raw = os.environ.get("SCHEMA_PREFIXES", "M,R")
    return tuple(p.strip() for p in raw.split(",") if p.strip())


class SchemaQueue:
    """Manages the queue of schemas to generate questions for."""
    
    def __init__(
        self,
        schemas: Dict[str, dict],
        coverage: Dict[str, int],
        paper_schema_map: Dict[str, str],  # Maps schema_id -> "Paper1" or "Paper2"
        supabase_client=None,
        start_offsets: Optional[Dict[str, int]] = None,
        stop_offsets: Optional[Dict[str, int]] = None,
    ):
        """
        Initialize schema queue.

        Args:
            schemas: Dict of {schema_id: {"block": text, "title": text}}
            coverage: Dict of {schema_id: current_count} from database
            paper_schema_map: Dict mapping schema_id -> "Paper1" or "Paper2"
            supabase_client: Optional Supabase client for refreshing coverage
            start_offsets: Optional dict of {prefix: start_index}, e.g. {"M": 0, "R": 0}
                to start from a specific index in the ordered list
            stop_offsets: Optional dict of {prefix: stop_index}, e.g. {"M": 50, "R": 50}
                to stop at a specific index (exclusive)
        """
        self.schemas = schemas
        self.coverage = coverage  # Current counts from DB
        self.generated = {sid: 0 for sid in schemas.keys()}  # Counts in this session
        self.paper_schema_map = paper_schema_map  # Track which paper each schema belongs to
        self.supabase = supabase_client
        self.start_offsets = start_offsets or {}
        self.stop_offsets = stop_offsets or {}
        self.queue_lock = threading.Lock()  # Lock for thread-safe queue operations
        
        # Order schemas: Paper 1 (M_) first, then Paper 2 (R_)
        self.ordered_schema_ids = self._order_schemas(list(schemas.keys()))
        
    def _order_schemas(self, schema_ids: List[str]) -> List[str]:
        """Order schemas by paper (Paper 1 first, then Paper 2), then by schema ID."""
        # Group schemas by paper
        paper1_schemas = [sid for sid in schema_ids if self.paper_schema_map.get(sid) == "Paper1"]
        paper2_schemas = [sid for sid in schema_ids if self.paper_schema_map.get(sid) == "Paper2"]
        
        # Sort within each paper by schema ID (alphabetically for M_xxx and R_xxx)
        paper1_schemas.sort()
        paper2_schemas.sort()
        
        # Combine: Paper 1 first, then Paper 2
        ordered = paper1_schemas + paper2_schemas
        
        # Apply start/stop offsets if provided
        if not self.start_offsets and not self.stop_offsets:
            return ordered
        
        filtered: List[str] = []
        paper1_count = sum(1 for sid in ordered if self.paper_schema_map.get(sid) == "Paper1")
        
        for idx, sid in enumerate(ordered):
            paper = self.paper_schema_map.get(sid, "Paper1")
            
            # Determine which prefix to use for offset checking
            prefix = "M" if paper == "Paper1" else "R"
            
            # Check start offset
            start_idx = self.start_offsets.get(prefix)
            if start_idx is not None:
                # Adjust index based on paper
                if paper == "Paper2":
                    paper_idx = idx - paper1_count
                    if paper_idx < start_idx:
                        continue
                else:
                    if idx < start_idx:
                        continue
            
            # Check stop offset
            stop_idx = self.stop_offsets.get(prefix)
            if stop_idx is not None:
                if paper == "Paper2":
                    paper_idx = idx - paper1_count
                    if paper_idx >= stop_idx:
                        continue
                else:
                    if idx >= stop_idx:
                        continue
            
            filtered.append(sid)
        
        return filtered
    
    def get_required_count(self, schema_id: str) -> int:
        """
        Get required question count for a schema.
        
        Formula: 4 questions per schema + 1 more per exemplar question attached to it.
        """
        schema_data = self.schemas.get(schema_id, {})
        exemplar_ids = schema_data.get("exemplar_ids", [])
        return 4 + len(exemplar_ids)
    
    def get_current_count(self, schema_id: str) -> int:
        """
        Get current question count from DB plus in-flight session-generated questions.
        
        This includes both:
        - Questions already saved to DB (from coverage)
        - Questions generated in this session that are in-flight (from generated dict)
        """
        db_count = self.coverage.get(schema_id, 0)
        session_count = self.generated.get(schema_id, 0)
        return db_count + session_count
    
    def is_complete(self, schema_id: str) -> bool:
        """Check if schema has met its requirement."""
        return self.get_current_count(schema_id) >= self.get_required_count(schema_id)
    
    def refresh_coverage_from_db(self):
        """Refresh coverage counts from Supabase database."""
        if not self.supabase:
            return  # Can't refresh without Supabase
        
        try:
            # Query Supabase for current counts
            response = self.supabase.table("ai_generated_questions").select("schema_id").execute()
            
            # Count questions per schema
            new_coverage = {}
            if response.data:
                for row in response.data:
                    schema_id = row.get("schema_id")
                    if schema_id:  # Skip rows with missing schema_id
                        new_coverage[schema_id] = new_coverage.get(schema_id, 0) + 1
            
            # Preserve existing coverage for schemas we know about but may not have questions yet
            for schema_id in self.schemas.keys():
                if schema_id not in new_coverage:
                    new_coverage[schema_id] = self.coverage.get(schema_id, 0)
            
            # Update coverage from DB
            self.coverage = new_coverage
            print(f"🔄 Refreshed coverage from database: {len([s for s in new_coverage.values() if s > 0])} schemas with questions, {len(new_coverage)} total schemas tracked")
        except Exception as e:
            error_str = str(e)
            if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                pass  # Network issue - keep existing coverage
            else:
                print(f"⚠ Warning: Failed to refresh coverage from database: {e}")
                import traceback
                traceback.print_exc()
    
    def get_next_incomplete(self, schema_start_index: Optional[int] = None, schema_end_index: Optional[int] = None) -> Optional[str]:
        """
        Get the next schema that needs questions (thread-safe to prevent over-generation).
        
        Args:
            schema_start_index: If provided, only consider schemas starting from this index (0-based).
            schema_end_index: If provided, only consider schemas up to (but not including) this index.
        """
        with self.queue_lock:
            # Refresh coverage from DB before selecting next schema
            self.refresh_coverage_from_db()
            
            # Determine which schemas to check based on range
            schemas_to_check = self.ordered_schema_ids
            if schema_start_index is not None or schema_end_index is not None:
                start = schema_start_index if schema_start_index is not None else 0
                end = schema_end_index if schema_end_index is not None else len(self.ordered_schema_ids)
                schemas_to_check = self.ordered_schema_ids[start:end]
            
            # Find first incomplete schema in the assigned range
            for schema_id in schemas_to_check:
                db_count = self.coverage.get(schema_id, 0)
                session_count = self.generated.get(schema_id, 0)
                current = db_count + session_count
                required = self.get_required_count(schema_id)
                
                if current < required:
                    # Reserve this schema by incrementing session count
                    self.generated[schema_id] = session_count + 1
                    if schema_start_index is not None:
                        range_info = f"[range {schema_start_index}-{schema_end_index-1 if schema_end_index else len(self.ordered_schema_ids)-1}]"
                    else:
                        range_info = ""
                    paper = self.paper_schema_map.get(schema_id, "Unknown")
                    print(f"🎯 {range_info} Selected {schema_id} ({paper}): {current}/{required} (DB: {db_count}, session: {session_count}→{session_count+1}, needs {required - current} more)")
                    return schema_id
                elif db_count < required:
                    # Safety check: Even if current count says complete, verify DB has enough
                    self.generated[schema_id] = session_count + 1
                    if schema_start_index is not None:
                        range_info = f"[range {schema_start_index}-{schema_end_index-1 if schema_end_index else len(self.ordered_schema_ids)-1}]"
                    else:
                        range_info = ""
                    paper = self.paper_schema_map.get(schema_id, "Unknown")
                    print(f"⚠ {range_info} {schema_id} ({paper}) appears complete ({current}/{required}) but DB only has {db_count} - continuing to generate")
                    return schema_id
            
            return None
    
    def increment_schema_count(self, schema_id: str):
        """Increment generated count for a schema."""
        self.generated[schema_id] = self.generated.get(schema_id, 0) + 1
    
    def get_progress_summary(self) -> Dict[str, any]:
        """Get overall progress summary."""
        total_required = sum(self.get_required_count(sid) for sid in self.ordered_schema_ids)
        total_current = sum(self.get_current_count(sid) for sid in self.ordered_schema_ids)
        
        return {
            "total_required": total_required,
            "total_current": total_current,
            "percentage": (total_current / total_required * 100) if total_required > 0 else 0,
            "complete_schemas": sum(1 for sid in self.ordered_schema_ids if self.is_complete(sid)),
            "total_schemas": len(self.ordered_schema_ids)
        }
    
    def get_paper_progress(self) -> Dict[str, Dict[str, int]]:
        """Get progress summary by paper (Paper 1 vs Paper 2)."""
        paper_stats = {}
        
        for paper in ["Paper1", "Paper2"]:
            paper_schemas = [sid for sid in self.ordered_schema_ids if self.paper_schema_map.get(sid) == paper]
            if paper_schemas:
                required = sum(self.get_required_count(sid) for sid in paper_schemas)
                current = sum(self.get_current_count(sid) for sid in paper_schemas)
                paper_stats[paper] = {
                    'current': current,
                    'required': required
                }
        
        return paper_stats


class GenerationController:
    """Controls the generation process."""
    
    def __init__(self, base_dir: str, queue: SchemaQueue, schemas: Dict[str, dict],
                 cfg: RunConfig, models: ModelsConfig, ui_callback, ui_instance=None,
                 max_workers: int = 2):
        self.base_dir = base_dir
        self.queue = queue
        self.schemas = schemas
        self.cfg = cfg
        self.models = models
        self.ui_callback = ui_callback
        self.ui_instance = ui_instance
        self.max_workers = max_workers
        
        self.stopped = False
        self.thread = None
        self.lock = threading.Lock()
        
        # Statistics
        self.attempts = 0
        self.failures = 0
        self.start_time = None
        self.last_generated_id = None
        self.session_start_time = None
        
        # Initialize curriculum parser for tag labeling
        self.curriculum_parser = None
        if CURRICULUM_PARSER_AVAILABLE and cfg.enable_tag_labeling:
            try:
                curriculum_path = Path(base_dir) / "by_paper_prompts" / "Spec.md"
                self.curriculum_parser = CurriculumParser(str(curriculum_path))
                print("✓ Curriculum parser loaded for tag labeling")
            except Exception as e:
                print(f"⚠ Warning: Failed to load curriculum parser: {e}")
                print("  Tag labeling will be disabled.")
        
    def start(self):
        """Start generation in background thread."""
        if self.thread and self.thread.is_alive():
            return
        
        self.stopped = False
        self.start_time = time.time()
        self.session_start_time = datetime.now().isoformat()
        self.thread = threading.Thread(target=self._generation_loop, daemon=True)
        self.thread.start()
    
    def stop(self):
        """Stop generation."""
        self.stopped = True
    
    def _update_difficulty_weights(self):
        """Update difficulty weights from file (allows mid-run changes)."""
        try:
            if self.ui_instance:
                new_weights = self.ui_instance._load_difficulty_weights()
            else:
                new_weights = self.cfg.difficulty_weights
            self.cfg.difficulty_weights = new_weights
        except Exception as e:
            print(f"⚠ Warning: Failed to update difficulty weights: {e}")
    
    def _choose_difficulty_for_schema(self, schema_id: str) -> str:
        """Choose difficulty based on current progress."""
        current_count = self.queue.get_current_count(schema_id)
        # Use standard difficulty weights for all schemas
        return choose_difficulty(self.cfg)
    
    def _worker_task(self, schema_id: str, difficulty: str):
        """Single worker task to generate one question."""
        with self.lock:
            self.attempts += 1
            current_attempt = self.attempts
        
        try:
            # Generate question
            original_difficulty = self.cfg.difficulty_weights
            self.cfg.difficulty_weights = {difficulty: 1.0}
            
            result = run_once(
                base_dir=self.base_dir,
                cfg=self.cfg,
                models=self.models,
                callbacks={
                    "on_stage_start": lambda stage, info: self.ui_callback("stage", f"[{schema_id}] {stage}: {info}"),
                },
                forced_schema_id=schema_id,
                curriculum_parser=self.curriculum_parser
            )
            
            # Restore original difficulty weights
            self.cfg.difficulty_weights = original_difficulty
            
            if result.get("status") == "accepted":
                item = result.get("item")
                if item:
                    # Save to database
                    db_save_successful = False
                    db_save_error = None
                    try:
                        if SUPABASE_AVAILABLE:
                            db_id = sync_question_from_pipeline(item, self.base_dir, status="pending_review")
                            if db_id:
                                db_save_successful = True
                                print(f"[STATS] DB save confirmed successful, db_id: {db_id[:8] if db_id else 'None'}...")
                            else:
                                # Check if question exists in DB
                                generation_id = item.get("id", "")
                                if generation_id and self.queue.supabase:
                                    try:
                                        check_response = self.queue.supabase.table("ai_generated_questions")\
                                            .select("id")\
                                            .eq("generation_id", generation_id)\
                                            .limit(1)\
                                            .execute()
                                        if check_response.data and len(check_response.data) > 0:
                                            db_save_successful = True
                                            print(f"[STATS] DB save succeeded (question exists in DB despite None return)")
                                        else:
                                            db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                    except Exception:
                                        db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                else:
                                    db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                    except Exception as e:
                        db_save_error = str(e)
                        print(f"⚠ Warning: Failed to save to Supabase: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Local backup
                    try:
                        self._save_to_backup(item)
                    except Exception as e:
                        print(f"Warning: Failed to save to backup: {e}")
                    
                    if db_save_successful:
                        generation_id = item.get("id")
                        print(f"✅ SUCCESS: saved {generation_id} to database")
                        
                        with self.lock:
                            self.last_generated_id = generation_id
                        
                        # Refresh coverage from DB
                        try:
                            with self.queue.queue_lock:
                                self.queue.refresh_coverage_from_db()
                        except Exception:
                            pass
                        
                        # Clear the reservation
                        with self.queue.queue_lock:
                            if self.queue.generated.get(schema_id, 0) > 0:
                                self.queue.generated[schema_id] -= 1
                        
                        # Refresh stats from DB
                        try:
                            self._refresh_stats_from_db()
                        except Exception:
                            pass
                        
                        self.ui_callback("success", {
                            "schema_id": schema_id,
                            "question_id": generation_id
                        })
                    else:
                        # Decrement session count since we didn't save
                        with self.queue.queue_lock:
                            if self.queue.generated.get(schema_id, 0) > 0:
                                self.queue.generated[schema_id] -= 1
                        with self.lock:
                            self.failures += 1
                            failure_rate = (self.failures / self.attempts * 100) if self.attempts > 0 else 0
                            print(f"❌ FAILURE: DB save failed for {schema_id} - {db_save_error} (Failures: {self.failures}/{self.attempts}, {failure_rate:.1f}%)")
                        self.ui_callback("failure", {
                            "schema_id": schema_id,
                            "reason": db_save_error or "DB save failed"
                        })
                else:
                    with self.queue.queue_lock:
                        if self.queue.generated.get(schema_id, 0) > 0:
                            self.queue.generated[schema_id] -= 1
                    with self.lock:
                        self.failures += 1
                        print(f"❌ FAILURE: Accepted but no item for {schema_id} (Failures: {self.failures}/{self.attempts})")
                    self.ui_callback("failure", {
                        "schema_id": schema_id,
                        "reason": "Accepted but no item"
                    })
            else:
                # Generation failed
                with self.queue.queue_lock:
                    if self.queue.generated.get(schema_id, 0) > 0:
                        self.queue.generated[schema_id] -= 1
                with self.lock:
                    self.failures += 1
                    failure_reason = result.get("status", "unknown")
                    failure_rate = (self.failures / self.attempts * 100) if self.attempts > 0 else 0
                    print(f"❌ FAILURE: Generation failed for {schema_id} - status: {failure_reason} (Failures: {self.failures}/{self.attempts}, {failure_rate:.1f}%)")
                self.ui_callback("failure", {
                    "schema_id": schema_id,
                    "reason": failure_reason
                })
                
        except Exception as e:
            with self.queue.queue_lock:
                if self.queue.generated.get(schema_id, 0) > 0:
                    self.queue.generated[schema_id] -= 1
            with self.lock:
                self.failures += 1
                failure_rate = (self.failures / self.attempts * 100) if self.attempts > 0 else 0
                print(f"❌ EXCEPTION in worker task for {schema_id}: {e} (Failures: {self.failures}/{self.attempts}, {failure_rate:.1f}%)")
            import traceback
            traceback.print_exc()
            self.ui_callback("error", {"message": str(e)})
            
        finally:
            stats = self._get_stats()
            self.ui_callback("stats", stats)

    def _generation_loop(self):
        """Parallel generation loop with schema range partitioning."""
        try:
            # Calculate schema ranges for each agent to avoid collisions
            total_schemas = len(self.queue.ordered_schema_ids)
            schemas_per_agent = max(1, total_schemas // self.max_workers)
            
            # Assign each agent a non-overlapping range of schemas
            agent_ranges = []
            for i in range(self.max_workers):
                start_idx = i * schemas_per_agent
                end_idx = total_schemas if i == self.max_workers - 1 else (i + 1) * schemas_per_agent
                if start_idx < total_schemas:
                    agent_ranges.append((start_idx, end_idx))
                    print(f"🤖 Agent {i+1} assigned schemas {start_idx}-{end_idx-1} ({end_idx - start_idx} schemas)")
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                active_futures = {}
                agent_id_to_future = {}
                
                def get_schema_for_agent(agent_idx: int) -> Optional[str]:
                    """Get next schema for a specific agent's assigned range."""
                    if agent_idx < len(agent_ranges):
                        start_idx, end_idx = agent_ranges[agent_idx]
                        return self.queue.get_next_incomplete(schema_start_index=start_idx, schema_end_index=end_idx)
                    return None
                
                last_stats_refresh = time.time()
                
                while not self.stopped:
                    # Periodically refresh stats from DB (every 5 seconds)
                    current_time = time.time()
                    if current_time - last_stats_refresh > 5.0:
                        stats = self._get_stats()
                        self.ui_callback("stats", stats)
                        last_stats_refresh = current_time
                    
                    # Fill the pool - each agent works on their assigned range
                    for agent_idx in range(self.max_workers):
                        if len(active_futures) >= self.max_workers:
                            break
                        
                        # Check if this agent already has a task running
                        if any(agent_id_to_future.get(f) == agent_idx for f in active_futures.keys()):
                            continue
                        
                        # Get next schema in this agent's assigned range
                        schema_id = get_schema_for_agent(agent_idx)
                        
                        if not schema_id:
                            continue  # This agent has no more work
                        
                        self._update_difficulty_weights()
                        difficulty = self._choose_difficulty_for_schema(schema_id)
                        
                        # Update status label
                        self.ui_callback("status", {
                            "text": f"Running {len(active_futures)+1}/{self.max_workers} parallel agents...",
                            "color": "blue"
                        })
                        
                        # Submit task with agent ID for tracking
                        future = executor.submit(self._worker_task, schema_id, difficulty)
                        active_futures[future] = schema_id
                        agent_id_to_future[future] = agent_idx
                    
                    if not active_futures:
                        # All done! Final stats refresh
                        stats = self._get_stats()
                        self.ui_callback("stats", stats)
                        if not self.stopped:
                            self.ui_callback("status", {"text": "All schemas complete!", "color": "green"})
                        break
                    
                    # Wait for at least one task to finish
                    done_futures = []
                    try:
                        for future in as_completed(active_futures.keys(), timeout=1.0):
                            done_futures.append(future)
                            break
                    except Exception:
                        pass
                    
                    # Clean up done futures
                    for f in done_futures:
                        if f in active_futures:
                            active_futures.pop(f)
                            
        except Exception as e:
            print(f"Fatal error in generation loop: {e}")
            import traceback
            traceback.print_exc()
            self.ui_callback("error", {"message": f"Fatal: {str(e)}"})
        finally:
            self.stopped = True
    
    def _save_to_backup(self, item: dict):
        """Save question to local backup file."""
        backup_dir = Path(self.base_dir) / "backups" / datetime.now().strftime("%Y-%m-%d")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        backup_file = backup_dir / "questions.jsonl"
        with open(backup_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    
    def _refresh_stats_from_db(self):
        """Refresh success count and last generated ID from database."""
        if not self.queue.supabase or not self.session_start_time:
            return
        
        try:
            response = self.queue.supabase.table("ai_generated_questions")\
                .select("generation_id")\
                .gte("created_at", self.session_start_time)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if response.data and len(response.data) > 0:
                last_id = response.data[0].get("generation_id")
                if last_id:
                    self.last_generated_id = last_id
        except Exception as e:
            error_str = str(e)
            if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                pass
            else:
                print(f"⚠ Warning: Failed to refresh last generated ID from database: {e}")
    
    def _get_stats(self) -> dict:
        """Get current statistics - reads successes from DB, attempts/failures from memory."""
        self._refresh_stats_from_db()
        
        with self.lock:
            attempts = self.attempts
            failures = self.failures
            last_id = self.last_generated_id
        
        # Get successes from database
        successes = 0
        if self.queue.supabase and self.session_start_time:
            try:
                response = self.queue.supabase.table("ai_generated_questions")\
                    .select("id")\
                    .gte("created_at", self.session_start_time)\
                    .execute()
                
                if response.data:
                    successes = len(response.data)
                
                if response.data and len(response.data) > 0:
                    recent_response = self.queue.supabase.table("ai_generated_questions")\
                        .select("generation_id")\
                        .gte("created_at", self.session_start_time)\
                        .order("created_at", desc=True)\
                        .limit(1)\
                        .execute()
                    if recent_response.data and len(recent_response.data) > 0:
                        last_id = recent_response.data[0].get("generation_id")
                        if last_id:
                            with self.lock:
                                self.last_generated_id = last_id
                            last_id = self.last_generated_id
            except Exception as e:
                error_str = str(e)
                if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                    pass
                else:
                    print(f"⚠ Warning: Failed to get success count from database: {e}")
        
        elapsed = time.time() - self.start_time if self.start_time else 0
        success_rate = (successes / attempts * 100) if attempts > 0 else 0
        
        return {
            "attempts": attempts,
            "successes": successes,
            "failures": failures,
            "success_rate": success_rate,
            "elapsed": elapsed,
            "last_generated_id": last_id
        }


class SimpleGeneratorUI:
    """Simple Tkinter UI for batch generation."""
    
    def __init__(
        self,
        base_dir: str,
        paper_selection: Optional[Tuple[str, ...]] = None,
        start_offsets: Optional[Dict[str, int]] = None,
        stop_offsets: Optional[Dict[str, int]] = None,
    ):
        self.base_dir = base_dir
        self.base_dir_path = Path(base_dir)
        
        # Load environment
        project_root = Path(base_dir).parent.parent
        env_path = project_root / ".env.local"
        safe_load_dotenv(str(env_path))
        
        # Initialize Supabase client
        self.supabase = None
        if SUPABASE_AVAILABLE:
            try:
                supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
                supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
                if supabase_url and supabase_key:
                    self.supabase = create_client(supabase_url, supabase_key)
            except Exception as e:
                print(f"Failed to initialize Supabase: {e}")
        
        # Get paper selection: use parameter first, then env var, then default to both
        if paper_selection:
            self.paper_selection = paper_selection
        else:
            paper_selection_env = os.environ.get("PAPER_SELECTION", "Paper1,Paper2")
            self.paper_selection = tuple(p.strip() for p in paper_selection_env.split(",") if p.strip())
            if not self.paper_selection:
                self.paper_selection = ("Paper1", "Paper2")  # Default to both papers
        
        print(f"📋 Generating questions for papers: {', '.join(self.paper_selection)}")
        
        # Load schemas from both Paper 1 and Paper 2 files
        current_dir = os.path.dirname(os.path.abspath(__file__))
        scripts_dir = os.path.dirname(current_dir)
        esat_schemas_dir = os.path.join(scripts_dir, "esat_question_generator", "schemas")
        
        schemas_paper1_path = os.path.join(esat_schemas_dir, "Schemas_TMUA_Paper1.md")
        schemas_paper2_path = os.path.join(esat_schemas_dir, "Schemas_TMUA_Paper2.md")
        
        if not os.path.exists(schemas_paper1_path):
            raise FileNotFoundError(f"TMUA Paper 1 schema file not found: {schemas_paper1_path}")
        if not os.path.exists(schemas_paper2_path):
            raise FileNotFoundError(f"TMUA Paper 2 schema file not found: {schemas_paper2_path}")
        
        # Load both schema files
        schemas_paper1_md = read_text(schemas_paper1_path)
        schemas_paper2_md = read_text(schemas_paper2_path)
        
        # Parse both files
        paper1_prefixes = ("M",)  # Paper 1 always uses M_ prefix
        paper2_prefixes = ("R",)  # Paper 2 always uses R_ prefix
        
        schemas_paper1 = parse_schemas_from_markdown(schemas_paper1_md, allow_prefixes=paper1_prefixes)
        schemas_paper2 = parse_schemas_from_markdown(schemas_paper2_md, allow_prefixes=paper2_prefixes)
        
        # Combine schemas and track which paper they came from
        self.schemas = {**schemas_paper1, **schemas_paper2}
        self.paper_schema_map = {}
        for sid in schemas_paper1.keys():
            self.paper_schema_map[sid] = "Paper1"
        for sid in schemas_paper2.keys():
            self.paper_schema_map[sid] = "Paper2"
        
        # Filter schemas based on paper selection
        if "Paper1" not in self.paper_selection:
            # Remove Paper 1 schemas
            for sid in list(self.schemas.keys()):
                if self.paper_schema_map.get(sid) == "Paper1":
                    del self.schemas[sid]
                    del self.paper_schema_map[sid]
        
        if "Paper2" not in self.paper_selection:
            # Remove Paper 2 schemas
            for sid in list(self.schemas.keys()):
                if self.paper_schema_map.get(sid) == "Paper2":
                    del self.schemas[sid]
                    del self.paper_schema_map[sid]
        
        print(f"📖 Loaded {len(schemas_paper1)} Paper 1 schemas and {len(schemas_paper2)} Paper 2 schemas")
        print(f"📋 Using {len(self.schemas)} schemas after filtering")
        
        # Get coverage from database
        self.coverage = self._get_schema_coverage()
        
        # Initialize queue
        self.queue = SchemaQueue(
            self.schemas,
            self.coverage,
            self.paper_schema_map,
            self.supabase,
            start_offsets=start_offsets,
            stop_offsets=stop_offsets,
        )
        
        # Debug: Print first 20 schemas to verify order
        print("\nSchema generation order (first 20):")
        for i, sid in enumerate(self.queue.ordered_schema_ids[:20], 1):
            paper = self.paper_schema_map.get(sid, "Unknown")
            print(f"  {i}. {sid} ({paper})")
        print(f"  ... ({len(self.queue.ordered_schema_ids)} total schemas)\n")
        
        # Initialize config with default difficulty weights
        difficulty_weights = self._load_difficulty_weights()
        dist_str = ", ".join(f"{k}={difficulty_weights[k]:.1%}" for k in sorted(difficulty_weights))
        print(f"📊 Difficulty distribution: {dist_str}")
        print(f"💡 Tip: Edit 'difficulty_weights.txt' in this directory to change weights mid-run!")
        
        max_workers = int(os.environ.get("MAX_WORKERS", "2"))
        self.cfg = RunConfig(
            max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
            max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
            seed=None,
            difficulty_weights=difficulty_weights,
            schema_weights=None,
            out_dir="runs",
            allow_schema_prefixes=_schema_prefixes_from_env_tuple(),
            enable_tag_labeling=True,
        )
        
        # Use centralized model config
        self.models = get_default_models_config()
        if not os.environ.get("MODEL_IMPLEMENTER"):
            self.models.implementer = "models/gemini-3-pro-preview"
        
        # Initialize controller
        self.controller = GenerationController(
            self.base_dir,
            self.queue,
            self.schemas,
            self.cfg,
            self.models,
            self._ui_callback,
            ui_instance=self,
            max_workers=max_workers
        )
        
        # Create UI
        self.root = tk.Tk()
        self.root.title("TMUA Question Generator")
        self.root.geometry("800x700")
        self.root.resizable(True, True)
        
        self._create_ui()
    
    def _load_difficulty_weights(self) -> Dict[str, float]:
        """Load difficulty weights from file or use defaults."""
        weights_file = self.base_dir_path / "difficulty_weights.txt"
        tmua = is_tmua_allow_schema_prefixes(_schema_prefixes_from_env_tuple())
        default_weights: Dict[str, float] = (
            {"Hard": 0.5, "Extreme": 0.5}
            if tmua
            else {"Easy": 0.1, "Medium": 0.3, "Hard": 0.6}
        )
        
        if weights_file.exists():
            try:
                with open(weights_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    parsed: Dict[str, float] = {}
                    for line in content.split('\n'):
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            key, value = line.split('=', 1)
                            key = key.strip()
                            value = value.strip()
                            parsed[key] = float(value)
                    if tmua:
                        only_he = {k: parsed[k] for k in ("Hard", "Extreme") if k in parsed}
                        return normalize_tmua_difficulty_weights(only_he if only_he else None)
                    weights = {k: parsed[k] for k in default_weights if k in parsed}
                    if weights:
                        total = sum(weights.values())
                        if total > 0:
                            return {k: v / total for k, v in weights.items()}
            except Exception as e:
                print(f"⚠ Warning: Failed to load difficulty_weights.txt: {e}")
                print(f"   Using defaults: {default_weights}")
        
        # Create default file if it doesn't exist
        try:
            with open(weights_file, 'w', encoding='utf-8') as f:
                f.write("# Difficulty weights (values will be normalized to sum to 1.0)\n")
                if tmua:
                    f.write("# TMUA: only Hard and Extreme are used.\n")
                f.write("# Edit this file to change weights mid-run!\n")
                for k in sorted(default_weights):
                    f.write(f"{k}={default_weights[k]}\n")
        except Exception:
            pass
        
        return default_weights if not tmua else normalize_tmua_difficulty_weights(None)
        
    def _get_schema_coverage(self) -> Dict[str, int]:
        """Get current schema coverage from Supabase (prioritized) or JSON file."""
        # PRIORITY 1: Query Supabase for real-time coverage
        if self.supabase:
            try:
                # Try RPC function first
                try:
                    response = self.supabase.rpc("get_schema_coverage").execute()
                    if response.data:
                        coverage = {row["schema_id"]: row["total"] for row in response.data}
                        print(f"✓ Loaded schema coverage from Supabase (RPC): {len(coverage)} schemas")
                        return coverage
                except Exception:
                    pass
                
                # Fallback: Direct query
                response = self.supabase.table("ai_generated_questions").select("schema_id").execute()
                if response.data:
                    coverage = {}
                    for row in response.data:
                        schema_id = row["schema_id"]
                        coverage[schema_id] = coverage.get(schema_id, 0) + 1
                    print(f"✓ Loaded schema coverage from Supabase (direct query): {len(coverage)} schemas")
                    return coverage
            except Exception as e:
                print(f"Warning: Failed to get schema coverage from Supabase: {e}")
        
        print("⚠ No schema coverage found - starting from zero")
        return {}
    
    def _create_ui(self):
        """Create the UI layout."""
        # Title
        title_frame = ttk.Frame(self.root, padding="10")
        title_frame.pack(fill=tk.X)
        
        title_label = ttk.Label(
            title_frame,
            text="TMUA Question Generator",
            font=("Arial", 16, "bold")
        )
        title_label.pack()
        
        # Control buttons
        control_frame = ttk.Frame(self.root, padding="10")
        control_frame.pack(fill=tk.X)
        
        self.start_button = ttk.Button(
            control_frame,
            text="Start Generation",
            command=self._on_start,
            width=20
        )
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        self.stop_button = ttk.Button(
            control_frame,
            text="Stop",
            command=self._on_stop,
            width=20,
            state=tk.DISABLED
        )
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        # Status
        status_frame = ttk.Frame(self.root, padding="10")
        status_frame.pack(fill=tk.X)
        
        self.status_label = ttk.Label(
            status_frame,
            text="Ready to start",
            font=("Arial", 10)
        )
        self.status_label.pack(anchor=tk.W)
        
        self.stage_label = ttk.Label(
            status_frame,
            text="",
            font=("Arial", 9),
            foreground="gray"
        )
        self.stage_label.pack(anchor=tk.W)
        
        # Schema progress (scrolled list)
        progress_frame = ttk.LabelFrame(self.root, text="Schema Progress", padding="10")
        progress_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.progress_text = scrolledtext.ScrolledText(
            progress_frame,
            height=15,
            font=("Consolas", 9),
            state=tk.DISABLED
        )
        self.progress_text.pack(fill=tk.BOTH, expand=True)
        
        # Overall stats
        stats_frame = ttk.LabelFrame(self.root, text="Overall Progress", padding="10")
        stats_frame.pack(fill=tk.X, padx=10, pady=10)
        
        self.overall_label = ttk.Label(
            stats_frame,
            text="0/0 questions (0.0%)",
            font=("Arial", 10)
        )
        self.overall_label.pack(anchor=tk.W)
        
        self.progress_bar = ttk.Progressbar(
            stats_frame,
            mode='determinate',
            length=400
        )
        self.progress_bar.pack(fill=tk.X, pady=5)
        
        # Paper-specific stats
        self.paper1_label = ttk.Label(
            stats_frame,
            text="Paper 1: 0/0",
            font=("Arial", 9)
        )
        self.paper1_label.pack(anchor=tk.W)
        
        self.paper2_label = ttk.Label(
            stats_frame,
            text="Paper 2: 0/0",
            font=("Arial", 9)
        )
        self.paper2_label.pack(anchor=tk.W)
        
        self.last_gen_label = ttk.Label(
            stats_frame,
            text="Last Generated: None",
            font=("Arial", 9)
        )
        self.last_gen_label.pack(anchor=tk.W)
        
        self.success_rate_label = ttk.Label(
            stats_frame,
            text="Success Rate: 0% (0/0 attempts)",
            font=("Arial", 9)
        )
        self.success_rate_label.pack(anchor=tk.W)
        
        self.elapsed_label = ttk.Label(
            stats_frame,
            text="Elapsed: 0m 0s",
            font=("Arial", 9)
        )
        self.elapsed_label.pack(anchor=tk.W)
        
        # Initial update
        self._update_progress_display()
        
        # Initial stats refresh
        if hasattr(self, 'controller') and self.controller:
            stats = self.controller._get_stats()
            self._update_stats_display(stats)
    
    def _on_start(self):
        """Handle start button click."""
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.controller.start()
        self._update_progress_display()
    
    def _on_stop(self):
        """Handle stop button click."""
        self.controller.stop()
        self.stop_button.config(state=tk.DISABLED)
        self.start_button.config(state=tk.NORMAL)
        self.status_label.config(text="Stopped", foreground="red")
    
    def _ui_callback(self, event_type: str, data: dict):
        """Callback from controller to update UI."""
        # Ensure we're only accessing root from main thread via after()
        try:
            if event_type == "status":
                self.root.after(0, lambda: self.status_label.config(
                    text=data.get("text", ""),
                    foreground=data.get("color", "black")
                ))
            elif event_type == "stage":
                self.root.after(0, lambda: self.stage_label.config(text=data))
            elif event_type == "success":
                self.root.after(0, self._update_progress_display)
            elif event_type == "failure":
                self.root.after(0, self._update_progress_display)
            elif event_type == "stats":
                self.root.after(0, lambda: self._update_stats_display(data))
            elif event_type == "error":
                # messagebox can be problematic from threads, wrap in after()
                error_msg = data.get("message", "Unknown error")
                self.root.after(0, lambda msg=error_msg: messagebox.showerror("Error", msg))
        except RuntimeError as e:
            # "main thread is not in main loop" - ignore if root not ready yet
            if "main thread is not in main loop" not in str(e):
                raise
            # Otherwise just log it, don't crash
            print(f"[WARNING] UI callback failed (root not ready): {event_type}")
        except AttributeError:
            # root might not exist yet
            print(f"[WARNING] UI callback failed (root not initialized): {event_type}")
    
    def _update_progress_display(self):
        """Update the schema progress display."""
        # Refresh coverage from database before displaying
        with self.queue.queue_lock:
            self.queue.refresh_coverage_from_db()
        
        # Refresh stats from DB
        if self.controller:
            stats = self.controller._get_stats()
            self._update_stats_display(stats)
        
        self.progress_text.config(state=tk.NORMAL)
        self.progress_text.delete(1.0, tk.END)
        
        for schema_id in self.queue.ordered_schema_ids:
            db_count = self.queue.coverage.get(schema_id, 0)
            session_count = self.queue.generated.get(schema_id, 0)
            current = self.queue.get_current_count(schema_id)
            required = self.queue.get_required_count(schema_id)
            is_complete = self.queue.is_complete(schema_id)
            paper = self.queue.paper_schema_map.get(schema_id, "Unknown")
            
            # Determine status symbol
            if is_complete:
                symbol = "✓"
                status = "[COMPLETE]"
            elif current > 0:
                symbol = "▶"
                status = "[IN PROGRESS]"
            else:
                symbol = " "
                status = "[PENDING]"
            
            # Show detailed breakdown
            if session_count > 0:
                line = f"{symbol} {schema_id} ({paper}): {current}/{required} (DB:{db_count} + session:{session_count}) {status}\n"
            else:
                line = f"{symbol} {schema_id} ({paper}): {current}/{required} questions {status}\n"
            
            self.progress_text.insert(tk.END, line)
        
        self.progress_text.config(state=tk.DISABLED)
        
        # Update overall progress
        summary = self.queue.get_progress_summary()
        self.overall_label.config(
            text=f"{summary['total_current']}/{summary['total_required']} questions ({summary['percentage']:.1f}%)"
        )
        self.progress_bar['value'] = summary['percentage']
        
        # Update paper-specific progress
        paper_progress = self.queue.get_paper_progress()
        if 'Paper1' in paper_progress:
            p1 = paper_progress['Paper1']
            self.paper1_label.config(text=f"Paper 1: {p1['current']}/{p1['required']}")
        else:
            self.paper1_label.config(text="Paper 1: 0/0")
        if 'Paper2' in paper_progress:
            p2 = paper_progress['Paper2']
            self.paper2_label.config(text=f"Paper 2: {p2['current']}/{p2['required']}")
        else:
            self.paper2_label.config(text="Paper 2: 0/0")
    
    def _update_stats_display(self, stats: dict):
        """Update statistics display."""
        # Update last generated ID
        last_id = stats.get("last_generated_id")
        if last_id:
            display_id = last_id if len(last_id) <= 30 else last_id[:27] + "..."
            self.last_gen_label.config(text=f"Last Generated: {display_id}")
        else:
            self.last_gen_label.config(text="Last Generated: None")
        
        # Update success rate
        attempts = stats.get("attempts", 0)
        successes = stats.get("successes", 0)
        success_rate = stats.get("success_rate", 0)
        
        if attempts > 0:
            self.success_rate_label.config(
                text=f"Success Rate: {success_rate:.1f}% ({successes}/{attempts} attempts)"
            )
        else:
            self.success_rate_label.config(
                text="Success Rate: 0% (0/0 attempts)"
            )
        
        # Update elapsed time
        elapsed = stats.get("elapsed", 0)
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)
        self.elapsed_label.config(text=f"Elapsed: {minutes}m {seconds}s")
    
    def run(self):
        """Run the UI."""
        self.root.mainloop()


def main():
    """Main entry point."""
    base_dir = Path(__file__).parent
    
    # Check for API key
    project_root = base_dir.parent.parent
    env_path = project_root / ".env.local"
    safe_load_dotenv(str(env_path))
    
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in environment")
        print(f"Please add it to {env_path}")
        sys.exit(1)
    
    if not SUPABASE_AVAILABLE:
        print("Warning: Supabase not available. Install with: pip install supabase")
        response = input("Continue without Supabase? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)

    # Interactive prompt for paper selection
    print("\n" + "=" * 60)
    print("TMUA Question Generator - Paper Selection")
    print("=" * 60)
    print("\nWhich papers would you like to generate questions for?")
    print("  Paper1 = Mathematical Knowledge (M_ schemas)")
    print("  Paper2 = Mathematical Reasoning (R_ schemas)")
    print("\nYou can select:")
    print("  - Single paper: Paper1 or Paper2")
    print("  - Both papers: Paper1,Paper2 or press Enter for default")

    selected = input(
        "\nEnter papers (e.g., Paper1 or Paper1,Paper2, or press Enter for both): "
    ).strip()

    # Parse selection
    if not selected:
        selected_papers = ("Paper1", "Paper2")
        print("✓ Using both papers: Paper1, Paper2")
    else:
        papers = [p.strip() for p in selected.split(",") if p.strip()]
        valid_papers = []
        for p in papers:
            if p in ("Paper1", "Paper2"):
                valid_papers.append(p)
            else:
                print(f"⚠ Warning: '{p}' is not a valid paper (Paper1, Paper2). Ignoring.")

        if not valid_papers:
            print("❌ No valid papers selected. Using both papers as default.")
            selected_papers = ("Paper1", "Paper2")
        else:
            selected_papers = tuple(valid_papers)
            print(f"✓ Selected papers: {', '.join(selected_papers)}")

    print("\n" + "=" * 60 + "\n")

    # Create and run UI
    app = SimpleGeneratorUI(
        str(base_dir),
        paper_selection=selected_papers,
    )
    app.run()


if __name__ == "__main__":
    main()
