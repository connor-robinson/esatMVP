#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ESAT Visual Question Generator UI

Tkinter monitor for concurrent ESAT generation: Math (→ Math 1 / 2 via classifier),
Physics, Chemistry, Biology. Uses the same WorkerManager + run_once pipeline as
generate_with_progress.py (Designer → Implementer → Verifier → Style → KaTeX → tags → DB).
"""

from __future__ import annotations

import os
import sys
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "strict")
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "strict")

from project import (
    RunConfig,
    ModelsConfig,
    safe_load_dotenv,
    get_default_models_config,
    difficulty_weights_from_env,
)
from worker_manager import WorkerManager, SystematicGenerationConfig

try:
    from db_sync import sync_question_from_pipeline  # noqa: F401
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


def _resolve_env_paths(base_dir: str) -> Tuple[str, str]:
    """Return (project_root, qgen_root) for .env.local and schema_coverage.json."""
    base = Path(base_dir).resolve()
    qgen_root = str(base.parent)
    project_root = str(base.parent.parent)
    return project_root, qgen_root


class WorkerStatusWidget(ttk.Frame):
    """Status card for one concurrent worker."""

    def __init__(self, parent, worker_id: int, *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.worker_id = worker_id

        header = ttk.Frame(self)
        header.pack(fill=tk.X, padx=5, pady=2)
        ttk.Label(header, text=f"Worker {worker_id}", font=("Arial", 10, "bold")).pack(side=tk.LEFT)
        self.status_indicator = ttk.Label(header, text="●", font=("Arial", 16))
        self.status_indicator.pack(side=tk.LEFT, padx=5)

        info = ttk.Frame(self)
        info.pack(fill=tk.X, padx=5, pady=2)
        self.schema_label = ttk.Label(info, text="Schema: -", font=("Arial", 9))
        self.schema_label.pack(side=tk.LEFT)
        self.stage_label = ttk.Label(info, text="Stage: -", font=("Arial", 9))
        self.stage_label.pack(side=tk.LEFT, padx=10)

        self.message_label = ttk.Label(self, text="Idle", font=("Arial", 8), foreground="gray")
        self.message_label.pack(fill=tk.X, padx=5, pady=2)

        self.progress_var = tk.DoubleVar()
        ttk.Progressbar(self, variable=self.progress_var, maximum=100, length=200).pack(
            fill=tk.X, padx=5, pady=2
        )

        self.error_text = tk.Text(
            self, height=2, wrap=tk.WORD, font=("Courier", 8), bg="#ffe6e6", fg="#cc0000", state=tk.DISABLED
        )
        self.error_text.pack(fill=tk.X, padx=5, pady=2)

        stats = ttk.Frame(self)
        stats.pack(fill=tk.X, padx=5, pady=2)
        self.stats_label = ttk.Label(stats, text="Success: 0 | Failed: 0", font=("Arial", 8))
        self.stats_label.pack(side=tk.LEFT)

        self.configure(relief=tk.RAISED, borderwidth=1)
        self.success_count = 0
        self.failed_count = 0
        self.last_update = __import__("time").time()

    def update_status(
        self,
        state: str,
        schema: Optional[str] = None,
        stage: Optional[str] = None,
        message: str = "",
    ) -> None:
        import time

        self.last_update = time.time()
        colors = {"idle": "gray", "starting": "blue", "working": "green"}
        self.status_indicator.config(text="●", foreground=colors.get(state, "red"))

        self.schema_label.config(text=f"Schema: {schema or '-'}")
        self.stage_label.config(text=f"Stage: {stage or '-'}")

        if message:
            self.message_label.config(text=message, foreground="black")
        else:
            self.message_label.config(text=state.title(), foreground="gray")

        stage_key = (stage or "").lower().replace(" ", "_")
        stage_progress = {
            "connecting": 5,
            "designer": 18,
            "implementer": 38,
            "verifier": 55,
            "style_judge": 68,
            "style_checker": 68,
            "katex_validator": 80,
            "format_fixer": 84,
            "classifier_station": 92,
            "tag_labeler": 92,
            "tag_labeler_station": 92,
        }
        self.progress_var.set(stage_progress.get(stage_key, 10 if state == "working" else 0))

    def show_error(self, error_msg: str) -> None:
        self.error_text.config(state=tk.NORMAL)
        self.error_text.delete(1.0, tk.END)
        self.error_text.insert(1.0, error_msg[:220])
        self.error_text.config(state=tk.DISABLED)
        self.failed_count += 1
        self._update_stats()

    def clear_error(self) -> None:
        self.error_text.config(state=tk.NORMAL)
        self.error_text.delete(1.0, tk.END)
        self.error_text.config(state=tk.DISABLED)

    def record_success(self) -> None:
        self.success_count += 1
        self._update_stats()
        self.clear_error()

    def record_failure(self) -> None:
        self.failed_count += 1
        self._update_stats()

    def _update_stats(self) -> None:
        self.stats_label.config(text=f"Success: {self.success_count} | Failed: {self.failed_count}")

    def is_stuck(self, timeout_seconds: int = 300) -> bool:
        import time

        return (time.time() - self.last_update) > timeout_seconds


class VisualGeneratorUI:
    """ESAT visual monitor + controls."""

    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.project_root, self.qgen_root = _resolve_env_paths(base_dir)

        self.root = tk.Tk()
        self.root.title("ESAT Question Generator — Visual Monitor (full pipeline)")
        self.root.geometry("1420x920")

        self.worker_manager: Optional[WorkerManager] = None
        self.generation_thread: Optional[threading.Thread] = None
        self.is_running = False
        self.worker_widgets: Dict[int, WorkerStatusWidget] = {}
        self._last_worker_log_key: Dict[int, str] = {}

        self._setup_ui()
        self._start_update_loop()

    def _setup_ui(self) -> None:
        main = ttk.Frame(self.root, padding="10")
        main.pack(fill=tk.BOTH, expand=True)

        top = ttk.Frame(main)
        top.pack(fill=tk.X, pady=(0, 10))

        controls = ttk.LabelFrame(top, text="Controls", padding="10")
        controls.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))

        ttk.Button(controls, text="Start generation", command=self.start_generation).pack(pady=4, fill=tk.X)
        ttk.Button(controls, text="Stop (best-effort)", command=self.stop_generation).pack(pady=4, fill=tk.X)
        ttk.Button(controls, text="Refresh view", command=self.refresh_status).pack(pady=4, fill=tk.X)

        subjects = ttk.LabelFrame(controls, text="Subjects (schema prefixes)", padding="5")
        subjects.pack(fill=tk.X, pady=6)
        self.var_m = tk.BooleanVar(value=True)
        self.var_p = tk.BooleanVar(value=False)
        self.var_c = tk.BooleanVar(value=False)
        self.var_b = tk.BooleanVar(value=False)
        ttk.Checkbutton(subjects, text="Math (M) — classifier assigns Math 1 / Math 2 tags", variable=self.var_m).pack(
            anchor=tk.W
        )
        ttk.Checkbutton(subjects, text="Physics (P)", variable=self.var_p).pack(anchor=tk.W)
        ttk.Checkbutton(subjects, text="Chemistry (C)", variable=self.var_c).pack(anchor=tk.W)
        ttk.Checkbutton(subjects, text="Biology (B)", variable=self.var_b).pack(anchor=tk.W)

        ttk.Label(subjects, text="Category order (systematic):").pack(anchor=tk.W, pady=(6, 0))
        self.category_order_var = tk.StringVar(value="M,P,B,C")
        ttk.Entry(subjects, textvariable=self.category_order_var, width=18).pack(anchor=tk.W, pady=2)

        mode_frame = ttk.LabelFrame(controls, text="Mode", padding="5")
        mode_frame.pack(fill=tk.X, pady=6)
        self.mode_var = tk.StringVar(value="systematic")
        ttk.Radiobutton(mode_frame, text="Systematic (fill schema targets)", variable=self.mode_var, value="systematic").pack(
            anchor=tk.W
        )
        ttk.Radiobutton(mode_frame, text="Random (N successful questions)", variable=self.mode_var, value="random").pack(
            anchor=tk.W
        )

        settings = ttk.LabelFrame(controls, text="Settings", padding="5")
        settings.pack(fill=tk.X, pady=6)

        ttk.Label(settings, text="Max workers:").pack(anchor=tk.W)
        self.workers_var = tk.IntVar(value=int(os.environ.get("MAX_WORKERS", "8")))
        ttk.Spinbox(settings, from_=1, to=16, textvariable=self.workers_var, width=8).pack(anchor=tk.W, pady=2)

        ttk.Label(settings, text="Questions / schema (fallback if no coverage JSON):").pack(anchor=tk.W, pady=(4, 0))
        self.qps_var = tk.IntVar(value=int(os.environ.get("QUESTIONS_PER_SCHEMA", "10")))
        ttk.Spinbox(settings, from_=1, to=100, textvariable=self.qps_var, width=8).pack(anchor=tk.W, pady=2)

        ttk.Label(settings, text="Target N (random mode only):").pack(anchor=tk.W, pady=(4, 0))
        self.n_items_var = tk.IntVar(value=int(os.environ.get("N_ITEMS", "20")))
        ttk.Spinbox(settings, from_=1, to=5000, textvariable=self.n_items_var, width=8).pack(anchor=tk.W, pady=2)

        ttk.Label(settings, text="Max consecutive failures (stop):").pack(anchor=tk.W, pady=(4, 0))
        self.max_fail_var = tk.IntVar(value=int(os.environ.get("MAX_FAILURES", "40")))
        ttk.Spinbox(settings, from_=5, to=500, textvariable=self.max_fail_var, width=8).pack(anchor=tk.W, pady=2)

        self.tags_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(settings, text="Curriculum tagging (Math 1/2, P, C, B topics)", variable=self.tags_var).pack(
            anchor=tk.W, pady=(6, 0)
        )

        progress = ttk.LabelFrame(top, text="Overall progress", padding="10")
        progress.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.overall_stats_label = ttk.Label(progress, text="Idle", font=("Arial", 12))
        self.overall_stats_label.pack(anchor=tk.W, pady=4)

        self.overall_progress_var = tk.DoubleVar()
        ttk.Progressbar(progress, variable=self.overall_progress_var, maximum=100, length=400).pack(fill=tk.X, pady=4)

        self.time_label = ttk.Label(progress, text="Elapsed: 0s | Rate: 0.0 q/min", font=("Arial", 10))
        self.time_label.pack(anchor=tk.W, pady=4)

        hint = (
            "Pipeline: Designer → Implementer → Verifier → Style judge → KaTeX → "
            "classifier (when enabled) → runs/ + optional Supabase sync.\n"
            f".env.local: {os.path.join(self.project_root, '.env.local')}"
        )
        ttk.Label(progress, text=hint, font=("Arial", 8), foreground="#444").pack(anchor=tk.W, pady=4)

        workers_frame = ttk.LabelFrame(main, text="Worker status", padding="8")
        workers_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        canvas = tk.Canvas(workers_frame)
        sb = ttk.Scrollbar(workers_frame, orient="vertical", command=canvas.yview)
        self.workers_container = ttk.Frame(canvas)
        self.workers_container.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=self.workers_container, anchor="nw")
        canvas.configure(yscrollcommand=sb.set)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)

        log_frame = ttk.LabelFrame(main, text="Activity log", padding="5")
        log_frame.pack(fill=tk.BOTH, expand=True)
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, wrap=tk.WORD, font=("Courier", 9))
        self.log_text.pack(fill=tk.BOTH, expand=True)
        self.log_text.config(state=tk.DISABLED)

    def _start_update_loop(self) -> None:
        self._update_ui()
        self.root.after(500, self._start_update_loop)

    def _update_ui(self) -> None:
        if self.worker_manager:
            with self.worker_manager.lock:
                snapshot = dict(self.worker_manager.worker_status.items())
            for worker_id, status in snapshot.items():
                if worker_id not in self.worker_widgets:
                    w = WorkerStatusWidget(self.workers_container, worker_id)
                    row = (worker_id - 1) // 2
                    col = (worker_id - 1) % 2
                    w.grid(row=row, column=col, sticky="nsew", padx=5, pady=5)
                    self.worker_widgets[worker_id] = w
                w = self.worker_widgets[worker_id]
                w.update_status(
                    state=status.get("state", "idle"),
                    schema=status.get("schema"),
                    stage=status.get("stage"),
                    message=status.get("message", ""),
                )
                if w.is_stuck():
                    w.show_error("No updates for 5+ minutes (may still be on a long API call)")

            stats = self.worker_manager.stats
            if stats.total_questions > 0:
                rate = (stats.successful / stats.total_questions * 100) if stats.total_questions else 0
                self.overall_stats_label.config(
                    text=f"OK: {stats.successful} | Failed: {stats.failed} | Attempts: {stats.total_questions} | Success rate: {rate:.1f}%"
                )
                if getattr(self.worker_manager, "schema_targets", None):
                    target = sum(self.worker_manager.schema_targets.values())
                    pct = (stats.successful / target * 100) if target > 0 else 0
                    self.overall_progress_var.set(min(100.0, pct))
                else:
                    self.overall_progress_var.set(min(100.0, stats.successful * 5))

                if stats.start_time:
                    elapsed = __import__("time").time() - stats.start_time
                    qmin = (stats.successful / elapsed * 60) if elapsed > 0 else 0
                    self.time_label.config(text=f"Elapsed: {elapsed:.0f}s | Rate: {qmin:.2f} q/min")

        self.workers_container.columnconfigure(0, weight=1)
        self.workers_container.columnconfigure(1, weight=1)

    def log(self, message: str, level: str = "info") -> None:
        def _append() -> None:
            try:
                self.log_text.config(state=tk.NORMAL)
                ts = datetime.now().strftime("%H:%M:%S")
                tag = level
                if level == "error":
                    self.log_text.tag_config("error", foreground="red")
                elif level == "success":
                    self.log_text.tag_config("success", foreground="green")
                elif level == "warning":
                    self.log_text.tag_config("warning", foreground="#b35900")
                else:
                    self.log_text.tag_config("info", foreground="black")
                self.log_text.insert(tk.END, f"[{ts}] {message}\n", tag)
                self.log_text.see(tk.END)
                self.log_text.config(state=tk.DISABLED)
            except Exception:
                print(f"[LOG] {message}")

        self.root.after(0, _append)

    def _selected_prefixes(self) -> Tuple[str, ...]:
        letters: List[Tuple[str, bool]] = [
            ("M", self.var_m.get()),
            ("P", self.var_p.get()),
            ("C", self.var_c.get()),
            ("B", self.var_b.get()),
        ]
        checked = {a for a, on in letters if on}
        if not checked:
            raise ValueError("Select at least one subject.")
        raw = self.category_order_var.get().strip().upper()
        order = [p.strip() for p in raw.split(",") if p.strip()]
        if not order:
            order = ["M", "P", "B", "C"]
        seen = []
        for p in order:
            if p in checked and p not in seen:
                seen.append(p)
        for p in ["M", "P", "B", "C"]:
            if p in checked and p not in seen:
                seen.append(p)
        return tuple(seen)

    def start_generation(self) -> None:
        if self.is_running:
            messagebox.showwarning("Running", "Generation is already in progress.")
            return

        env_path = os.path.join(self.project_root, ".env.local")
        safe_load_dotenv(env_path)
        if not os.path.exists(env_path):
            safe_load_dotenv(os.path.join(self.base_dir, ".env.local"))

        cloud_project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
        cloud_location = os.environ.get("GOOGLE_CLOUD_LOCATION", "").strip()
        if not cloud_project or not cloud_location:
            messagebox.showerror(
                "Vertex config",
                f"Set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION in:\n{env_path}",
            )
            return

        try:
            prefixes = self._selected_prefixes()
        except ValueError as e:
            messagebox.showerror("Subjects", str(e))
            return

        mode = self.mode_var.get()
        max_workers = min(16, max(1, self.workers_var.get()))
        qps = max(1, self.qps_var.get())
        max_fail = max(1, self.max_fail_var.get())
        category_order = list(prefixes)

        cov_path = os.path.join(self.qgen_root, "schema_generator", "_cache", "schema_coverage.json")
        if not os.path.isfile(cov_path):
            alt = os.path.normpath(os.path.join(self.base_dir, "..", "schema_generator", "_cache", "schema_coverage.json"))
            if os.path.isfile(alt):
                cov_path = alt
            else:
                cov_path = None  # type: ignore

        cfg = RunConfig(
            max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
            max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
            seed=int(os.environ["SEED"]) if os.environ.get("SEED") else None,
            difficulty_weights=difficulty_weights_from_env(),
            schema_weights=None,
            out_dir=os.environ.get("OUT_DIR", "runs"),
            allow_schema_prefixes=prefixes,
            enable_tag_labeling=self.tags_var.get(),
        )

        models = get_default_models_config()
        systematic_config = SystematicGenerationConfig(
            mode=mode,
            category_order=category_order,
            questions_per_schema=qps,
            schema_coverage_path=cov_path,
        )

        self.worker_manager = WorkerManager(
            base_dir=self.base_dir,
            cfg=cfg,
            models=models,
            max_workers=max_workers,
            systematic_config=systematic_config,
        )

        self.worker_widgets.clear()
        self._last_worker_log_key.clear()
        for w in self.workers_container.winfo_children():
            w.destroy()

        n_random = max(1, self.n_items_var.get())
        self.is_running = True

        def loop() -> None:
            try:
                self.log(
                    f"Starting ESAT generation | mode={mode} | prefixes={prefixes} | workers={max_workers}",
                    "success",
                )
                if cov_path:
                    self.log(f"Schema coverage: {cov_path}", "info")
                else:
                    self.log("No schema_coverage.json — using questions-per-schema fallback for targets.", "warning")

                def track_result(result: Dict[str, Any]) -> None:
                    wid = result.get("worker_id")
                    ok = result.get("success", False)
                    item = (result.get("result") or {}).get("item") or {}
                    iid = item.get("id", "unknown") if ok else None
                    err = result.get("error", "Unknown") if not ok else None

                    def ui() -> None:
                        if wid and wid in self.worker_widgets:
                            ww = self.worker_widgets[wid]
                            if ok:
                                ww.record_success()
                                self.log(f"Worker {wid}: saved {iid}", "success")
                            else:
                                ww.record_failure()
                                if err:
                                    ww.show_error(str(err))
                                self.log(f"Worker {wid}: failed — {err}", "error")

                    self.root.after(0, ui)

                def status_callback(update: Dict[str, Any]) -> None:
                    def ui() -> None:
                        try:
                            for ws, st in (update.get("worker_status") or {}).items():
                                wid = int(ws)
                                stage = (st.get("stage") or "").strip()
                                msg = (st.get("message") or "").strip()
                                key = f"{stage}|{msg}"
                                if self._last_worker_log_key.get(wid) == key:
                                    continue
                                self._last_worker_log_key[wid] = key
                                sch = st.get("schema") or "-"
                                if stage or msg:
                                    self.log(f"Worker {wid} [{sch}] {stage}: {msg}", "info")
                            cf = update.get("consecutive_failures", 0)
                            if cf and cf > 8:
                                self.log(f"Many consecutive failures ({cf}) — check API quota and prompts.", "warning")
                        except Exception:
                            pass

                    self.root.after(0, ui)

                def progress_cb(done: int, total: int) -> None:
                    if total <= 0:
                        return
                    if done == 1 or done == total or done % 10 == 0:
                        self.log(f"Progress: {done}/{total} successful", "info")

                target_n = 0 if mode == "systematic" else n_random
                results = self.worker_manager.generate_questions(
                    n_questions=target_n,
                    progress_callback=progress_cb,
                    status_callback=status_callback,
                    max_failures=max_fail,
                )
                for r in results:
                    track_result(r)

                fs = self.worker_manager.stats
                self.log(f"Finished: {fs.successful} successful, {fs.failed} failed.", "success")
            except Exception as e:
                self.log(f"Generation error: {e}", "error")
                import traceback

                self.log(traceback.format_exc(), "error")
            finally:
                self.is_running = False

        self.generation_thread = threading.Thread(target=loop, daemon=True)
        self.generation_thread.start()

    def stop_generation(self) -> None:
        if not self.is_running:
            messagebox.showinfo("Idle", "Generation is not running.")
            return
        self.log("Stop requested — workers finish in-flight tasks; no hard cancel yet.", "warning")
        self.is_running = False

    def refresh_status(self) -> None:
        self._update_ui()
        self.log("View refreshed.", "info")


def main() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        import tkinter as tk  # noqa: F401
    except ImportError:
        print("tkinter is not available.")
        sys.exit(1)

    if not SUPABASE_AVAILABLE:
        print("Note: supabase not installed — questions still write to runs/; DB sync may be skipped.")

    app = VisualGeneratorUI(base_dir)
    app.root.mainloop()


if __name__ == "__main__":
    main()
