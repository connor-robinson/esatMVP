#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple Question Generator UI

A clean, hands-off Tkinter interface for batch question generation.
Works systematically through schemas (M→P→C→B), saves immediately to Supabase and local backup.
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
    load_schemas_esat_markdown, GeminiQuotaExhaustedError,
    append_gemini_api_event,
)

try:
    from math_paper_router import call_math_paper_router, merge_router_with_quota
    MATH_PAPER_ROUTER_AVAILABLE = True
except ImportError:
    MATH_PAPER_ROUTER_AVAILABLE = False

# Import database sync
try:
    from db_sync import sync_question_from_pipeline
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("Warning: Supabase not available")


class SchemaQueue:
    """Manages the queue of schemas to generate questions for."""
    
    def __init__(
        self,
        schemas: Dict[str, dict],
        coverage: Dict[str, int],
        supabase_client=None,
        start_offsets: Optional[Dict[str, int]] = None,
        stop_offsets: Optional[Dict[str, int]] = None,
    ):
        """
        Initialize schema queue.

        Args:
            schemas: Dict of {schema_id: {"block": text, "title": text}}
            coverage: Dict of {schema_id: current_count} from database
            supabase_client: Optional Supabase client for refreshing coverage
            start_offsets: Optional dict of {prefix: start_number}, e.g. {"M": 20}
                to start from M20 instead of M1. Useful when running multiple
                generator instances in parallel.
            stop_offsets: Optional dict of {prefix: stop_number}, e.g. {"M": 50}
                to stop at M50 (inclusive). When combined with start_offsets,
                allows processing a specific range like M20-M50.
        """
        self.schemas = schemas
        self.coverage = coverage  # Current counts from DB
        self.generated = {sid: 0 for sid in schemas.keys()}  # Counts in this session
        self.supabase = supabase_client
        self.start_offsets = start_offsets or {}
        self.stop_offsets = stop_offsets or {}
        self.queue_lock = threading.Lock()  # Lock for thread-safe queue operations
        # Filled in refresh_coverage_from_db() alongside per-schema counts (M* only)
        self.math_paper_db_counts: Dict[str, int] = {"Math 1": 0, "Math 2": 0, "unlabeled": 0}
        
        # Order schemas: M1-M7, P1-P98, C1-C17, B1-B11
        self.ordered_schema_ids = self._order_schemas(list(schemas.keys()))
        
    def _order_schemas(self, schema_ids: List[str]) -> List[str]:
        """Order schemas by prefix and number."""
        def sort_key(sid):
            match = re.match(r'^([A-Z]+)(\d+)', sid)
            if match:
                prefix, num = match.groups()
                # Order: M, P, C, B, then by number
                prefix_order = {'M': 0, 'P': 1, 'C': 2, 'B': 3}
                return (prefix_order.get(prefix, 99), int(num))
            return (99, 0)
        
        ordered = sorted(schema_ids, key=sort_key)

        # If start/stop offsets are provided, filter schemas accordingly.
        # This allows multiple generator instances to work on disjoint ranges,
        # e.g. one on M1–M19, another on M20–M50, and another on M51+.
        if not self.start_offsets and not self.stop_offsets:
            return ordered

        filtered: List[str] = []
        for sid in ordered:
            match = re.match(r'^([A-Z]+)(\d+)', sid)
            if not match:
                # Non-standard IDs are always kept
                filtered.append(sid)
                continue

            prefix, num_str = match.groups()
            try:
                num = int(num_str)
            except ValueError:
                # If parsing fails, keep the schema to avoid accidental drops
                filtered.append(sid)
                continue

            # Check start offset: skip schemas before the starting index
            start_num = self.start_offsets.get(prefix)
            if start_num is not None and num < start_num:
                continue

            # Check stop offset: skip schemas after the stopping index
            stop_num = self.stop_offsets.get(prefix)
            if stop_num is not None and num > stop_num:
                continue

            filtered.append(sid)

        return filtered
    
    def get_required_count(self, schema_id: str) -> int:
        """
        Target questions per schema.

        Mathematics (M*): 3 by default; 5 when the schema lists more than 3 exemplar IDs.
        Physics / Chemistry / Biology: 4 + number of exemplar IDs (unchanged).
        """
        schema_data = self.schemas.get(schema_id, {})
        exemplar_ids = schema_data.get("exemplar_ids", [])
        prefix = str(schema_id)[0].upper() if schema_id else ""
        if prefix == "M":
            return 5 if len(exemplar_ids) > 3 else 3
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
            # schema_id + paper: one pass for coverage and Math 1/2 bank totals
            try:
                response = self.supabase.table("ai_generated_questions").select("schema_id, paper").execute()
            except Exception:
                response = self.supabase.table("ai_generated_questions").select("schema_id").execute()
            
            new_coverage: Dict[str, int] = {}
            mpaper = {"Math 1": 0, "Math 2": 0, "unlabeled": 0}
            if response.data:
                for row in response.data:
                    schema_id = row.get("schema_id")
                    if schema_id:  # Skip rows with missing schema_id
                        new_coverage[schema_id] = new_coverage.get(schema_id, 0) + 1
                    if schema_id and str(schema_id)[0].upper() == "M":
                        p = row.get("paper")
                        if p == "Math 2":
                            mpaper["Math 2"] += 1
                        elif p == "Math 1":
                            mpaper["Math 1"] += 1
                        else:
                            mpaper["unlabeled"] += 1
            self.math_paper_db_counts = mpaper
            
            # Preserve existing coverage for schemas we know about but may not have questions yet
            # This ensures we don't lose track of schemas that are in our list
            for schema_id in self.schemas.keys():
                if schema_id not in new_coverage:
                    # Keep existing count if we had one, otherwise 0
                    new_coverage[schema_id] = self.coverage.get(schema_id, 0)
            
            # Update coverage from DB (this is the source of truth)
            # Note: session-generated counts (self.generated) are tracked separately
            # and added in get_current_count(), so we can safely replace coverage here
            self.coverage = new_coverage
            print(f"🔄 Refreshed coverage from database: {len([s for s in new_coverage.values() if s > 0])} schemas with questions, {len(new_coverage)} total schemas tracked")
        except Exception as e:
            # Don't spam errors for network issues - these are expected occasionally
            error_str = str(e)
            if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                # Network issue - keep existing coverage, will retry on next refresh
                pass
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
                              This allows agents to work on non-overlapping schema ranges.
        """
        with self.queue_lock:
            # Refresh coverage from DB before selecting next schema (critical for multi-agent)
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
                current = db_count + session_count  # Use get_current_count logic directly
                required = self.get_required_count(schema_id)
                
                if current < required:
                    # Reserve this schema by incrementing session count (prevents other agents from selecting it)
                    self.generated[schema_id] = session_count + 1
                    # Debug: show why this schema was selected
                    if schema_start_index is not None:
                        range_info = f"[range {schema_start_index}-{schema_end_index-1 if schema_end_index else len(self.ordered_schema_ids)-1}]"
                    else:
                        range_info = ""
                    print(f"🎯 {range_info} Selected {schema_id}: {current}/{required} (DB: {db_count}, session: {session_count}→{session_count+1}, needs {required - current} more)")
                    return schema_id
                elif db_count < required:
                    # Safety check: Even if current count says complete, verify DB has enough
                    # This prevents moving on when session counts are wrong
                    self.generated[schema_id] = session_count + 1
                    if schema_start_index is not None:
                        range_info = f"[range {schema_start_index}-{schema_end_index-1 if schema_end_index else len(self.ordered_schema_ids)-1}]"
                    else:
                        range_info = ""
                    print(f"⚠ {range_info} {schema_id} appears complete ({current}/{required}) but DB only has {db_count} - continuing to generate")
                    return schema_id
                else:
                    # Skip complete schemas (only log first few to avoid spam)
                    pass
            
            return None

    def claim_schema_for_prefix(
        self,
        prefix: str,
        *,
        allow_past_quota: bool = False,
    ) -> Optional[str]:
        """
        Thread-safe: pick next schema for a subject prefix, optionally past per-schema targets
        (night mode when session totals still need more but every schema is already full).
        """
        prefix_u = prefix.strip().upper()
        if not prefix_u:
            return None
        with self.queue_lock:
            self.refresh_coverage_from_db()
            candidates = [
                sid
                for sid in self.ordered_schema_ids
                if sid and str(sid)[0].upper() == prefix_u
            ]
            if not candidates:
                return None

            for schema_id in candidates:
                db_count = self.coverage.get(schema_id, 0)
                session_count = self.generated.get(schema_id, 0)
                current = db_count + session_count
                required = self.get_required_count(schema_id)
                if current < required:
                    self.generated[schema_id] = session_count + 1
                    print(
                        f"🎯 [{prefix_u}] Selected {schema_id}: {current}/{required} "
                        f"(DB:{db_count}, session:{session_count}→{session_count + 1})"
                    )
                    return schema_id
                if db_count < required:
                    self.generated[schema_id] = session_count + 1
                    print(
                        f"⚠ [{prefix_u}] {schema_id} session {current}/{required} but DB {db_count} — continuing"
                    )
                    return schema_id

            if not allow_past_quota:
                return None

            best = min(candidates, key=lambda sid: self.get_current_count(sid))
            sc = self.generated.get(best, 0)
            self.generated[best] = sc + 1
            cur = self.get_current_count(best)
            req = self.get_required_count(best)
            print(
                f"🔁 [{prefix_u}] Overflow {best}: {cur}/{req} (session per-schema target exceeded; night quota)"
            )
            return best

    def claim_next_schema_global(self) -> Optional[str]:
        """Next incomplete schema across all queued subjects (no per-worker range split)."""
        with self.queue_lock:
            self.refresh_coverage_from_db()
            for schema_id in self.ordered_schema_ids:
                db_count = self.coverage.get(schema_id, 0)
                session_count = self.generated.get(schema_id, 0)
                current = db_count + session_count
                required = self.get_required_count(schema_id)
                if current < required:
                    self.generated[schema_id] = session_count + 1
                    print(
                        f"🎯 Selected {schema_id}: {current}/{required} "
                        f"(DB:{db_count}, session:{session_count}→{session_count + 1})"
                    )
                    return schema_id
                if db_count < required:
                    self.generated[schema_id] = session_count + 1
                    print(
                        f"⚠ {schema_id} session {current}/{required} but DB {db_count} — continuing"
                    )
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
    
    def get_subject_progress(self) -> Dict[str, Dict[str, int]]:
        """Get progress summary by subject (Mathematics M*, Physics, Chemistry, Biology)."""
        subject_prefixes = (
            ('M', 'Mathematics'),
            ('P', 'Physics'),
            ('C', 'Chemistry'),
            ('B', 'Biology'),
        )
        subject_stats: Dict[str, Dict[str, int]] = {}
        
        for prefix, subject_name in subject_prefixes:
            subject_schemas = [
                sid for sid in self.ordered_schema_ids
                if sid and str(sid)[0].upper() == prefix
            ]
            if subject_schemas:
                required = sum(self.get_required_count(sid) for sid in subject_schemas)
                current = sum(self.get_current_count(sid) for sid in subject_schemas)
                subject_stats[subject_name] = {
                    'current': current,
                    'required': required
                }
        
        return subject_stats

    def get_mathematics_remaining(self) -> int:
        """Total M* questions still to generate across queued schemas."""
        total = 0
        for sid in self.ordered_schema_ids:
            if sid and str(sid)[0].upper() == "M":
                r = self.get_required_count(sid)
                c = self.get_current_count(sid)
                if c < r:
                    total += r - c
        return total


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
        self.ui_instance = ui_instance  # Reference to UI for loading difficulty weights
        self.max_workers = max_workers
        
        self.stopped = False
        self.thread = None
        self.lock = threading.Lock()
        
        # Statistics
        self.attempts = 0  # Track in memory (attempts happen even if generation fails)
        self.failures = 0  # Track in memory (failures aren't saved to DB)
        self.start_time = None
        self.last_generated_id = None
        self.session_start_time = None  # Track when session started to count successes from DB
        self._session_math1 = 0
        self._session_math2 = 0  # saved M* questions this session (by paper), after DB write
        self._session_physics = 0
        self._session_chemistry = 0
        self._session_biology = 0
        # Session caps (saved rows). Defaults: 100 Math1, 100 Math2, 30 each P/C/B (= 290 total).
        self._cap_disabled = os.environ.get("ESAT_DISABLE_SESSION_CAP", "").strip().lower() in (
            "1",
            "true",
            "yes",
            "on",
        )

        def _ie(name: str, default: int) -> int:
            try:
                return int(os.environ.get(name, str(default)))
            except ValueError:
                return default

        self._target_m1 = max(0, _ie("ESAT_SESSION_M1", 100))
        self._target_m2 = max(0, _ie("ESAT_SESSION_M2", 100))
        self._target_p = max(0, _ie("ESAT_SESSION_P", 30))
        self._target_c = max(0, _ie("ESAT_SESSION_C", 30))
        self._target_b = max(0, _ie("ESAT_SESSION_B", 30))
        
        # Initialize curriculum parser for tag labeling
        self.curriculum_parser = None
        if CURRICULUM_PARSER_AVAILABLE and cfg.enable_tag_labeling:
            try:
                json_path = Path(base_dir) / "curriculum" / "ESAT_CURRICULUM.json"
                if json_path.is_file():
                    self.curriculum_parser = CurriculumParser(str(json_path))
                    print("✓ Curriculum parser loaded for tag labeling (Math 1/2, P, C, B)")
                else:
                    print(f"⚠ {json_path} not found — tag labeling disabled for this session.")
            except Exception as e:
                print(f"⚠ Warning: Failed to load curriculum parser: {e}")
                print("  Tag labeling will be disabled.")
        
    def start(self):
        """Start generation in background thread."""
        if self.thread and self.thread.is_alive():
            return
        
        self.stopped = False
        self.start_time = time.time()
        self.session_start_time = datetime.now().isoformat()  # ISO format for DB queries
        with self.lock:
            self._session_math1 = 0
            self._session_math2 = 0
            self._session_physics = 0
            self._session_chemistry = 0
            self._session_biology = 0
        append_gemini_api_event(
            {
                "event": "session_start",
                "session_start_time": self.session_start_time,
                "caps": {
                    "math1": self._target_m1,
                    "math2": self._target_m2,
                    "physics": self._target_p,
                    "chemistry": self._target_c,
                    "biology": self._target_b,
                    "cap_disabled": self._cap_disabled,
                },
            }
        )
        self.thread = threading.Thread(target=self._generation_loop, daemon=True)
        self.thread.start()
    
    def stop(self):
        """Stop generation."""
        self.stopped = True

    def _all_session_targets_met(self) -> bool:
        if self._cap_disabled:
            return False
        with self.lock:
            return (
                self._session_math1 >= self._target_m1
                and self._session_math2 >= self._target_m2
                and self._session_physics >= self._target_p
                and self._session_chemistry >= self._target_c
                and self._session_biology >= self._target_b
            )

    def _math_session_remaining(self) -> Tuple[int, int]:
        with self.lock:
            return (
                max(0, self._target_m1 - self._session_math1),
                max(0, self._target_m2 - self._session_math2),
            )

    def _prefix_overflow_needed(self, prefix: str) -> bool:
        """True if every schema in prefix is at/above per-schema target but session cap not met."""
        if self._cap_disabled:
            return False
        prefix_u = prefix.upper()
        schemas = [
            sid
            for sid in self.queue.ordered_schema_ids
            if sid and str(sid)[0].upper() == prefix_u
        ]
        if not schemas:
            return False
        if not all(self.queue.is_complete(sid) for sid in schemas):
            return False
        with self.lock:
            if prefix_u == "M":
                return self._session_math1 < self._target_m1 or self._session_math2 < self._target_m2
            if prefix_u == "P":
                return self._session_physics < self._target_p
            if prefix_u == "C":
                return self._session_chemistry < self._target_c
            if prefix_u == "B":
                return self._session_biology < self._target_b
        return False

    def _pick_prefix_for_session(self) -> Optional[str]:
        """Choose M / P / C / B with largest remaining session deficit (deterministic ties: M,P,C,B)."""
        if self._cap_disabled:
            return None
        order = ("M", "P", "C", "B")
        r1, r2 = self._math_session_remaining()
        with self.lock:
            rp = max(0, self._target_p - self._session_physics)
            rc = max(0, self._target_c - self._session_chemistry)
            rb = max(0, self._target_b - self._session_biology)
        rm = r1 + r2
        deficits = {"M": rm, "P": rp, "C": rc, "B": rb}
        best_p = None
        best_d = -1
        for p in order:
            d = deficits.get(p, 0)
            if d <= 0:
                continue
            if d > best_d:
                best_d = d
                best_p = p
        return best_p

    def _claim_next_job(self) -> Optional[Tuple[str, Optional[str]]]:
        """
        Returns (schema_id, forced_math_paper) for the next unit of work.
        forced_math_paper is set for M* when one of Math1/Math2 session caps is already met.
        """
        if self._cap_disabled:
            sid = self.queue.claim_next_schema_global()
            return (sid, None) if sid else None

        if self._all_session_targets_met():
            return None

        primary = self._pick_prefix_for_session()
        if not primary:
            return None

        try_order = [primary] + [p for p in ("M", "P", "C", "B") if p != primary]

        for prefix in try_order:
            r1, r2 = self._math_session_remaining()
            with self.lock:
                rp = max(0, self._target_p - self._session_physics)
                rc = max(0, self._target_c - self._session_chemistry)
                rb = max(0, self._target_b - self._session_biology)
            need = {
                "M": r1 + r2,
                "P": rp,
                "C": rc,
                "B": rb,
            }
            if need.get(prefix, 0) <= 0:
                continue

            forced: Optional[str] = None
            if prefix == "M":
                with self.lock:
                    m1f = self._session_math1 >= self._target_m1
                    m2f = self._session_math2 >= self._target_m2
                if m1f and not m2f:
                    forced = "Math 2"
                elif m2f and not m1f:
                    forced = "Math 1"
                elif m1f and m2f:
                    continue

            allow_overflow = self._prefix_overflow_needed(prefix)
            sid = self.queue.claim_schema_for_prefix(prefix, allow_past_quota=allow_overflow)
            if sid:
                return (sid, forced)

            if not allow_overflow and self._prefix_overflow_needed(prefix):
                sid = self.queue.claim_schema_for_prefix(prefix, allow_past_quota=True)
                if sid:
                    return (sid, forced)

        return None

    def _update_difficulty_weights(self):
        """Update difficulty weights from file (allows mid-run changes)."""
        try:
            if self.ui_instance:
                new_weights = self.ui_instance._load_difficulty_weights()
            else:
                # Fallback: use current weights
                new_weights = self.cfg.difficulty_weights
            self.cfg.difficulty_weights = new_weights
        except Exception as e:
            print(f"⚠ Warning: Failed to update difficulty weights: {e}")
    
    def _choose_difficulty_for_schema(self, schema_id: str) -> str:
        """Sample difficulty from ``cfg.difficulty_weights`` — same mix for M / P / C / B."""
        _ = schema_id  # reserved for future per-schema overrides
        return choose_difficulty(self.cfg)
    
    def _worker_task(
        self,
        schema_id: str,
        difficulty: str,
        forced_math_paper: Optional[str] = None,
    ):
        """Single worker task to generate one question."""
        # Increment attempts at the start (before generation begins)
        with self.lock:
            self.attempts += 1
            current_attempt = self.attempts
        
        original_difficulty = self.cfg.difficulty_weights
        try:
            # Generate question (temporarily set difficulty in cfg for this run)
            self.cfg.difficulty_weights = {difficulty: 1.0}  # Set specific difficulty for this run

            run_math_paper = None
            if schema_id and str(schema_id)[0].upper() == "M":
                if forced_math_paper in ("Math 1", "Math 2"):
                    run_math_paper = forced_math_paper
                    self.ui_callback(
                        "stage",
                        f"[{schema_id}] Math paper forced → {run_math_paper} (session cap balance)",
                    )
                else:
                    router_env = os.environ.get("ESAT_MATH_ROUTER", "1").strip().lower()
                    use_router = router_env not in ("0", "false", "no", "off")
                    if use_router and MATH_PAPER_ROUTER_AVAILABLE:
                        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
                        block = self.schemas.get(schema_id, {}).get("block", "")
                        if api_key and block:
                            try:
                                router_out = call_math_paper_router(api_key, self.base_dir, schema_id, block)
                                with self.lock:
                                    m1, m2 = self._session_math1, self._session_math2
                                run_math_paper = merge_router_with_quota(router_out, m1, m2)
                                self.ui_callback(
                                    "stage",
                                    f"[{schema_id}] Math router → {run_math_paper} ({router_out.get('eligibility', '')})",
                                )
                            except GeminiQuotaExhaustedError:
                                raise
                            except Exception as router_err:
                                print(f"⚠ Math paper router error: {router_err}")
            
            result = run_once(
                base_dir=self.base_dir,
                cfg=self.cfg,
                models=self.models,
                callbacks={
                    "on_stage_start": lambda stage, info: self.ui_callback("stage", f"[{schema_id}] {stage}: {info}"),
                },
                forced_schema_id=schema_id,
                curriculum_parser=self.curriculum_parser,
                math_paper=run_math_paper,
            )
            
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
                                # Question was not saved - check [DB_SYNC] logs above for detailed error
                                # Note: db_id can be None even if save succeeded (e.g., duplicate key)
                                # Check if question actually exists in DB before marking as failure
                                generation_id = item.get("id", "")
                                if generation_id and self.queue.supabase:
                                    try:
                                        check_response = self.queue.supabase.table("ai_generated_questions")\
                                            .select("id")\
                                            .eq("generation_id", generation_id)\
                                            .limit(1)\
                                            .execute()
                                        if check_response.data and len(check_response.data) > 0:
                                            # Question exists in DB - treat as success even if db_id was None
                                            db_save_successful = True
                                            print(f"[STATS] DB save succeeded (question exists in DB despite None return)")
                                        else:
                                            db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                    except Exception:
                                        # Can't verify - assume failure
                                        db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                else:
                                    db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                    except Exception as e:
                        db_save_error = str(e)
                        print(f"⚠ Warning: Failed to save to Supabase: {e}")
                        import traceback
                        traceback.print_exc()
                    
                    # Local backup (always backup, even if DB save failed)
                    try:
                        self._save_to_backup(item)
                    except Exception as e:
                        print(f"Warning: Failed to save to backup: {e}")
                    
                    if db_save_successful:
                        pfx = str(schema_id)[0].upper() if schema_id else ""
                        tags = item.get("tags") or {}
                        if pfx == "M":
                            mp = result.get("math_paper") or tags.get("paper")
                            with self.lock:
                                if mp == "Math 2":
                                    self._session_math2 += 1
                                elif mp == "Math 1":
                                    self._session_math1 += 1
                        elif pfx == "P":
                            with self.lock:
                                self._session_physics += 1
                        elif pfx == "C":
                            with self.lock:
                                self._session_chemistry += 1
                        elif pfx == "B":
                            with self.lock:
                                self._session_biology += 1
                        # Success is now tracked in DB - no need to increment counter
                        # Just refresh stats from DB
                        generation_id = item.get("id")
                        print(f"✅ SUCCESS: saved {generation_id} to database")
                        
                        # Update last_generated_id immediately (don't wait for DB refresh)
                        with self.lock:
                            self.last_generated_id = generation_id
                        
                        # Refresh coverage from DB and clear reservation
                        # Use try/except to handle network issues gracefully
                        try:
                            with self.queue.queue_lock:
                                self.queue.refresh_coverage_from_db()
                        except Exception as e:
                            # Network issues are expected - don't fail the whole operation
                            pass
                        
                        # Clear the reservation since question is now in DB
                        with self.queue.queue_lock:
                            if self.queue.generated.get(schema_id, 0) > 0:
                                self.queue.generated[schema_id] -= 1
                        
                        # Refresh stats from DB (non-blocking - will retry later if it fails)
                        try:
                            self._refresh_stats_from_db()
                        except Exception:
                            # Network issues are expected - stats will refresh on next periodic update
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
                    # Accepted but no item - shouldn't happen but handle it
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
                # Generation failed (not accepted)
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
                
        except GeminiQuotaExhaustedError as e:
            with self.queue.queue_lock:
                if self.queue.generated.get(schema_id, 0) > 0:
                    self.queue.generated[schema_id] -= 1
            self.stop()
            print(f"⛔ Gemini quota exhausted on all keys — stopping generation.\n{e}")
            self.ui_callback("quota_exhausted", {"message": str(e)})
        except Exception as e:
            # Exception during generation
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
            
        # Update stats after each task (always, not just when exception occurs)
        finally:
            self.cfg.difficulty_weights = original_difficulty
            # Always refresh stats from DB and update UI
            stats = self._get_stats()
            self.ui_callback("stats", stats)

    def _generation_loop(self):
        """Parallel loop: shared job queue, optional per-session caps (Math1/Math2/P/C/B)."""
        try:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                active_futures: Dict[Any, str] = {}
                last_stats_refresh = time.time()

                while not self.stopped:
                    current_time = time.time()
                    if current_time - last_stats_refresh > 5.0:
                        stats = self._get_stats()
                        self.ui_callback("stats", stats)
                        last_stats_refresh = current_time

                    targets_met = self._all_session_targets_met()

                    if not targets_met:
                        while len(active_futures) < self.max_workers:
                            job = self._claim_next_job()
                            if not job:
                                break
                            schema_id, forced_mp = job
                            self._update_difficulty_weights()
                            difficulty = self._choose_difficulty_for_schema(schema_id)
                            self.ui_callback(
                                "status",
                                {
                                    "text": f"Running {len(active_futures) + 1}/{self.max_workers} workers…",
                                    "color": "blue",
                                },
                            )
                            fut = executor.submit(
                                self._worker_task, schema_id, difficulty, forced_mp
                            )
                            active_futures[fut] = schema_id

                    if not active_futures:
                        stats = self._get_stats()
                        self.ui_callback("stats", stats)
                        if not self.stopped:
                            if targets_met:
                                self.ui_callback(
                                    "status",
                                    {
                                        "text": "Session targets met (Math1/Math2/P/C/B).",
                                        "color": "green",
                                    },
                                )
                            elif self._cap_disabled:
                                self.ui_callback(
                                    "status",
                                    {"text": "All schemas complete!", "color": "green"},
                                )
                            else:
                                self.ui_callback(
                                    "status",
                                    {
                                        "text": "Stopped: no claimable work (check schema list vs caps).",
                                        "color": "orange",
                                    },
                                )
                        break

                    done_futures: List[Any] = []
                    try:
                        for future in as_completed(active_futures.keys(), timeout=1.0):
                            done_futures.append(future)
                            break
                    except Exception:
                        pass

                    for f in done_futures:
                        active_futures.pop(f, None)

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
            # Get the most recent question created since session started
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
            # Don't spam errors for network issues - these are expected occasionally
            error_str = str(e)
            if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                # Network issue - will retry on next refresh
                pass
            else:
                print(f"⚠ Warning: Failed to refresh last generated ID from database: {e}")
    
    def _get_stats(self) -> dict:
        """Get current statistics - reads successes from DB, attempts/failures from memory."""
        # Refresh last generated ID from DB
        self._refresh_stats_from_db()
        
        with self.lock:
            attempts = self.attempts
            failures = self.failures
            last_id = self.last_generated_id
            session_m1 = self._session_math1
            session_m2 = self._session_math2
            sp = self._session_physics
            sc = self._session_chemistry
            sb = self._session_biology
            t1, t2 = self._target_m1, self._target_m2
            tp, tc, tb = self._target_p, self._target_c, self._target_b
            cap_off = self._cap_disabled

        # Get successes from database (questions created since session start)
        successes = 0
        if self.queue.supabase and self.session_start_time:
            try:
                # Query for questions created since session start
                response = self.queue.supabase.table("ai_generated_questions")\
                    .select("id")\
                    .gte("created_at", self.session_start_time)\
                    .execute()
                
                # Count the results
                if response.data:
                    successes = len(response.data)
                
                # Also update last_generated_id if we have results
                if response.data and len(response.data) > 0:
                    # Get the most recent one by querying with order
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
                # Don't spam errors for network issues - these are expected occasionally
                error_str = str(e)
                if "Server disconnected" in error_str or "RemoteProtocolError" in error_str:
                    # Network issue - will retry on next refresh, use cached values
                    pass
                else:
                    print(f"⚠ Warning: Failed to get success count from database: {e}")
        
        elapsed = time.time() - self.start_time if self.start_time else 0
        success_rate = (successes / attempts * 100) if attempts > 0 else 0

        math_prog = self.queue.get_subject_progress().get("Mathematics", {"current": 0, "required": 0})
        m_cur, m_req = math_prog["current"], math_prog["required"]
        m_rem = self.queue.get_mathematics_remaining()
        mpc = getattr(self.queue, "math_paper_db_counts", {"Math 1": 0, "Math 2": 0, "unlabeled": 0})
        try:
            m2_target = float(os.environ.get("MATH2_TARGET_SHARE", "0.5"))
        except ValueError:
            m2_target = 0.5
        m2_target = max(0.05, min(0.95, m2_target))
        est_m2 = int(round(m_rem * m2_target)) if m_rem else 0
        est_m1 = max(0, m_rem - est_m2)
        router_on = os.environ.get("ESAT_MATH_ROUTER", "1").strip().lower() not in ("0", "false", "no", "off")
        try:
            if self.ui_instance:
                dw = self.ui_instance._load_difficulty_weights()
            else:
                dw = dict(self.cfg.difficulty_weights or {})
        except Exception:
            dw = dict(self.cfg.difficulty_weights or {})

        api_log = (os.environ.get("GEMINI_API_EVENT_LOG") or "").strip() or str(
            Path(self.base_dir) / "gemini_api_events.jsonl"
        )

        return {
            "attempts": attempts,
            "successes": successes,
            "failures": failures,
            "success_rate": success_rate,
            "elapsed": elapsed,
            "last_generated_id": last_id,
            "session_math1": session_m1,
            "session_math2": session_m2,
            "session_physics": sp,
            "session_chemistry": sc,
            "session_biology": sb,
            "target_m1": t1,
            "target_m2": t2,
            "target_p": tp,
            "target_c": tc,
            "target_b": tb,
            "session_cap_disabled": cap_off,
            "gemini_api_event_log": api_log,
            "math_m_current": m_cur,
            "math_m_required": m_req,
            "math_m_remaining": m_rem,
            "math_db_m1": mpc.get("Math 1", 0),
            "math_db_m2": mpc.get("Math 2", 0),
            "math_db_unlabeled": mpc.get("unlabeled", 0),
            "math2_target_share": m2_target,
            "math_est_m1_remaining": est_m1,
            "math_est_m2_remaining": est_m2,
            "math_router_enabled": router_on and MATH_PAPER_ROUTER_AVAILABLE,
            "difficulty_weights": dw,
        }


class SimpleGeneratorUI:
    """Simple Tkinter UI for batch generation."""
    
    def __init__(
        self,
        base_dir: str,
        schema_prefixes: Optional[Tuple[str, ...]] = None,
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
        
        # Get schema prefixes: use parameter first, then env var, then default
        if schema_prefixes:
            self.schema_prefixes = schema_prefixes
        else:
            schema_prefixes_env = os.environ.get("SCHEMA_PREFIXES", "M,P,C,B")
            self.schema_prefixes = tuple(p.strip() for p in schema_prefixes_env.split(",") if p.strip())
            if not self.schema_prefixes:
                self.schema_prefixes = ("M", "P", "C", "B")
        
        print(f"📋 Generating questions for subjects: {', '.join(self.schema_prefixes)}")
        
        schemas_path, schemas_md = load_schemas_esat_markdown(base_dir)
        print(f"📖 Using ESAT schemas from: {schemas_path}")
        self.schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=self.schema_prefixes)
        
        # Get coverage from database
        self.coverage = self._get_schema_coverage()
        
        # Initialize queue (pass supabase client for coverage refresh and optional
        # start/stop offsets so different instances can work on different ranges)
        self.queue = SchemaQueue(
            self.schemas,
            self.coverage,
            self.supabase,
            start_offsets=start_offsets,
            stop_offsets=stop_offsets,
        )
        if self.supabase:
            try:
                with self.queue.queue_lock:
                    self.queue.refresh_coverage_from_db()
            except Exception:
                pass
        
        # Debug: Print first 20 schemas to verify order
        print("\nSchema generation order (first 20):")
        for i, sid in enumerate(self.queue.ordered_schema_ids[:20], 1):
            print(f"  {i}. {sid}")
        print(f"  ... ({len(self.queue.ordered_schema_ids)} total schemas)\n")

        if any(p.upper() == "M" for p in self.schema_prefixes):
            if MATH_PAPER_ROUTER_AVAILABLE:
                print(
                    "📐 Math 1/2: Flash router enabled before each M* run (ESAT_MATH_ROUTER=0 to disable). "
                    "Quota target: MATH2_TARGET_SHARE (default 0.5)."
                )
            else:
                print("⚠ Math paper router import failed — all M* runs use Math 1 unless cfg.math_paper is set.")
        
        # Initialize config with default difficulty weights
        # Can be changed mid-run by editing difficulty_weights.txt file
        difficulty_weights = self._load_difficulty_weights()
        xe = difficulty_weights.get("Extreme", 0.0)
        print(
            f"📊 Difficulty mix (all subjects): Easy={difficulty_weights['Easy']:.1%}, "
            f"Medium={difficulty_weights['Medium']:.1%}, Hard={difficulty_weights['Hard']:.1%}, "
            f"Extreme={xe:.1%}"
        )
        print(f"💡 Tip: Edit 'difficulty_weights.txt' (or env W_EASY, W_MED, W_HARD, W_EXTREME — all are sampling weights).")
        
        max_workers = int(os.environ.get("MAX_WORKERS", "1"))
        self.cfg = RunConfig(
            max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
            max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
            seed=None,
            difficulty_weights=difficulty_weights,
            schema_weights=None,
            out_dir="runs",
            allow_schema_prefixes=self.schema_prefixes,
            enable_tag_labeling=True,  # Enable curriculum tag classification
        )
        
        # Use centralized model config, but allow UI to override implementer with models/ prefix
        self.models = get_default_models_config()
        # Override implementer if MODEL_IMPLEMENTER is not set, otherwise use default with models/ prefix
        if not os.environ.get("MODEL_IMPLEMENTER"):
            self.models.implementer = "models/gemini-3.1-pro-preview"
        
        # Initialize controller (pass UI instance for difficulty weight updates)
        self.controller = GenerationController(
            self.base_dir,
            self.queue,
            self.schemas,
            self.cfg,
            self.models,
            self._ui_callback,
            ui_instance=self,  # Pass UI instance for difficulty weight loading
            max_workers=max_workers
        )
        _elog = (os.environ.get("GEMINI_API_EVENT_LOG") or "").strip() or str(
            self.base_dir_path / "gemini_api_events.jsonl"
        )
        print(f"📝 API / rate-limit JSONL log: {_elog}")
        ctl = self.controller
        if not ctl._cap_disabled:
            _sum = ctl._target_m1 + ctl._target_m2 + ctl._target_p + ctl._target_c + ctl._target_b
            print(
                f"🌙 Session stop after this many successful DB saves: Math1 {ctl._target_m1} | "
                f"Math2 {ctl._target_m2} | P {ctl._target_p} | C {ctl._target_c} | B {ctl._target_b} "
                f"(sum {_sum}; override with ESAT_SESSION_* or ESAT_DISABLE_SESSION_CAP=1)."
            )
        else:
            print("🌙 Session caps disabled (ESAT_DISABLE_SESSION_CAP) — run until schemas are complete.")
        if os.environ.get("ALTERNATIVE_GEMINI_API_KEY", "").strip():
            print(
                "🔑 ALTERNATIVE_GEMINI_API_KEY is set — on rate limits the client will switch keys, "
                "then stop only if both keys are exhausted."
            )
        print(
            "⏱️ Pacing defaults: MAX_WORKERS="
            f"{max_workers}, GEMINI_MAX_CONCURRENT="
            f"{os.environ.get('GEMINI_MAX_CONCURRENT', '1')}, API_MIN_DELAY="
            f"{os.environ.get('API_MIN_DELAY', '5.0')}s (override via env)."
        )
        print(
            "📊 Gemini limits are per project (RPM, TPM, RPD). RPD resets midnight Pacific. "
            "No separate monthly free-tier cap in API docs; paid accounts use billing budgets."
        )
        
        # Create UI
        self.root = tk.Tk()
        self.root.title("ESAT Question Generator")
        self.root.geometry("820x820")
        self.root.resizable(True, True)
        
        self._create_ui()
    
    def _load_difficulty_weights(self) -> Dict[str, float]:
        """Load difficulty weights from file or use defaults."""
        weights_file = self.base_dir_path / "difficulty_weights.txt"
        
        # Default mix ~5% / 20% / 55% / 15% (normalized from file or these values)
        default_weights = {
            "Easy": 0.05,
            "Medium": 0.20,
            "Hard": 0.55,
            "Extreme": 0.15,
        }
        
        if weights_file.exists():
            try:
                with open(weights_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    # Parse format: Easy=5,Medium=20,Hard=55,Extreme=15 (any positive weights; normalized)
                    weights = {}
                    for line in content.split('\n'):
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            key, value = line.split('=', 1)
                            key = key.strip()
                            value = value.strip()
                            if key in default_weights:
                                weights[key] = float(value)
                    
                    if weights:
                        # Ensure all four tiers exist (older files may omit Extreme)
                        for k, v in default_weights.items():
                            if k not in weights:
                                weights[k] = v
                        total = sum(weights.values())
                        if total > 0:
                            weights = {k: v/total for k, v in weights.items()}
                            return weights
            except Exception as e:
                print(f"⚠ Warning: Failed to load difficulty_weights.txt: {e}")
                print(f"   Using defaults: {default_weights}")
        
        # Create default file if it doesn't exist
        try:
            with open(weights_file, 'w', encoding='utf-8') as f:
                f.write("# Difficulty weights (values will be normalized to sum to 1.0)\n")
                f.write("# Default mix ~5% Easy, 20% Medium, 55% Hard, 15% Extreme\n")
                f.write("# Edit this file to change weights mid-run!\n")
                f.write(f"Easy={default_weights['Easy']}\n")
                f.write(f"Medium={default_weights['Medium']}\n")
                f.write(f"Hard={default_weights['Hard']}\n")
                f.write(f"Extreme={default_weights['Extreme']}\n")
        except Exception:
            pass  # Non-fatal
        
        return default_weights
        
    def _get_schema_coverage(self) -> Dict[str, int]:
        """Get current schema coverage from Supabase (prioritized) or JSON file."""
        # PRIORITY 1: Query Supabase for real-time coverage
        if self.supabase:
            try:
                # Try RPC function first (if it exists)
                try:
                    response = self.supabase.rpc("get_schema_coverage").execute()
                    if response.data:
                        coverage = {row["schema_id"]: row["total"] for row in response.data}
                        print(f"✓ Loaded schema coverage from Supabase (RPC): {len(coverage)} schemas")
                        return coverage
                except Exception:
                    pass  # RPC might not exist, try direct query
                
                # Fallback: Direct query — include paper only if that column exists on the remote table
                try:
                    response = self.supabase.table("ai_generated_questions").select("schema_id, paper").execute()
                except Exception:
                    response = self.supabase.table("ai_generated_questions").select("schema_id").execute()
                if response.data:
                    coverage: Dict[str, int] = {}
                    for row in response.data:
                        schema_id = row.get("schema_id")
                        if schema_id:
                            coverage[schema_id] = coverage.get(schema_id, 0) + 1
                    print(f"✓ Loaded schema coverage from Supabase (direct query): {len(coverage)} schemas")
                    return coverage
            except Exception as e:
                print(f"Warning: Failed to get schema coverage from Supabase: {e}")
        
        # PRIORITY 2: Fallback to JSON file (if Supabase unavailable)
        coverage_file = Path(self.base_dir) / "by_subject_prompts" / "schema_coverage.json"
        if coverage_file.exists():
            try:
                import json
                with open(coverage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Extract totals from {schema_id: {total: N, by_paper: {}}} format
                coverage = {schema_id: info.get("total", 0) for schema_id, info in data.items()}
                print(f"⚠ Loaded schema coverage from JSON file (may be outdated): {len(coverage)} schemas")
                return coverage
            except Exception as e:
                print(f"Warning: Failed to load {coverage_file.name}: {e}")
        
        print("⚠ No schema coverage found - starting from zero")
        return {}
    
    def _create_ui(self):
        """Create the UI layout."""
        # Title
        title_frame = ttk.Frame(self.root, padding="10")
        title_frame.pack(fill=tk.X)
        
        title_label = ttk.Label(
            title_frame,
            text="ESAT Question Generator",
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

        self.difficulty_mix_label = ttk.Label(
            stats_frame,
            text="Difficulty sampling: Easy — | Medium — | Hard — | Extreme —",
            font=("Arial", 9),
        )
        self.difficulty_mix_label.pack(anchor=tk.W)

        self.router_status_label = ttk.Label(
            stats_frame,
            text="Math 1/2 router: —",
            font=("Arial", 9),
            foreground="gray",
        )
        self.router_status_label.pack(anchor=tk.W)
        
        # Subject-specific stats (Mathematics first — same pipeline as project.run_once for all)
        self.mathematics_label = ttk.Label(
            stats_frame,
            text="Mathematics (M*): 0/0",
            font=("Arial", 9)
        )
        self.mathematics_label.pack(anchor=tk.W)

        self.math_db_label = ttk.Label(
            stats_frame,
            text="Math in DB: Math1 0 | Math2 0 | unlabeled 0",
            font=("Arial", 9),
        )
        self.math_db_label.pack(anchor=tk.W)

        self.math_remaining_label = ttk.Label(
            stats_frame,
            text="Math remaining (M*): 0 (~0 Math1 / ~0 Math2 est.)",
            font=("Arial", 9),
        )
        self.math_remaining_label.pack(anchor=tk.W)

        self.physics_label = ttk.Label(
            stats_frame,
            text="Physics: 0/0",
            font=("Arial", 9)
        )
        self.physics_label.pack(anchor=tk.W)
        
        self.chemistry_label = ttk.Label(
            stats_frame,
            text="Chemistry: 0/0",
            font=("Arial", 9)
        )
        self.chemistry_label.pack(anchor=tk.W)
        
        self.biology_label = ttk.Label(
            stats_frame,
            text="Biology: 0/0",
            font=("Arial", 9)
        )
        self.biology_label.pack(anchor=tk.W)

        self.math_paper_session_label = ttk.Label(
            stats_frame,
            text="This session saved (M*): Math1 0 | Math2 0",
            font=("Arial", 9),
        )
        self.math_paper_session_label.pack(anchor=tk.W)

        self.session_quota_label = ttk.Label(
            stats_frame,
            text="Tonight quota (saved): —",
            font=("Arial", 9),
        )
        self.session_quota_label.pack(anchor=tk.W)

        self.api_log_label = ttk.Label(
            stats_frame,
            text="API log: —",
            font=("Arial", 9),
            foreground="gray",
        )
        self.api_log_label.pack(anchor=tk.W)
        
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
        
        # Initial stats refresh (if controller exists and session has started)
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
            self.root.after(0, lambda: messagebox.showerror("Error", data.get("message")))
        elif event_type == "quota_exhausted":
            def _halt_quota():
                if self.controller:
                    self.controller.stop()
                self.stop_button.config(state=tk.DISABLED)
                self.start_button.config(state=tk.NORMAL)
                self.status_label.config(text="Stopped (API quota)", foreground="red")
                messagebox.showwarning(
                    "Gemini quota exhausted",
                    data.get("message", "All configured API keys hit rate limits."),
                )
            self.root.after(0, _halt_quota)
    
    def _update_progress_display(self):
        """Update the schema progress display."""
        # CRITICAL: Refresh coverage from database before displaying to ensure we show latest counts
        with self.queue.queue_lock:
            self.queue.refresh_coverage_from_db()
        
        # Also refresh stats from DB when updating progress display
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
            
            # Determine status symbol
            if is_complete:
                symbol = "✓"
                status = "[COMPLETE]"
                color = "green"
            elif current > 0:
                symbol = "▶"
                status = "[IN PROGRESS]"
                color = "blue"
            else:
                symbol = " "
                status = "[PENDING]"
                color = "gray"
            
            # Show detailed breakdown: total (DB + session)
            if session_count > 0:
                line = f"{symbol} {schema_id}: {current}/{required} (DB:{db_count} + session:{session_count}) {status}\n"
            else:
                line = f"{symbol} {schema_id}: {current}/{required} questions {status}\n"
            
            start_pos = self.progress_text.index(tk.END)
            self.progress_text.insert(tk.END, line)
            end_pos = self.progress_text.index(tk.END)
            
            # Color tags don't work well, just show as is
        
        self.progress_text.config(state=tk.DISABLED)
        
        # Update overall progress
        summary = self.queue.get_progress_summary()
        self.overall_label.config(
            text=f"{summary['total_current']}/{summary['total_required']} questions ({summary['percentage']:.1f}%)"
        )
        self.progress_bar['value'] = summary['percentage']
        
        # Update subject-specific progress
        subject_progress = self.queue.get_subject_progress()
        if 'Mathematics' in subject_progress:
            m = subject_progress['Mathematics']
            self.mathematics_label.config(text=f"Mathematics (M*): {m['current']}/{m['required']}")
        else:
            self.mathematics_label.config(text="Mathematics (M*): 0/0")
        if 'Physics' in subject_progress:
            p = subject_progress['Physics']
            self.physics_label.config(text=f"Physics: {p['current']}/{p['required']}")
        else:
            self.physics_label.config(text="Physics: 0/0")
        if 'Chemistry' in subject_progress:
            c = subject_progress['Chemistry']
            self.chemistry_label.config(text=f"Chemistry: {c['current']}/{c['required']}")
        else:
            self.chemistry_label.config(text="Chemistry: 0/0")
        if 'Biology' in subject_progress:
            b = subject_progress['Biology']
            self.biology_label.config(text=f"Biology: {b['current']}/{b['required']}")
        else:
            self.biology_label.config(text="Biology: 0/0")
    
    def _update_stats_display(self, stats: dict):
        """Update statistics display."""
        # Update last generated ID
        last_id = stats.get("last_generated_id")
        if last_id:
            # Truncate long IDs for display
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

        dw = stats.get("difficulty_weights") or {}
        e, med, h, x = (
            dw.get("Easy", 0),
            dw.get("Medium", 0),
            dw.get("Hard", 0),
            dw.get("Extreme", 0),
        )
        self.difficulty_mix_label.config(
            text=(
                f"Difficulty sampling: Easy {e:.0%} | Medium {med:.0%} | Hard {h:.0%} | Extreme {x:.0%} "
                f"(from difficulty_weights.txt)"
            )
        )
        if stats.get("math_router_enabled"):
            self.router_status_label.config(
                text="Math 1/2 router: ON (Flash → quota MATH2_TARGET_SHARE)",
                foreground="dark green",
            )
        else:
            self.router_status_label.config(
                text="Math 1/2 router: OFF (all M* → Math 1 unless cfg.math_paper set)",
                foreground="gray",
            )

        db1 = stats.get("math_db_m1", 0)
        db2 = stats.get("math_db_m2", 0)
        dbu = stats.get("math_db_unlabeled", 0)
        self.math_db_label.config(
            text=f"Math in DB (M* rows): Math1 {db1} | Math2 {db2} | unlabeled {dbu}"
        )
        mrem = stats.get("math_m_remaining", 0)
        est1 = stats.get("math_est_m1_remaining", 0)
        est2 = stats.get("math_est_m2_remaining", 0)
        tgt = stats.get("math2_target_share", 0.5)
        self.math_remaining_label.config(
            text=(
                f"Math remaining (M* slots): {mrem} total "
                f"(~{est1} Math1 / ~{est2} Math2 est. at {tgt:.0%} Math2 target)"
            )
        )

        m1 = stats.get("session_math1", 0)
        m2 = stats.get("session_math2", 0)
        tot = m1 + m2
        pct = (100.0 * m2 / tot) if tot else 0.0
        self.math_paper_session_label.config(
            text=f"This session saved (M*): Math1 {m1} | Math2 {m2} ({pct:.0f}% Math2)"
        )

        if stats.get("session_cap_disabled"):
            self.session_quota_label.config(
                text="Tonight quota: off (ESAT_DISABLE_SESSION_CAP)",
            )
        else:
            sp = stats.get("session_physics", 0)
            sc = stats.get("session_chemistry", 0)
            sb = stats.get("session_biology", 0)
            t1 = stats.get("target_m1", 0)
            t2 = stats.get("target_m2", 0)
            tp = stats.get("target_p", 0)
            tc = stats.get("target_c", 0)
            tb = stats.get("target_b", 0)
            self.session_quota_label.config(
                text=(
                    f"Tonight quota (saved): M1 {m1}/{t1} | M2 {m2}/{t2} | "
                    f"P {sp}/{tp} | C {sc}/{tc} | B {sb}/{tb}"
                ),
            )

        logp = stats.get("gemini_api_event_log") or ""
        if logp:
            short = logp if len(logp) <= 72 else "…" + logp[-69:]
            self.api_log_label.config(text=f"API log: {short}")
    
    def run(self):
        """Run the UI."""
        self.root.mainloop()


def main():
    """Main entry point."""
    base_dir = Path(__file__).parent

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
        print("Continuing without Supabase — DB sync will be unavailable.")

    raw = (os.environ.get("SCHEMA_PREFIXES") or "").strip()
    if raw:
        parts = [p.strip().upper() for p in raw.split(",") if p.strip()]
        selected_prefixes = tuple(p for p in parts if p in ("M", "P", "B", "C"))
        if not selected_prefixes:
            selected_prefixes = ("M", "P", "C", "B")
    else:
        selected_prefixes = ("M", "P", "C", "B")

    os.environ["SCHEMA_PREFIXES"] = ",".join(selected_prefixes)
    print(f"📋 Subjects (no prompt): {', '.join(selected_prefixes)} — set SCHEMA_PREFIXES to override.")

    app = SimpleGeneratorUI(str(base_dir), schema_prefixes=selected_prefixes)
    app.run()


if __name__ == "__main__":
    main()

