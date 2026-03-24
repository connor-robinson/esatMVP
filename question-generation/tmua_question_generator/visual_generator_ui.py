#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TMUA Visual Question Generator UI

A comprehensive Tkinter interface showing real-time worker status, stages, and progress.
Displays what each worker is doing, what's stuck, and what's working.
"""

import os
import sys
import json
import time
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

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
    RunConfig, ModelsConfig, safe_load_dotenv, get_default_models_config,
    difficulty_weights_from_env,
)

# Import worker manager
from worker_manager import WorkerManager, SystematicGenerationConfig

# Import database sync
try:
    from db_sync import sync_question_from_pipeline
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("Warning: Supabase not available")


class WorkerStatusWidget(ttk.Frame):
    """Widget showing status for a single worker."""
    
    def __init__(self, parent, worker_id: int, *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.worker_id = worker_id
        
        # Worker header
        header_frame = ttk.Frame(self)
        header_frame.pack(fill=tk.X, padx=5, pady=2)
        
        self.worker_label = ttk.Label(header_frame, text=f"Worker {worker_id}", font=('Arial', 10, 'bold'))
        self.worker_label.pack(side=tk.LEFT)
        
        self.status_indicator = ttk.Label(header_frame, text="●", font=('Arial', 16))
        self.status_indicator.pack(side=tk.LEFT, padx=5)
        
        # Status info
        info_frame = ttk.Frame(self)
        info_frame.pack(fill=tk.X, padx=5, pady=2)
        
        self.schema_label = ttk.Label(info_frame, text="Schema: -", font=('Arial', 9))
        self.schema_label.pack(side=tk.LEFT)
        
        self.stage_label = ttk.Label(info_frame, text="Stage: -", font=('Arial', 9))
        self.stage_label.pack(side=tk.LEFT, padx=10)
        
        # Message/status text
        self.message_label = ttk.Label(self, text="Idle", font=('Arial', 8), foreground='gray')
        self.message_label.pack(fill=tk.X, padx=5, pady=2)
        
        # Progress bar for current question
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(self, variable=self.progress_var, maximum=100, length=200)
        self.progress_bar.pack(fill=tk.X, padx=5, pady=2)
        
        # Error display
        self.error_text = tk.Text(self, height=2, wrap=tk.WORD, font=('Courier', 8), 
                                  bg='#ffe6e6', fg='#cc0000', state=tk.DISABLED)
        self.error_text.pack(fill=tk.X, padx=5, pady=2)
        
        # Stats
        stats_frame = ttk.Frame(self)
        stats_frame.pack(fill=tk.X, padx=5, pady=2)
        
        self.stats_label = ttk.Label(stats_frame, text="Success: 0 | Failed: 0", font=('Arial', 8))
        self.stats_label.pack(side=tk.LEFT)
        
        # Configure border
        self.configure(relief=tk.RAISED, borderwidth=1)
        
        # Initialize stats
        self.success_count = 0
        self.failed_count = 0
        self.last_update = time.time()
    
    def update_status(self, state: str, schema: Optional[str] = None, 
                     stage: Optional[str] = None, message: str = ""):
        """Update worker status display."""
        self.last_update = time.time()
        
        # Update status indicator color
        if state == "idle":
            color = "gray"
            status_text = "●"
        elif state == "starting":
            color = "blue"
            status_text = "●"
        elif state == "working":
            color = "green"
            status_text = "●"
        else:
            color = "red"
            status_text = "●"
        
        self.status_indicator.config(text=status_text, foreground=color)
        
        # Update labels
        schema_text = schema if schema else "-"
        self.schema_label.config(text=f"Schema: {schema_text}")
        
        stage_text = stage if stage else "-"
        self.stage_label.config(text=f"Stage: {stage_text}")
        
        # Update message
        if message:
            self.message_label.config(text=message, foreground='black')
        else:
            self.message_label.config(text=state.title(), foreground='gray')
        
        # Update progress based on stage
        stage_progress = {
            "connecting": 5,
            "designer": 20,
            "implementer": 40,
            "verifier": 60,
            "style_checker": 75,
            "katex_validation": 85,
            "tag_labeler": 95,
            "completed": 100
        }
        progress = stage_progress.get(stage or "", 0)
        self.progress_var.set(progress)
    
    def show_error(self, error_msg: str):
        """Display error message."""
        self.error_text.config(state=tk.NORMAL)
        self.error_text.delete(1.0, tk.END)
        self.error_text.insert(1.0, error_msg[:200])  # Limit length
        self.error_text.config(state=tk.DISABLED)
        self.failed_count += 1
        self.update_stats()
    
    def clear_error(self):
        """Clear error message."""
        self.error_text.config(state=tk.NORMAL)
        self.error_text.delete(1.0, tk.END)
        self.error_text.config(state=tk.DISABLED)
    
    def record_success(self):
        """Record a successful question."""
        self.success_count += 1
        self.update_stats()
        self.clear_error()
    
    def record_failure(self):
        """Record a failed question."""
        self.failed_count += 1
        self.update_stats()
    
    def update_stats(self):
        """Update statistics display."""
        self.stats_label.config(text=f"Success: {self.success_count} | Failed: {self.failed_count}")
    
    def is_stuck(self, timeout_seconds: int = 300) -> bool:
        """Check if worker appears stuck (no update for timeout period)."""
        return (time.time() - self.last_update) > timeout_seconds


class VisualGeneratorUI:
    """Main UI window for visual question generation monitoring."""
    
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.root = tk.Tk()
        self.root.title("TMUA Question Generator - Visual Monitor")
        self.root.geometry("1400x900")
        
        # Generation state
        self.worker_manager = None
        self.generation_thread = None
        self.is_running = False
        self.worker_widgets = {}
        
        # Statistics
        self.total_questions = 0
        self.successful_questions = 0
        self.failed_questions = 0
        self.start_time = None
        
        self._setup_ui()
        self._start_update_loop()
    
    def _setup_ui(self):
        """Set up the UI components."""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Top section: Controls and overall progress
        top_frame = ttk.Frame(main_frame)
        top_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Left: Controls
        controls_frame = ttk.LabelFrame(top_frame, text="Controls", padding="10")
        controls_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        
        ttk.Button(controls_frame, text="Start Generation", command=self.start_generation).pack(pady=5, fill=tk.X)
        ttk.Button(controls_frame, text="Stop Generation", command=self.stop_generation).pack(pady=5, fill=tk.X)
        ttk.Button(controls_frame, text="Refresh Status", command=self.refresh_status).pack(pady=5, fill=tk.X)
        
        # Generation settings
        settings_frame = ttk.LabelFrame(controls_frame, text="Settings", padding="5")
        settings_frame.pack(fill=tk.X, pady=5)
        
        ttk.Label(settings_frame, text="Max Workers:").pack(anchor=tk.W)
        self.workers_var = tk.IntVar(value=8)
        workers_spin = ttk.Spinbox(settings_frame, from_=1, to=16, textvariable=self.workers_var, width=10)
        workers_spin.pack(anchor=tk.W, pady=2)
        
        ttk.Label(settings_frame, text="Questions per Schema:").pack(anchor=tk.W, pady=(5, 0))
        self.questions_per_schema_var = tk.IntVar(value=10)
        questions_spin = ttk.Spinbox(settings_frame, from_=1, to=100, textvariable=self.questions_per_schema_var, width=10)
        questions_spin.pack(anchor=tk.W, pady=2)
        
        # Right: Overall progress
        progress_frame = ttk.LabelFrame(top_frame, text="Overall Progress", padding="10")
        progress_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Overall stats
        self.overall_stats_label = ttk.Label(progress_frame, text="Not started", font=('Arial', 12))
        self.overall_stats_label.pack(anchor=tk.W, pady=5)
        
        # Overall progress bar
        self.overall_progress_var = tk.DoubleVar()
        self.overall_progress_bar = ttk.Progressbar(progress_frame, variable=self.overall_progress_var, 
                                                     maximum=100, length=400)
        self.overall_progress_bar.pack(fill=tk.X, pady=5)
        
        # Time and rate
        self.time_label = ttk.Label(progress_frame, text="Elapsed: 0s | Rate: 0.0 q/min", font=('Arial', 10))
        self.time_label.pack(anchor=tk.W, pady=5)
        
        # Middle section: Worker status grid
        workers_frame = ttk.LabelFrame(main_frame, text="Worker Status", padding="10")
        workers_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Create scrollable canvas for workers
        canvas = tk.Canvas(workers_frame)
        scrollbar = ttk.Scrollbar(workers_frame, orient="vertical", command=canvas.yview)
        self.workers_container = ttk.Frame(canvas)
        
        self.workers_container.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=self.workers_container, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Bottom section: Log/Activity
        log_frame = ttk.LabelFrame(main_frame, text="Activity Log", padding="5")
        log_frame.pack(fill=tk.BOTH, expand=True)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, wrap=tk.WORD, 
                                                   font=('Courier', 9))
        self.log_text.pack(fill=tk.BOTH, expand=True)
        self.log_text.config(state=tk.DISABLED)
    
    def _start_update_loop(self):
        """Start the UI update loop."""
        self._update_ui()
        self.root.after(500, self._start_update_loop)  # Update every 500ms
    
    def _update_ui(self):
        """Update UI elements."""
        if self.worker_manager:
            # Update worker widgets
            with self.worker_manager.lock:
                for worker_id, status in self.worker_manager.worker_status.items():
                    if worker_id not in self.worker_widgets:
                        # Create new worker widget
                        widget = WorkerStatusWidget(self.workers_container, worker_id)
                        widget.grid(row=(worker_id - 1) // 2, column=(worker_id - 1) % 2, 
                                   sticky="nsew", padx=5, pady=5)
                        self.worker_widgets[worker_id] = widget
                    
                    widget = self.worker_widgets[worker_id]
                    widget.update_status(
                        state=status.get("state", "idle"),
                        schema=status.get("schema"),
                        stage=status.get("stage"),
                        message=status.get("message", "")
                    )
                    
                    # Check for stuck workers
                    if widget.is_stuck():
                        widget.show_error("Worker appears stuck - no updates for 5+ minutes")
            
            # Update overall progress
            stats = self.worker_manager.stats
            self.total_questions = stats.total_questions
            self.successful_questions = stats.successful
            self.failed_questions = stats.failed
            
            if stats.total_questions > 0:
                success_rate = (stats.successful / stats.total_questions * 100) if stats.total_questions > 0 else 0
                self.overall_stats_label.config(
                    text=f"Successful: {stats.successful} | Failed: {stats.failed} | Total: {stats.total_questions} | Success Rate: {success_rate:.1f}%"
                )
                
                # Calculate progress (based on target)
                # For systematic mode, we'd need the target from systematic_config
                # For now, use a simple calculation
                if hasattr(self.worker_manager, 'systematic_config') and self.worker_manager.schema_targets:
                    target = sum(self.worker_manager.schema_targets.values())
                    progress = (stats.successful / target * 100) if target > 0 else 0
                else:
                    progress = min(100, (stats.successful / max(1, stats.total_questions)) * 100)
                
                self.overall_progress_var.set(progress)
                
                # Update time and rate
                if stats.start_time:
                    elapsed = time.time() - stats.start_time
                    rate = (stats.successful / elapsed * 60) if elapsed > 0 else 0
                    self.time_label.config(
                        text=f"Elapsed: {elapsed:.0f}s | Rate: {rate:.2f} q/min"
                    )
        
        # Configure grid weights for responsive layout
        self.workers_container.columnconfigure(0, weight=1)
        self.workers_container.columnconfigure(1, weight=1)
    
    def log(self, message: str, level: str = "info"):
        """Add message to log. Thread-safe - schedules update on main thread."""
        def update_log():
            try:
                self.log_text.config(state=tk.NORMAL)
                timestamp = datetime.now().strftime("%H:%M:%S")
                
                # Color coding
                if level == "error":
                    tag = "error"
                    self.log_text.tag_config("error", foreground="red")
                elif level == "success":
                    tag = "success"
                    self.log_text.tag_config("success", foreground="green")
                elif level == "warning":
                    tag = "warning"
                    self.log_text.tag_config("warning", foreground="orange")
                else:
                    tag = "info"
                
                self.log_text.insert(tk.END, f"[{timestamp}] {message}\n", tag)
                self.log_text.see(tk.END)
                self.log_text.config(state=tk.DISABLED)
            except Exception as e:
                # Fallback if UI is closed
                print(f"[LOG] {message}")
        
        # Schedule update on main thread
        self.root.after(0, update_log)
    
    def start_generation(self):
        """Start question generation."""
        if self.is_running:
            messagebox.showwarning("Already Running", "Generation is already in progress.")
            return
        
        try:
            # Load environment
            project_root = os.path.dirname(os.path.dirname(self.base_dir))
            env_path = os.path.join(project_root, ".env.local")
            safe_load_dotenv(env_path)
            
            # Get configuration
            max_workers = self.workers_var.get()
            questions_per_schema = self.questions_per_schema_var.get()
            
            # Create RunConfig
            tmua_prefixes = ("M", "R")
            cfg = RunConfig(
                max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
                max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
                seed=int(os.environ["SEED"]) if os.environ.get("SEED") else None,
                difficulty_weights=difficulty_weights_from_env(tmua_prefixes),
                schema_weights=None,
                out_dir=os.environ.get("OUT_DIR", "runs"),
                allow_schema_prefixes=tmua_prefixes,
            )
            
            # Get models config
            models = get_default_models_config()
            
            # Create systematic config
            category_order = ["M", "R"]  # Paper1, Paper2
            systematic_config = SystematicGenerationConfig(
                mode="systematic",
                category_order=category_order,
                questions_per_schema=questions_per_schema,
                schema_coverage_path=None  # Will be set by worker_manager if available
            )
            
            # Create worker manager
            self.worker_manager = WorkerManager(
                base_dir=self.base_dir,
                cfg=cfg,
                models=models,
                max_workers=max_workers,
                systematic_config=systematic_config
            )
            
            # Start generation in background thread
            self.is_running = True
            self.start_time = time.time()
            
            def generation_loop():
                try:
                    # Calculate target questions (will be calculated by worker_manager in systematic mode)
                    # For systematic mode, it uses schema_targets
                    target = 0  # Will be calculated by generate_questions
                    
                    self.log(f"Starting generation with {max_workers} workers", "info")
                    
                    # Track results to update worker widgets (thread-safe)
                    def track_result(result: dict):
                        worker_id = result.get("worker_id")
                        success = result.get("success", False)
                        item_id = result.get("result", {}).get("item", {}).get("id", "unknown") if success else None
                        error = result.get("error", "Unknown error") if not success else None
                        
                        def update_result_ui():
                            try:
                                if worker_id and worker_id in self.worker_widgets:
                                    widget = self.worker_widgets[worker_id]
                                    if success:
                                        widget.record_success()
                                        self.log(f"Worker {worker_id}: Success - {item_id}", "success")
                                    else:
                                        widget.record_failure()
                                        if error:
                                            widget.show_error(str(error)[:200])
                                        self.log(f"Worker {worker_id}: Failed - {error}", "error")
                            except Exception as e:
                                print(f"[ERROR] Result UI update failed: {e}")
                        
                        # Schedule on main thread
                        self.root.after(0, update_result_ui)
                    
                    # Status callback to update UI (thread-safe)
                    def status_callback(status_update: dict):
                        # Schedule UI update on main thread
                        def update_ui():
                            try:
                                if "worker_status" in status_update:
                                    for worker_id_str, worker_status in status_update["worker_status"].items():
                                        worker_id = int(worker_id_str)
                                        if worker_id not in self.worker_widgets:
                                            # Create widget if it doesn't exist
                                            widget = WorkerStatusWidget(self.workers_container, worker_id)
                                            row = (worker_id - 1) // 2
                                            col = (worker_id - 1) % 2
                                            widget.grid(row=row, column=col, sticky="nsew", padx=5, pady=5)
                                            self.worker_widgets[worker_id] = widget
                                        
                                        widget = self.worker_widgets[worker_id]
                                        state = worker_status.get("state", "idle")
                                        schema = worker_status.get("schema")
                                        stage = worker_status.get("stage")
                                        message = worker_status.get("message", "")
                                        
                                        widget.update_status(
                                            state=state,
                                            schema=schema,
                                            stage=stage,
                                            message=message
                                        )
                                        
                                        # Log stage changes to activity log
                                        if stage and message:
                                            # Use self.log which handles threading
                                            self.log(f"Worker {worker_id} [{schema}]: {stage} - {message}", "info")
                                
                                # Log errors if any
                                if "consecutive_failures" in status_update and status_update["consecutive_failures"] > 5:
                                    self.log(f"Warning: {status_update['consecutive_failures']} consecutive failures", "warning")
                            except Exception as e:
                                print(f"[ERROR] UI update failed: {e}")
                        
                        # Schedule on main thread
                        self.root.after(0, update_ui)
                    
                    # Progress callback (thread-safe)
                    def progress_callback(completed: int, total: int):
                        self.log(f"Progress: {completed}/{total} questions completed", "info")
                    
                    # Generate questions (systematic mode calculates target automatically)
                    results = self.worker_manager.generate_questions(
                        n_questions=0,  # Ignored in systematic mode
                        progress_callback=progress_callback,
                        status_callback=status_callback,
                        max_failures=20
                    )
                    
                    # Process results to update worker widgets
                    for result in results:
                        track_result(result)
                    
                    final_stats = self.worker_manager.stats
                    self.log(f"Generation completed: {final_stats.successful} successful, {final_stats.failed} failed", "success")
                    self.is_running = False
                    
                except Exception as e:
                    self.log(f"Generation error: {e}", "error")
                    import traceback
                    self.log(traceback.format_exc(), "error")
                    self.is_running = False
            
            self.generation_thread = threading.Thread(target=generation_loop, daemon=True)
            self.generation_thread.start()
            
            self.log("Generation started", "success")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start generation: {e}")
            import traceback
            self.log(traceback.format_exc(), "error")
            self.is_running = False
    
    def stop_generation(self):
        """Stop question generation."""
        if not self.is_running:
            messagebox.showinfo("Not Running", "Generation is not currently running.")
            return
        
        # Note: WorkerManager doesn't have a stop method, so we'll just set the flag
        # The generation will complete current tasks
        self.is_running = False
        self.log("Stop requested - current tasks will complete", "warning")
    
    def refresh_status(self):
        """Manually refresh status display."""
        self._update_ui()
        self.log("Status refreshed", "info")


def main():
    """Main entry point."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check for tkinter
    try:
        import tkinter as tk
    except ImportError:
        print("Error: tkinter is not available. Please install it.")
        print("On Ubuntu/Debian: sudo apt-get install python3-tk")
        print("On macOS: tkinter should be included with Python")
        print("On Windows: tkinter should be included with Python")
        sys.exit(1)
    
    app = VisualGeneratorUI(base_dir)
    app.root.mainloop()


if __name__ == "__main__":
    main()

