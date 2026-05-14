#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple Question Generator UI

A clean, hands-off Tkinter interface for batch question generation.
Works systematically through loaded schemas, saves immediately to Supabase and local backup.

By default this UI loads **Physics, Chemistry, and Biology** only (prefixes P, C, B).
Override with env ``ESAT_SIMPLE_UI_SCHEMA_PREFIXES`` (comma-separated, e.g. ``M,P,C,B``) to include Mathematics or a custom subset.
"""

import os
import sys
import re
import json
import time
import queue
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from pathlib import Path
from datetime import datetime, timedelta
from types import SimpleNamespace
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import OrderedDict

from pipeline_log import console_banner, get_pipeline_log_path, init_pipeline_log, plog

# Import curriculum parser for tag labeling
try:
    from curriculum_parser import CurriculumParser
    CURRICULUM_PARSER_AVAILABLE = True
except ImportError:
    CURRICULUM_PARSER_AVAILABLE = False
    plog(
        "ui",
        "curriculum_parser_import_failed",
        level="warning",
        detail={"hint": "Tag labeling disabled."},
        echo=True,
        spacer=True,
    )

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
    load_prompts,
    describe_style_only_regen_policy,
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
    plog(
        "ui",
        "supabase_import_failed",
        level="warning",
        detail={"hint": "pip install supabase — DB sync disabled until then."},
        echo=True,
        spacer=True,
    )


def _fetch_ai_generated_questions_coverage_rows(supabase):
    """
    Load rows for per-schema counts and Math 1/2 totals.
    Uses ``subjects`` only; the ``paper`` column was removed from ``ai_generated_questions``.

    Paginates in 1000-row chunks. PostgREST/Supabase default max rows per request is
    typically 1000 — a single unbounded ``select`` under-counts coverage and makes the
    queue think schemas are short, causing extra generations per schema.
    """
    table = supabase.table("ai_generated_questions")
    page_size = 1000
    last_err: Optional[Exception] = None
    for cols in (
        "schema_id, subjects",
        "schema_id",
    ):
        try:
            all_rows: List[Dict[str, Any]] = []
            start = 0
            while True:
                end = start + page_size - 1
                batch = table.select(cols).range(start, end).execute()
                chunk = batch.data or []
                all_rows.extend(chunk)
                if len(chunk) < page_size:
                    break
                start += page_size
            return SimpleNamespace(data=all_rows)
        except Exception as e:
            last_err = e
            continue
    if last_err:
        raise last_err
    raise RuntimeError("Could not query ai_generated_questions for coverage.")


def _load_schema_prefix_approvals(path: Path) -> Optional[List[Dict[str, Any]]]:
    """Load ``schema_prefix_full_approved.json`` if present; return approvals list or None."""
    if not path.is_file():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        approvals = data.get("approvals")
        if isinstance(approvals, list):
            return approvals
    except Exception:
        pass
    return None


def format_esat_schema_inventory_report(
    *,
    schemas_path: Path,
    ordered_schema_ids: List[str],
    coverage: Dict[str, int],
    approvals_path: Path,
) -> str:
    """
    Human-readable snapshot: MD schema list vs DB coverage, optional reclass stats from approvals file.
    """
    lines: List[str] = []
    n = len(ordered_schema_ids)
    cov = coverage or {}
    with_q = sum(1 for sid in ordered_schema_ids if cov.get(sid, 0) > 0)
    total_attached = sum(cov.get(sid, 0) for sid in ordered_schema_ids)
    lines.append(f"Schemas file: {schemas_path.name}  |  loaded: {n}  |  with DB rows: {with_q}  |  total questions (listed ids): {total_attached}")
    lines.append("Quota: 3 questions per schema; target rises to 5 when more than 3 are already attached (DB + this session).")

    approvals = _load_schema_prefix_approvals(approvals_path)
    if not approvals:
        lines.append(
            f"Reclass data: (no {approvals_path.name} — place it next to the generator to show renames vs DB stale ids.)"
        )
        return "\n".join(lines)

    new_ids = {str(a.get("new_schema_id") or "") for a in approvals if a.get("new_schema_id")}
    new_ids.discard("")
    old_ids = {str(a.get("schema_id") or "") for a in approvals if a.get("schema_id")}
    old_ids.discard("")

    renamed = [
        (str(a["schema_id"]), str(a["new_schema_id"]))
        for a in approvals
        if a.get("schema_id")
        and a.get("new_schema_id")
        and str(a["schema_id"]) != str(a["new_schema_id"])
    ]
    stale_on_old = sum(cov.get(o, 0) for o, _ in renamed)
    on_new_side = sum(cov.get(n, 0) for _, n in renamed)

    md_set = set(ordered_schema_ids)
    extra_in_md = md_set - new_ids
    missing_from_md = new_ids - md_set

    lines.append(
        f"Approvals: {approvals_path.name}  |  distinct new_schema_id: {len(new_ids)}  |  distinct schema_id (pre-rename): {len(old_ids)}"
    )
    lines.append(
        f"Prefix/id renames (old→new): {len(renamed)}  |  DB questions on OLD ids (may need migration): {stale_on_old}  |  on NEW ids: {on_new_side}"
    )
    if extra_in_md:
        lines.append(
            f"Schemas in MD but not in approval new_schema_id set: {len(extra_in_md)} (new since export or filter mismatch)."
        )
    if missing_from_md:
        nmiss = len(missing_from_md)
        hint = (
            " — often normal when SCHEMA_PREFIXES limits subjects vs full approvals file."
            if nmiss > 10
            else ""
        )
        lines.append(
            f"Approval new_schema_id not in current MD: {nmiss}{hint}"
        )
    show = renamed[:18]
    if show:
        lines.append("Renamed (sample):" + "".join(f"\n  {o} → {n}" for o, n in show))
        if len(renamed) > len(show):
            lines.append(f"  … +{len(renamed) - len(show)} more")

    return "\n".join(lines)


def _math_paper_bucket_from_db_row(row: Dict[str, Any]) -> Optional[str]:
    """
    For ESAT mathematics (M* but not TMUA ``M_`` schema ids), classify Math 1 / Math 2 / unlabeled.
    Uses ``subjects`` first, then legacy ``paper`` if present on old rows.
    """
    schema_id = row.get("schema_id")
    if not schema_id or str(schema_id)[0].upper() != "M":
        return None
    if str(schema_id).startswith("M_"):
        return None
    sub = (row.get("subjects") or "").strip()
    sl = sub.casefold()
    if sub == "Math 2" or sl == "math 2":
        return "Math 2"
    if sub == "Math 1" or sl == "math 1":
        return "Math 1"
    p = row.get("paper")
    if p == "Math 2":
        return "Math 2"
    if p == "Math 1":
        return "Math 1"
    return "unlabeled"


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
        """Order schemas: legacy M7 / P12 ids first, then hash ids ``M_…``, ``P_…``, etc."""
        prefix_order = {"M": 0, "P": 1, "C": 2, "B": 3}

        def sort_key(sid: str):
            if not sid:
                return (99, 99, "", sid)
            # Legacy numbered ids only: M7, P12 (not M_abc)
            m = re.match(r"^([MPCB])(\d+)$", sid, re.I)
            if m:
                p, num_s = m.group(1).upper(), m.group(2)
                return (0, prefix_order.get(p, 9), int(num_s), "")
            m2 = re.match(r"^([MPCB])_(.+)$", sid, re.I)
            if m2:
                p, suf = m2.group(1).upper(), m2.group(2).lower()
                return (1, prefix_order.get(p, 9), suf, sid)
            return (99, 99, sid.lower(), sid)

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
        Target questions per schema: 3 by default; 5 when more than 3 questions are
        already attached (DB + this session), for all ESAT prefixes (M/P/C/B).
        """
        return 5 if self.get_current_count(schema_id) > 3 else 3
    
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
            response = _fetch_ai_generated_questions_coverage_rows(self.supabase)

            new_coverage: Dict[str, int] = {}
            mpaper = {"Math 1": 0, "Math 2": 0, "unlabeled": 0}
            if response.data:
                for row in response.data:
                    schema_id = row.get("schema_id")
                    if schema_id:  # Skip rows with missing schema_id
                        new_coverage[schema_id] = new_coverage.get(schema_id, 0) + 1
                    bucket = _math_paper_bucket_from_db_row(row)
                    if bucket is not None:
                        mpaper[bucket] += 1
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
            plog(
                "ui",
                "coverage_refreshed",
                detail={
                    "schemas_with_questions": len([s for s in new_coverage.values() if s > 0]),
                    "tracked": len(new_coverage),
                },
                echo=False,
            )
        except Exception as e:
            # Don't spam errors for network issues - these are expected occasionally
            error_str = str(e)
            transient = (
                "Server disconnected" in error_str
                or "RemoteProtocolError" in error_str
                or "getaddrinfo failed" in error_str
                or "11001" in error_str
                or "ConnectError" in type(e).__name__
                or "Connection reset" in error_str
                or "timed out" in error_str.lower()
                or "timeout" in error_str.lower()
            )
            if transient:
                plog(
                    "ui",
                    "coverage_refresh_network",
                    level="warning",
                    detail={"error": error_str[:500]},
                    echo=False,
                )
            else:
                plog(
                    "ui",
                    "coverage_refresh_failed",
                    level="warning",
                    detail={"error": str(e)},
                    echo=False,
                )
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
                    plog(
                        "ui",
                        "queue_selected",
                        detail={
                            "range_info": range_info.strip(),
                            "schema_id": schema_id,
                            "current": current,
                            "required": required,
                            "db_count": db_count,
                            "session_reserved": session_count + 1,
                        },
                        echo=False,
                    )
                    return schema_id
                elif db_count < required:
                    # Safety check: Even if current count says complete, verify DB has enough
                    # This prevents moving on when session counts are wrong
                    self.generated[schema_id] = session_count + 1
                    if schema_start_index is not None:
                        range_info = f"[range {schema_start_index}-{schema_end_index-1 if schema_end_index else len(self.ordered_schema_ids)-1}]"
                    else:
                        range_info = ""
                    plog(
                        "ui",
                        "queue_db_mismatch",
                        level="warning",
                        detail={
                            "range_info": range_info.strip(),
                            "schema_id": schema_id,
                            "current": current,
                            "required": required,
                            "db_count": db_count,
                        },
                        echo=False,
                    )
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
                    plog(
                        "ui",
                        "claim_prefix_selected",
                        detail={
                            "prefix": prefix_u,
                            "schema_id": schema_id,
                            "current": current,
                            "required": required,
                            "db_count": db_count,
                        },
                        echo=False,
                    )
                    return schema_id
                if db_count < required:
                    self.generated[schema_id] = session_count + 1
                    plog(
                        "ui",
                        "claim_prefix_db_mismatch",
                        level="warning",
                        detail={
                            "prefix": prefix_u,
                            "schema_id": schema_id,
                            "current": current,
                            "required": required,
                            "db_count": db_count,
                        },
                        echo=False,
                    )
                    return schema_id

            if not allow_past_quota:
                return None

            best = min(candidates, key=lambda sid: self.get_current_count(sid))
            sc = self.generated.get(best, 0)
            self.generated[best] = sc + 1
            cur = self.get_current_count(best)
            req = self.get_required_count(best)
            plog(
                "ui",
                "claim_prefix_overflow",
                detail={
                    "prefix": prefix_u,
                    "schema_id": best,
                    "current": cur,
                    "required": req,
                },
                echo=False,
            )
            return best

    def claim_next_schema_global(self, *, allow_overflow: bool = False) -> Optional[str]:
        """Next incomplete schema across all queued subjects (no per-worker range split).

        If ``allow_overflow`` is True and every schema is at/above its per-schema target,
        pick the least-filled schema so generation can continue (no session caps).
        """
        with self.queue_lock:
            self.refresh_coverage_from_db()
            for schema_id in self.ordered_schema_ids:
                db_count = self.coverage.get(schema_id, 0)
                session_count = self.generated.get(schema_id, 0)
                current = db_count + session_count
                required = self.get_required_count(schema_id)
                if current < required:
                    self.generated[schema_id] = session_count + 1
                    plog(
                        "ui",
                        "claim_global_selected",
                        detail={
                            "schema_id": schema_id,
                            "current": current,
                            "required": required,
                            "db_count": db_count,
                        },
                        echo=False,
                    )
                    return schema_id
                if db_count < required:
                    self.generated[schema_id] = session_count + 1
                    plog(
                        "ui",
                        "claim_global_db_mismatch",
                        level="warning",
                        detail={
                            "schema_id": schema_id,
                            "current": current,
                            "required": required,
                            "db_count": db_count,
                        },
                        echo=False,
                    )
                    return schema_id
            if allow_overflow and self.ordered_schema_ids:
                best = min(
                    self.ordered_schema_ids,
                    key=lambda sid: self.get_current_count(sid),
                )
                sc = self.generated.get(best, 0)
                self.generated[best] = sc + 1
                cur = self.get_current_count(best)
                req = self.get_required_count(best)
                plog(
                    "ui",
                    "claim_global_overflow",
                    detail={
                        "schema_id": best,
                        "current": cur,
                        "required": req,
                    },
                    echo=False,
                )
                return best
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
                 max_workers: int = 2,
                 active_schema_prefixes: Optional[Tuple[str, ...]] = None):
        self.base_dir = base_dir
        self.queue = queue
        self.schemas = schemas
        self.cfg = cfg
        self.models = models
        self.ui_callback = ui_callback
        self.ui_instance = ui_instance  # Reference to UI for loading difficulty weights
        self.max_workers = max_workers
        self._backup_lock = threading.Lock()
        _valid = frozenset({"M", "P", "C", "B"})
        if active_schema_prefixes:
            self._active_prefixes = frozenset(
                str(p).strip().upper() for p in active_schema_prefixes if str(p).strip().upper() in _valid
            )
        else:
            self._active_prefixes = frozenset({"M", "P", "C", "B"})
        if not self._active_prefixes:
            self._active_prefixes = frozenset({"M", "P", "C", "B"})
        
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
                    plog(
                        "ui",
                        "curriculum_parser_ok",
                        detail={"path": str(json_path)},
                        echo=False,
                    )
                else:
                    plog(
                        "ui",
                        "curriculum_parser_missing_file",
                        level="warning",
                        detail={"path": str(json_path)},
                        echo=False,
                    )
            except Exception as e:
                plog(
                    "ui",
                    "curriculum_parser_error",
                    level="warning",
                    detail={"error": str(e)},
                    echo=False,
                )
        
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
            checks: List[bool] = []
            if "M" in self._active_prefixes:
                checks.append(
                    self._session_math1 >= self._target_m1
                    and self._session_math2 >= self._target_m2
                )
            if "P" in self._active_prefixes:
                checks.append(self._session_physics >= self._target_p)
            if "C" in self._active_prefixes:
                checks.append(self._session_chemistry >= self._target_c)
            if "B" in self._active_prefixes:
                checks.append(self._session_biology >= self._target_b)
            return bool(checks) and all(checks)

    def _session_targets_met_status_text(self) -> str:
        labels: List[str] = []
        if "M" in self._active_prefixes:
            labels.append("Math1/Math2")
        if "P" in self._active_prefixes:
            labels.append("Physics")
        if "C" in self._active_prefixes:
            labels.append("Chemistry")
        if "B" in self._active_prefixes:
            labels.append("Biology")
        if not labels:
            labels.append("session caps")
        return "Session targets met (" + ", ".join(labels) + ")."

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
        if prefix_u not in self._active_prefixes:
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
        """Choose among active prefixes with largest remaining session deficit (ties: M, P, C, B)."""
        if self._cap_disabled:
            return None
        order = tuple(p for p in ("M", "P", "C", "B") if p in self._active_prefixes)
        if not order:
            return None
        r1, r2 = self._math_session_remaining()
        with self.lock:
            rp = max(0, self._target_p - self._session_physics)
            rc = max(0, self._target_c - self._session_chemistry)
            rb = max(0, self._target_b - self._session_biology)
        rm = r1 + r2
        deficits: Dict[str, int] = {}
        if "M" in self._active_prefixes:
            deficits["M"] = rm
        if "P" in self._active_prefixes:
            deficits["P"] = rp
        if "C" in self._active_prefixes:
            deficits["C"] = rc
        if "B" in self._active_prefixes:
            deficits["B"] = rb
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
            sid = self.queue.claim_next_schema_global(allow_overflow=True)
            return (sid, None) if sid else None

        if self._all_session_targets_met():
            return None

        primary = self._pick_prefix_for_session()
        if not primary:
            return None

        try_order = [primary] + [
            p for p in ("M", "P", "C", "B") if p != primary and p in self._active_prefixes
        ]

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
            plog("ui", "difficulty_weights_refresh_failed", detail={"error": str(e)}, echo=False)
    
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
                        block = self.schemas.get(schema_id, {}).get("block", "")
                        if block:
                            try:
                                router_out = call_math_paper_router("", self.base_dir, schema_id, block)
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
                                plog(
                                    "ui",
                                    "math_router_error",
                                    detail={"schema_id": schema_id, "error": str(router_err)},
                                    echo=False,
                                )
            
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
                            db_id = sync_question_from_pipeline(item, self.base_dir, status="pending")
                            if db_id:
                                db_save_successful = True
                                plog(
                                    "ui",
                                    "db_save_ok",
                                    detail={
                                        "schema_id": schema_id,
                                        "db_id_prefix": (db_id or "")[:8],
                                    },
                                    echo=False,
                                )
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
                                            plog(
                                                "ui",
                                                "db_save_ok_duplicate_path",
                                                detail={"generation_id": generation_id},
                                                echo=False,
                                            )
                                        else:
                                            db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                    except Exception:
                                        # Can't verify - assume failure
                                        db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                                else:
                                    db_save_error = "Database save failed (check [DB_SYNC] logs above for details)"
                    except Exception as e:
                        db_save_error = str(e)
                        plog(
                            "ui",
                            "db_save_exception",
                            level="error",
                            detail={"schema_id": schema_id, "error": str(e)},
                            echo=True,
                            spacer=True,
                        )
                        import traceback

                        traceback.print_exc()
                    
                    # Local backup (always backup, even if DB save failed)
                    try:
                        self._save_to_backup(item)
                    except Exception as e:
                        plog("ui", "backup_failed", detail={"error": str(e)}, echo=False)
                    
                    if db_save_successful:
                        pfx = str(schema_id)[0].upper() if schema_id else ""
                        tags = item.get("tags") or {}
                        if pfx == "M":
                            mp = (
                                result.get("math_paper")
                                or tags.get("subjects")
                                or tags.get("paper")
                            )
                            mp_n = (mp or "").strip().casefold()
                            with self.lock:
                                if mp_n == "math 2":
                                    self._session_math2 += 1
                                elif mp_n == "math 1":
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
                        plog(
                            "ui",
                            "generation_saved",
                            detail={
                                "schema_id": schema_id,
                                "generation_id": generation_id,
                                "difficulty": difficulty,
                            },
                            echo=True,
                            spacer=True,
                        )
                        
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
                            plog(
                                "ui",
                                "db_save_failed",
                                level="error",
                                detail={
                                    "schema_id": schema_id,
                                    "reason": db_save_error,
                                    "failures": self.failures,
                                    "attempts": self.attempts,
                                    "failure_rate_pct": round(failure_rate, 1),
                                },
                                echo=True,
                                spacer=True,
                            )
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
                        plog(
                            "ui",
                            "accepted_missing_item",
                            level="error",
                            detail={"schema_id": schema_id, "failures": self.failures, "attempts": self.attempts},
                            echo=True,
                            spacer=True,
                        )
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
                    rej_detail: Dict[str, Any] = {
                        "schema_id": schema_id,
                        "status": failure_reason,
                        "run_dir": result.get("run_dir"),
                        "failures": self.failures,
                        "attempts": self.attempts,
                        "failure_rate_pct": round(failure_rate, 1),
                    }
                    if result.get("rejection"):
                        rej_detail["rejection"] = result["rejection"]
                    plog(
                        "ui",
                        "generation_rejected",
                        level="warning",
                        detail=rej_detail,
                        echo=True,
                        echo_detail=True,
                        spacer=True,
                    )
                self.ui_callback("failure", {
                    "schema_id": schema_id,
                    "reason": failure_reason
                })
                
        except GeminiQuotaExhaustedError as e:
            with self.queue.queue_lock:
                if self.queue.generated.get(schema_id, 0) > 0:
                    self.queue.generated[schema_id] -= 1
            self.stop()
            plog(
                "ui",
                "quota_exhausted",
                level="error",
                detail={"message": str(e)},
                echo=True,
                spacer=True,
            )
            self.ui_callback("quota_exhausted", {"message": str(e)})
        except Exception as e:
            # Exception during generation
            with self.queue.queue_lock:
                if self.queue.generated.get(schema_id, 0) > 0:
                    self.queue.generated[schema_id] -= 1
            with self.lock:
                self.failures += 1
                failure_rate = (self.failures / self.attempts * 100) if self.attempts > 0 else 0
                plog(
                    "ui",
                    "worker_exception",
                    level="error",
                    detail={
                        "schema_id": schema_id,
                        "error": str(e),
                        "failures": self.failures,
                        "attempts": self.attempts,
                        "failure_rate_pct": round(failure_rate, 1),
                    },
                    echo=True,
                    spacer=True,
                )
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
        """Parallel loop: shared job queue; optional per-session caps if ESAT_DISABLE_SESSION_CAP is unset."""
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
                            plog(
                                "ui",
                                "difficulty_sampled",
                                detail={
                                    "schema_id": schema_id,
                                    "difficulty": difficulty,
                                    "weights": dict(self.cfg.difficulty_weights or {}),
                                },
                                echo=False,
                            )
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
                                        "text": self._session_targets_met_status_text(),
                                        "color": "green",
                                    },
                                )
                            elif self._cap_disabled:
                                self.ui_callback(
                                    "status",
                                    {
                                        "text": "No claimable schema (empty list).",
                                        "color": "orange",
                                    },
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
            plog(
                "ui",
                "generation_loop_fatal",
                level="error",
                detail={"error": str(e)},
                echo=True,
                spacer=True,
            )
            import traceback
            traceback.print_exc()
            self.ui_callback("error", {"message": f"Fatal: {str(e)}"})
        finally:
            self.stopped = True
    
    def _save_to_backup(self, item: dict):
        """Save question to local backup file (serialized across concurrent workers)."""
        backup_dir = Path(self.base_dir) / "backups" / datetime.now().strftime("%Y-%m-%d")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        backup_file = backup_dir / "questions.jsonl"
        line = json.dumps(item, ensure_ascii=False) + "\n"
        with self._backup_lock:
            with open(backup_file, "a", encoding="utf-8") as f:
                f.write(line)
    
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
                plog("ui", "refresh_last_id_failed", detail={"error": str(e)}, echo=False)
    
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
                    plog("ui", "success_count_query_failed", detail={"error": str(e)}, echo=False)
        
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
        # Worker threads must not call tkinter directly; they enqueue and the main loop drains.
        self._ui_queue: "queue.Queue[Tuple[str, Any]]" = queue.Queue()
        
        # Load environment (match ``main()``: repo root first, then this package)
        project_root = Path(base_dir).parent.parent
        for env_path in (project_root / ".env.local", Path(base_dir) / ".env.local"):
            if env_path.is_file():
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
                plog("ui", "supabase_init_failed", level="warning", detail={"error": str(e)}, echo=False)
        
        # Schema prefixes: normalize to M/P/B/C only (same as ``main()`` / ``parse_schemas``).
        _valid_prefixes = frozenset({"M", "P", "B", "C"})
        if schema_prefixes:
            raw_parts = [str(p) for p in schema_prefixes]
        else:
            raw_parts = os.environ.get("SCHEMA_PREFIXES", "P,C,B").split(",")
        self.schema_prefixes = tuple(
            p.strip().upper()
            for p in raw_parts
            if p.strip() and p.strip().upper() in _valid_prefixes
        )
        if not self.schema_prefixes:
            self.schema_prefixes = ("P", "C", "B")

        # Fail fast: all subjects use by_subject_prompts/new/ only (no old/ fallback).
        load_prompts(base_dir)
        _session_log = get_pipeline_log_path() or init_pipeline_log(base_dir)
        console_banner(
            [
                "ESAT Simple Generator",
                f"Session log (JSONL): {_session_log}",
                f"Subjects: {', '.join(self.schema_prefixes)}",
                "Tip: open the log file for full detail; console stays short.",
            ]
        )

        schemas_path, schemas_md = load_schemas_esat_markdown(base_dir)
        self.schemas_source_path = Path(schemas_path)
        plog("ui", "schemas_loaded", detail={"path": schemas_path}, echo=False)
        plog(
            "ui",
            "doc_hint",
            detail={"implementer_json": "IMPLEMENTER_JSON_ERRORS.md"},
            echo=False,
        )
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
        
        plog(
            "ui",
            "schema_queue_order",
            detail={
                "first_20": self.queue.ordered_schema_ids[:20],
                "total": len(self.queue.ordered_schema_ids),
            },
            echo=False,
        )
        plog(
            "ui",
            "math_router",
            detail={
                "router_available": MATH_PAPER_ROUTER_AVAILABLE,
                "math_in_run": any(p.upper() == "M" for p in self.schema_prefixes),
            },
            echo=False,
        )

        # Initialize config with default difficulty weights
        # Can be changed mid-run by editing difficulty_weights.txt file
        difficulty_weights = self._load_difficulty_weights()
        xe = difficulty_weights.get("Extreme", 0.0)
        plog(
            "ui",
            "difficulty_weights",
            detail={
                "Easy": difficulty_weights["Easy"],
                "Medium": difficulty_weights["Medium"],
                "Hard": difficulty_weights["Hard"],
                "Extreme": xe,
            },
            echo=False,
        )
        
        try:
            max_workers = max(1, min(16, int(os.environ.get("MAX_WORKERS", "2"))))
        except ValueError:
            max_workers = 2
        # Match in-flight Gemini calls to worker count unless the user set a custom cap.
        if not (os.environ.get("GEMINI_MAX_CONCURRENT") or "").strip():
            # Fewer simultaneous in-flight Vertex calls than threadpool size reduces 429 bursts (RPM/TPM).
            default_cap = max(1, min(max_workers, 2))
            os.environ["GEMINI_MAX_CONCURRENT"] = str(default_cap)
        # Space out starts across workers; tune with API_MIN_DELAY / GEMINI_MAX_CONCURRENT.
        if max_workers > 1 and not (os.environ.get("API_MIN_DELAY") or "").strip():
            os.environ["API_MIN_DELAY"] = "3.5"

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

        self._style_regen_policy_text = describe_style_only_regen_policy(self.models)

        # Initialize controller (pass UI instance for difficulty weight updates)
        self.controller = GenerationController(
            self.base_dir,
            self.queue,
            self.schemas,
            self.cfg,
            self.models,
            self._ui_callback,
            ui_instance=self,  # Pass UI instance for difficulty weight loading
            max_workers=max_workers,
            active_schema_prefixes=self.schema_prefixes,
        )
        _elog = (os.environ.get("GEMINI_API_EVENT_LOG") or "").strip() or str(
            self.base_dir_path / "gemini_api_events.jsonl"
        )
        ctl = self.controller
        plog(
            "ui",
            "runtime_config",
            detail={
                "gemini_api_event_log": _elog,
                "max_workers": max_workers,
                "GEMINI_MAX_CONCURRENT": os.environ.get("GEMINI_MAX_CONCURRENT", str(max_workers)),
                "API_MIN_DELAY": os.environ.get("API_MIN_DELAY", "2.0" if max_workers > 1 else "5.0"),
                "session_caps": {
                    "disabled": ctl._cap_disabled,
                    "targets": {
                        "m1": ctl._target_m1,
                        "m2": ctl._target_m2,
                        "p": ctl._target_p,
                        "c": ctl._target_c,
                        "b": ctl._target_b,
                    },
                },
                "vertex_project": bool(os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()),
                "vertex_location": bool(os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()),
            },
            echo=False,
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
                plog(
                    "ui",
                    "difficulty_weights_file_error",
                    detail={"error": str(e), "defaults": default_weights},
                    echo=False,
                )
        
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
                        plog(
                            "ui",
                            "coverage_rpc",
                            detail={"schema_count": len(coverage)},
                            echo=False,
                        )
                        return coverage
                except Exception:
                    pass  # RPC might not exist, try direct query
                
                # Fallback: direct query (prefer subjects for Math 1/2; same helper as refresh_coverage_from_db)
                response = _fetch_ai_generated_questions_coverage_rows(self.supabase)
                if response.data:
                    coverage: Dict[str, int] = {}
                    for row in response.data:
                        schema_id = row.get("schema_id")
                        if schema_id:
                            coverage[schema_id] = coverage.get(schema_id, 0) + 1
                    plog(
                        "ui",
                        "coverage_direct",
                        detail={"schema_count": len(coverage)},
                        echo=False,
                    )
                    return coverage
            except Exception as e:
                plog("ui", "coverage_supabase_error", detail={"error": str(e)}, echo=False)
        
        # PRIORITY 2: Fallback to JSON file (if Supabase unavailable)
        coverage_file = Path(self.base_dir) / "by_subject_prompts" / "schema_coverage.json"
        if coverage_file.exists():
            try:
                import json
                with open(coverage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Extract totals from {schema_id: {total: N, by_paper: {}}} format
                coverage = {schema_id: info.get("total", 0) for schema_id, info in data.items()}
                plog(
                    "ui",
                    "coverage_json_file",
                    detail={"path": str(coverage_file), "schema_count": len(coverage)},
                    echo=False,
                )
                return coverage
            except Exception as e:
                plog("ui", "coverage_json_error", detail={"file": coverage_file.name, "error": str(e)}, echo=False)

        plog("ui", "coverage_empty", echo=False)
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

        self.style_regen_label = ttk.Label(
            status_frame,
            text=getattr(self, "_style_regen_policy_text", ""),
            font=("Arial", 9),
            foreground="gray",
            wraplength=780,
            justify=tk.LEFT,
        )
        self.style_regen_label.pack(anchor=tk.W, pady=(2, 0))

        # Scrollable column: schema list + overall stats (avoids clipping on typical window heights)
        scroll_outer = ttk.Frame(self.root)
        scroll_outer.pack(fill=tk.BOTH, expand=True)

        self._main_scroll_canvas = tk.Canvas(scroll_outer, highlightthickness=0)
        main_vscroll = ttk.Scrollbar(
            scroll_outer, orient=tk.VERTICAL, command=self._main_scroll_canvas.yview
        )
        self._main_scroll_canvas.configure(yscrollcommand=main_vscroll.set)
        main_vscroll.pack(side=tk.RIGHT, fill=tk.Y)
        self._main_scroll_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        content_inner = ttk.Frame(self._main_scroll_canvas)
        _main_scroll_win = self._main_scroll_canvas.create_window(
            (0, 0), window=content_inner, anchor=tk.NW
        )

        def _sync_main_scroll_region(_event=None):
            self._main_scroll_canvas.configure(scrollregion=self._main_scroll_canvas.bbox("all"))

        def _sync_main_canvas_width(event):
            self._main_scroll_canvas.itemconfig(_main_scroll_win, width=max(1, event.width))

        content_inner.bind("<Configure>", _sync_main_scroll_region)
        self._main_scroll_canvas.bind("<Configure>", _sync_main_canvas_width)

        inventory_frame = ttk.LabelFrame(
            content_inner, text="ESAT schemas & reclassification (data)", padding="10"
        )
        inventory_frame.pack(fill=tk.X, expand=False, padx=10, pady=(10, 5))

        self.inventory_text = scrolledtext.ScrolledText(
            inventory_frame,
            height=10,
            font=("Consolas", 9),
            state=tk.DISABLED,
            wrap=tk.WORD,
        )
        self.inventory_text.pack(fill=tk.BOTH, expand=True)

        # Schema progress (inner ScrolledText for long schema lines; outer canvas for the rest)
        progress_frame = ttk.LabelFrame(
            content_inner, text="Per-schema progress (all loaded IDs)", padding="10"
        )
        progress_frame.pack(fill=tk.X, expand=False, padx=10, pady=(10, 5))

        self.progress_text = scrolledtext.ScrolledText(
            progress_frame,
            height=14,
            font=("Consolas", 9),
            state=tk.DISABLED,
        )
        self.progress_text.pack(fill=tk.BOTH, expand=True)

        # Overall stats
        stats_frame = ttk.LabelFrame(content_inner, text="Overall Progress", padding="10")
        stats_frame.pack(fill=tk.X, expand=False, padx=10, pady=(5, 10))
        
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
            text="Math in DB (M*, subjects): Math1 0 | Math2 0 | unlabeled 0",
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

        self._show_math_ui = "M" in self.schema_prefixes
        if not self._show_math_ui:
            self.router_status_label.pack_forget()
            self.mathematics_label.pack_forget()
            self.math_db_label.pack_forget()
            self.math_remaining_label.pack_forget()
            self.math_paper_session_label.pack_forget()

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

        def _main_scroll_content_taller_than_viewport():
            try:
                ch = self._main_scroll_canvas.winfo_height()
                bbox = self._main_scroll_canvas.bbox("all")
                return bool(bbox and (bbox[3] - bbox[1]) > ch + 1)
            except tk.TclError:
                return False

        def _wheel_over_inner_scroll_text(widget):
            w = widget
            while w is not None:
                if w in (self.progress_text, self.inventory_text):
                    return True
                w = getattr(w, "master", None)
            return False

        def _on_main_mousewheel(event):
            if _wheel_over_inner_scroll_text(event.widget):
                return
            if not _main_scroll_content_taller_than_viewport():
                return
            if getattr(event, "delta", 0):
                self._main_scroll_canvas.yview_scroll(
                    int(-1 * (event.delta / 120)), "units"
                )

        def _on_main_mousewheel_linux_up(_event):
            if not _main_scroll_content_taller_than_viewport():
                return
            self._main_scroll_canvas.yview_scroll(-1, "units")

        def _on_main_mousewheel_linux_down(_event):
            if not _main_scroll_content_taller_than_viewport():
                return
            self._main_scroll_canvas.yview_scroll(1, "units")

        self.root.bind_all("<MouseWheel>", _on_main_mousewheel)
        self.root.bind_all("<Button-4>", _on_main_mousewheel_linux_up)
        self.root.bind_all("<Button-5>", _on_main_mousewheel_linux_down)
        self.root.after_idle(_sync_main_scroll_region)

        # Initial update
        self._update_progress_display()
        
        # Initial stats refresh (if controller exists and session has started)
        if hasattr(self, 'controller') and self.controller:
            stats = self.controller._get_stats()
            self._update_stats_display(stats)

    def _update_inventory_display(self) -> None:
        """Refresh the schema inventory / reclass summary (uses current DB coverage)."""
        text = format_esat_schema_inventory_report(
            schemas_path=self.schemas_source_path,
            ordered_schema_ids=self.queue.ordered_schema_ids,
            coverage=dict(self.queue.coverage),
            approvals_path=self.base_dir_path / "schema_prefix_full_approved.json",
        )
        self.inventory_text.config(state=tk.NORMAL)
        self.inventory_text.delete(1.0, tk.END)
        self.inventory_text.insert(tk.END, text)
        self.inventory_text.config(state=tk.DISABLED)
    
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
    
    def _ui_callback(self, event_type: str, data: Any):
        """Enqueue UI work; must be safe from worker threads (no tkinter calls here)."""
        self._ui_queue.put((event_type, data))

    def _apply_ui_event(self, event_type: str, data: Any) -> None:
        """Apply one UI update on the Tk main thread."""
        if event_type == "status" and isinstance(data, dict):
            self.status_label.config(
                text=data.get("text", ""),
                foreground=data.get("color", "black"),
            )
        elif event_type == "stage":
            self.stage_label.config(text=str(data))
        elif event_type == "success":
            self._update_progress_display()
        elif event_type == "failure":
            self._update_progress_display()
        elif event_type == "stats" and isinstance(data, dict):
            self._update_stats_display(data)
        elif event_type == "error" and isinstance(data, dict):
            messagebox.showerror("Error", data.get("message"))
        elif event_type == "quota_exhausted" and isinstance(data, dict):
            if self.controller:
                self.controller.stop()
            self.stop_button.config(state=tk.DISABLED)
            self.start_button.config(state=tk.NORMAL)
            self.status_label.config(text="Stopped (API quota)", foreground="red")
            messagebox.showwarning(
                "Gemini quota exhausted",
                data.get("message", "All configured API keys hit rate limits."),
            )

    def _poll_ui_queue(self) -> None:
        """Drain cross-thread UI events; reschedule on the main thread."""
        try:
            while True:
                try:
                    event_type, data = self._ui_queue.get_nowait()
                except queue.Empty:
                    break
                self._apply_ui_event(event_type, data)
        except tk.TclError:
            return
        try:
            if not self.root.winfo_exists():
                return
        except tk.TclError:
            return
        self.root.after(50, self._poll_ui_queue)
    
    def _update_progress_display(self):
        """Update the schema progress display."""
        # CRITICAL: Refresh coverage from database before displaying to ensure we show latest counts
        with self.queue.queue_lock:
            self.queue.refresh_coverage_from_db()
        
        # Also refresh stats from DB when updating progress display
        if self.controller:
            stats = self.controller._get_stats()
            self._update_stats_display(stats)

        self._update_inventory_display()
        
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
        if getattr(self, "_show_math_ui", True):
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
        if getattr(self, "_show_math_ui", True):
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
                text=(
                    f"Math in DB (M* rows, subjects column): "
                    f"Math1 {db1} | Math2 {db2} | unlabeled {dbu}"
                )
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

        m1 = stats.get("session_math1", 0)
        m2 = stats.get("session_math2", 0)

        if stats.get("session_cap_disabled"):
            self.session_quota_label.config(
                text="Session subject caps: off (runs until you stop; schemas cycle past per-schema targets)",
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
            if getattr(self, "_show_math_ui", True):
                self.session_quota_label.config(
                    text=(
                        f"Tonight quota (saved): M1 {m1}/{t1} | M2 {m2}/{t2} | "
                        f"P {sp}/{tp} | C {sc}/{tc} | B {sb}/{tb}"
                    ),
                )
            else:
                self.session_quota_label.config(
                    text=(
                        f"Tonight quota (saved): P {sp}/{tp} | C {sc}/{tc} | B {sb}/{tb}"
                    ),
                )

        logp = stats.get("gemini_api_event_log") or ""
        if logp:
            short = logp if len(logp) <= 72 else "…" + logp[-69:]
            self.api_log_label.config(text=f"API log: {short}")
    
    def run(self):
        """Run the UI."""
        self.root.after(50, self._poll_ui_queue)
        self.root.mainloop()


def _generator_base_dir() -> Path:
    """Directory that contains ``by_subject_prompts``, ``schemas``, ``runs``, etc."""
    if getattr(sys, "frozen", False):
        # PyInstaller / cx_Freeze: resources live next to the executable, not in _MEI*.
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def main():
    """Main entry point."""
    base_dir = _generator_base_dir()

    project_root = base_dir.parent.parent
    for env_path in (project_root / ".env.local", base_dir / ".env.local"):
        if env_path.is_file():
            safe_load_dotenv(str(env_path))

    cloud_project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    cloud_location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()
    if not cloud_project or not cloud_location:
        print("\nERROR: Vertex config not set.\n")
        print("Need GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION.")
        print(f"Add them to: {project_root / '.env.local'} or {base_dir / '.env.local'}\n")
        sys.exit(1)

    # Simple UI: no per-session subject caps (e.g. 30 physics then stop). Set ESAT_DISABLE_SESSION_CAP=0 to restore.
    if not (os.environ.get("ESAT_DISABLE_SESSION_CAP") or "").strip():
        os.environ["ESAT_DISABLE_SESSION_CAP"] = "1"

    init_pipeline_log(str(base_dir))
    if not SUPABASE_AVAILABLE:
        plog(
            "ui",
            "main_no_supabase",
            level="warning",
            detail={"hint": "Continuing without DB sync."},
            echo=True,
            spacer=True,
        )

    # Default: Physics, Chemistry, Biology. Override with ESAT_SIMPLE_UI_SCHEMA_PREFIXES (e.g. M,P,C,B).
    raw = (os.environ.get("ESAT_SIMPLE_UI_SCHEMA_PREFIXES") or "").strip()
    if raw:
        parts = [p.strip().upper() for p in raw.split(",") if p.strip()]
        selected_prefixes = tuple(p for p in parts if p in ("M", "P", "B", "C"))
        if not selected_prefixes:
            selected_prefixes = ("P", "C", "B")
    else:
        selected_prefixes = ("P", "C", "B")

    os.environ["SCHEMA_PREFIXES"] = ",".join(selected_prefixes)
    plog(
        "ui",
        "main_schema_prefixes",
        detail={"SCHEMA_PREFIXES": selected_prefixes},
        echo=False,
    )

    app = SimpleGeneratorUI(str(base_dir), schema_prefixes=selected_prefixes)
    app.run()


if __name__ == "__main__":
    import multiprocessing

    multiprocessing.freeze_support()
    main()

