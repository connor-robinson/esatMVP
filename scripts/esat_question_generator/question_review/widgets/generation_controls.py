#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generation Controls Widget

Controls for starting/stopping question generation and viewing progress.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Callable, Optional
import subprocess
import os
import sys
import tempfile
from pathlib import Path


class GenerationControlsWidget(ttk.LabelFrame):
    """Widget for generation controls."""
    
    def __init__(self, parent, db, on_status_change: Optional[Callable[[], None]] = None, **kwargs):
        super().__init__(parent, text="Generate Questions", **kwargs)
        self.db = db
        self.on_status_change = on_status_change
        self.is_generating = False
        self.polling_job = None
        self.generation_process = None  # Track subprocess object
        
        self.setup_ui()
        self.update_status_display()
    
    def setup_ui(self):
        """Set up the UI components."""
        # Top frame with buttons
        top_frame = ttk.Frame(self)
        top_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Generate button (no count input needed - automatic)
        self.generate_button = ttk.Button(
            top_frame,
            text="Generate Questions",
            command=self.start_generation
        )
        self.generate_button.pack(side=tk.LEFT, padx=5)
        
        # Stop button
        self.stop_button = ttk.Button(
            top_frame,
            text="Stop",
            command=self.stop_generation,
            state=tk.DISABLED
        )
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        # Reset button
        reset_button = ttk.Button(
            top_frame,
            text="Reset Status",
            command=self.reset_generation
        )
        reset_button.pack(side=tk.LEFT, padx=5)
        
        # Progress frame
        self.progress_frame = ttk.Frame(self)
        self.progress_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Status message
        self.status_label = ttk.Label(
            self.progress_frame,
            text="",
            font=("", 9)
        )
        self.status_label.pack(anchor=tk.W, pady=(0, 5))
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(
            self.progress_frame,
            variable=self.progress_var,
            maximum=100,
            length=300
        )
        self.progress_bar.pack(fill=tk.X, pady=(0, 5))
        
        # Details label
        self.details_label = ttk.Label(
            self.progress_frame,
            text="",
            font=("", 8),
            foreground="gray"
        )
        self.details_label.pack(anchor=tk.W)
        
        # Category progress frame (collapsible)
        self.category_frame = ttk.LabelFrame(self.progress_frame, text="Category Progress", padding=5)
        self.category_frame.pack(fill=tk.X, pady=(5, 0))
        
        # Category progress bars
        self.category_bars = {}
        self.category_labels = {}
        categories = ["M", "P", "B", "C"]
        category_names = {"M": "Math", "P": "Physics", "B": "Biology", "C": "Chemistry"}
        
        for cat in categories:
            cat_frame = ttk.Frame(self.category_frame)
            cat_frame.pack(fill=tk.X, pady=2)
            
            label = ttk.Label(cat_frame, text=f"{category_names[cat]}:", width=10)
            label.pack(side=tk.LEFT, padx=5)
            
            progress_var = tk.DoubleVar()
            progress_bar = ttk.Progressbar(cat_frame, variable=progress_var, maximum=100, length=150)
            progress_bar.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
            
            status_label = ttk.Label(cat_frame, text="0/0", font=("", 8), width=10)
            status_label.pack(side=tk.LEFT, padx=5)
            
            self.category_bars[cat] = progress_var
            self.category_labels[cat] = status_label
        
        # Schema Progress Display (shows counts, tags, difficulty per schema)
        self.schema_progress_frame = ttk.LabelFrame(self.progress_frame, text="Schema Progress", padding=10)
        # Will be populated and shown when generation is running or after completion
        
        # Current Schema Display (prominent)
        self.current_schema_frame = ttk.LabelFrame(self.progress_frame, text="Current Schema", padding=10)
        # Don't pack initially - will be shown when generation starts
        
        # Schema ID and title
        schema_header_frame = ttk.Frame(self.current_schema_frame)
        schema_header_frame.pack(fill=tk.X, pady=(0, 5))
        
        self.current_schema_id_label = ttk.Label(
            schema_header_frame,
            text="",
            font=("", 14, "bold"),
            foreground="#1a1a1a"
        )
        self.current_schema_id_label.pack(side=tk.LEFT, padx=5)
        
        self.current_schema_title_label = ttk.Label(
            schema_header_frame,
            text="",
            font=("", 10),
            foreground="gray"
        )
        self.current_schema_title_label.pack(side=tk.LEFT, padx=5)
        
        # Current schema progress
        self.current_schema_progress_label = ttk.Label(
            self.current_schema_frame,
            text="",
            font=("", 10),
            foreground="#1a1a1a"
        )
        self.current_schema_progress_label.pack(anchor=tk.W, pady=(0, 5))
        
        # Current schema progress bar
        self.current_schema_progress_var = tk.DoubleVar()
        self.current_schema_progress_bar = ttk.Progressbar(
            self.current_schema_frame,
            variable=self.current_schema_progress_var,
            maximum=100,
            length=300
        )
        self.current_schema_progress_bar.pack(fill=tk.X, pady=(0, 5))
        
        # Worker Status section
        self.worker_status_frame = ttk.LabelFrame(self.progress_frame, text="Worker Status", padding=5)
        # Don't pack initially
        
        # Create worker status labels for all 8 workers
        self.worker_status_labels = {}
        for i in range(1, 9):
            worker_frame = ttk.Frame(self.worker_status_frame)
            worker_frame.pack(fill=tk.X, pady=1)
            
            agent_label = ttk.Label(worker_frame, text=f"Agent {i}:", width=10, font=("", 8))
            agent_label.pack(side=tk.LEFT, padx=2)
            
            status_label = ttk.Label(worker_frame, text="Idle", font=("", 8), foreground="gray", width=40, anchor=tk.W)
            status_label.pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
            
            self.worker_status_labels[i] = status_label
    
    def start_generation(self):
        """Start question generation."""
        if self.is_generating:
            messagebox.showinfo("Info", "Generation already in progress")
            return
        
        try:
            # Debug: Calculate paths
            current_file = Path(__file__)
            script_path = current_file.parent.parent.parent / "generate_with_progress.py"
            project_root = current_file.parent.parent.parent.parent
            
            # Debug: Validate paths
            debug_info = []
            debug_info.append(f"Current file: {current_file}")
            debug_info.append(f"Script path: {script_path}")
            debug_info.append(f"Script exists: {script_path.exists()}")
            debug_info.append(f"Project root: {project_root}")
            debug_info.append(f"Working directory: {os.getcwd()}")
            
            if not script_path.exists():
                error_msg = f"Generation script not found:\n{script_path}\n\nDebug info:\n" + "\n".join(debug_info)
                messagebox.showerror("Error", error_msg)
                return
            
            # Set environment variables
            env = os.environ.copy()
            env["GENERATION_MODE"] = "systematic"  # Force systematic mode
            env["MAX_WORKERS"] = "8"  # Use max workers
            env["PYTHONUNBUFFERED"] = "1"  # Ensure output is not buffered
            # N_ITEMS not needed - calculated from schema coverage
            
            # Get GEMINI_API_KEY from .env.local if available
            env_path = project_root / ".env.local"
            debug_info.append(f"Looking for .env.local at: {env_path}")
            debug_info.append(f".env.local exists: {env_path.exists()}")
            
            if env_path.exists():
                try:
                    from dotenv import load_dotenv
                    load_dotenv(env_path)
                    if "GEMINI_API_KEY" in os.environ:
                        env["GEMINI_API_KEY"] = os.environ["GEMINI_API_KEY"]
                        debug_info.append("GEMINI_API_KEY loaded from .env.local")
                    else:
                        debug_info.append("WARNING: GEMINI_API_KEY not in .env.local")
                except ImportError:
                    debug_info.append("WARNING: python-dotenv not available")
                except Exception as e:
                    debug_info.append(f"WARNING: Error loading .env.local: {e}")
            else:
                debug_info.append("WARNING: .env.local not found")
            
            # Check for schema_coverage.json
            schema_coverage_path = project_root / "schema_generator" / "_cache" / "schema_coverage.json"
            debug_info.append(f"Schema coverage path: {schema_coverage_path}")
            debug_info.append(f"Schema coverage exists: {schema_coverage_path.exists()}")
            
            # Start subprocess (non-blocking) and track it
            # Capture both stdout and stderr to temporary files so we can see errors
            self.stdout_file = tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.log', encoding='utf-8')
            self.stdout_file.close()
            self.stderr_file = tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.log', encoding='utf-8')
            self.stderr_file.close()
            
            stdout_handle = open(self.stdout_file.name, 'w', encoding='utf-8')
            stderr_handle = open(self.stderr_file.name, 'w', encoding='utf-8')
            
            debug_info.append(f"Stdout log: {self.stdout_file.name}")
            debug_info.append(f"Stderr log: {self.stderr_file.name}")
            
            # Write debug info to stderr log
            stderr_handle.write("=== DEBUG INFO ===\n")
            stderr_handle.write("\n".join(debug_info))
            stderr_handle.write("\n\n=== STARTING GENERATION ===\n")
            stderr_handle.flush()
            
            # Start the process
            self.generation_process = subprocess.Popen(
                [sys.executable, str(script_path)],
                env=env,
                cwd=str(script_path.parent),
                stdout=stdout_handle,  # Capture stdout to file
                stderr=stderr_handle  # Capture stderr to file
            )
            
            stdout_handle.close()
            stderr_handle.close()
            
            debug_info.append(f"Process started with PID: {self.generation_process.pid}")
            
            self.is_generating = True
            self.generate_button.config(state=tk.DISABLED)
            self.stop_button.config(state=tk.NORMAL)
            
            # Start polling to check if process is alive
            self.start_polling()
            
            if self.on_status_change:
                self.on_status_change()
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            error_msg = f"Failed to start generation: {e}\n\nTraceback:\n{error_trace}"
            messagebox.showerror("Error", error_msg)
    
    def stop_generation(self):
        """Stop question generation."""
        try:
            if self.generation_process:
                # Terminate the subprocess
                self.generation_process.terminate()
                try:
                    # Wait a bit, then kill if still running
                    self.generation_process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.generation_process.kill()
                # Clean up log files if they exist (optional - keep for debugging)
                # Don't delete immediately - might be useful for debugging
                self.generation_process = None
            
            self.is_generating = False
            self.generate_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
            self.stop_polling()
            self.update_status_display()
            
            if self.on_status_change:
                self.on_status_change()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to stop generation: {e}")
    
    def reset_generation(self):
        """Reset generation status."""
        try:
            # Stop any running process
            if self.generation_process:
                try:
                    self.generation_process.terminate()
                    self.generation_process.wait(timeout=1)
                except:
                    try:
                        self.generation_process.kill()
                    except:
                        pass
                # Clean up log files if they exist (optional - keep for debugging)
                # Don't delete immediately - might be useful for debugging
                self.generation_process = None
            
            self.is_generating = False
            self.generate_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
            self.stop_polling()
            self.update_status_display()
            
            if self.on_status_change:
                self.on_status_change()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to reset generation: {e}")
    
    def update_status_display(self):
        """Update UI based on process state."""
        # Hide all detailed progress displays
        self.category_frame.pack_forget()
        self.current_schema_frame.pack_forget()
        self.worker_status_frame.pack_forget()
        # schema_progress_frame is managed by update_schema_progress_display()
        
        if self.is_generating:
            self.status_label.config(text="Generating questions...", foreground="black")
            self.details_label.config(text="")
            self.progress_var.set(0)  # Indeterminate progress
            # Update schema progress display
            self.update_schema_progress_display()
        else:
            self.status_label.config(text="", foreground="black")
            self.details_label.config(text="")
            self.progress_var.set(0)
            # Still show schema progress when not generating
            self.update_schema_progress_display()
    
    def update_schema_progress_display(self):
        """Update schema progress display with counts, tags, and difficulty."""
        try:
            # Clear existing schema progress widgets
            for widget in self.schema_progress_frame.winfo_children():
                widget.destroy()
            
            # Get schema progress from database
            if not self.db:
                return
            
            schema_progress = self.db.get_schema_progress()
            
            if not schema_progress:
                # No schemas yet
                ttk.Label(
                    self.schema_progress_frame,
                    text="No questions generated yet",
                    foreground="gray",
                    font=("", 9)
                ).pack(pady=10)
                self.schema_progress_frame.pack(fill=tk.X, pady=(5, 0), before=self.details_label)
                return
            
            # Sort schemas by category and number
            sorted_schemas = sorted(schema_progress.items(), key=lambda x: (
                x[0][0],  # Category (M, P, B, C)
                int(x[0][1:]) if x[0][1:].isdigit() else 999  # Number
            ))
            
            # Display each schema
            for schema_id, data in sorted_schemas:
                schema_frame = ttk.Frame(self.schema_progress_frame)
                schema_frame.pack(fill=tk.X, pady=2, padx=5)
                
                # Schema ID (bold)
                schema_label = ttk.Label(
                    schema_frame,
                    text=f"{schema_id}:",
                    font=("", 10, "bold"),
                    width=8
                )
                schema_label.pack(side=tk.LEFT, padx=2)
                
                # Count
                count = data.get("count", 0)
                count_label = ttk.Label(
                    schema_frame,
                    text=f"{count} questions",
                    font=("", 9),
                    width=12
                )
                count_label.pack(side=tk.LEFT, padx=2)
                
                # Tags
                tags_data = data.get("tags", {})
                primary_tags = tags_data.get("primary", [])
                secondary_tags = tags_data.get("secondary", [])
                
                all_tags = primary_tags + secondary_tags
                tags_text = ", ".join(all_tags[:3])  # Show first 3 tags
                if len(all_tags) > 3:
                    tags_text += f" (+{len(all_tags) - 3} more)"
                
                if tags_text:
                    tags_label = ttk.Label(
                        schema_frame,
                        text=f"Tags: {tags_text}",
                        font=("", 8),
                        foreground="gray",
                        width=30
                    )
                    tags_label.pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
                
                # Difficulty breakdown
                difficulty_data = data.get("difficulty", {})
                if difficulty_data:
                    diff_parts = []
                    for diff in ["Easy", "Medium", "Hard"]:
                        count = difficulty_data.get(diff, 0)
                        if count > 0:
                            diff_parts.append(f"{diff[0]}:{count}")
                    
                    if diff_parts:
                        diff_text = " | ".join(diff_parts)
                        diff_label = ttk.Label(
                            schema_frame,
                            text=diff_text,
                            font=("", 8),
                            foreground="blue",
                            width=20
                        )
                        diff_label.pack(side=tk.LEFT, padx=2)
            
            # Show the frame
            self.schema_progress_frame.pack(fill=tk.X, pady=(5, 0), before=self.details_label)
            
        except Exception as e:
            print(f"Error updating schema progress display: {e}")
    
    def start_polling(self):
        """Start polling generation process status."""
        if self.polling_job is None:
            self.poll_generation_status()
    
    def stop_polling(self):
        """Stop polling generation process status."""
        if self.polling_job:
            self.after_cancel(self.polling_job)
            self.polling_job = None
    
    def poll_generation_status(self):
        """Poll generation process status periodically."""
        if self.generation_process:
            # Check if process is still running
            poll_result = self.generation_process.poll()
            if poll_result is None:
                # Process still running
                self.is_generating = True
                self.generate_button.config(state=tk.DISABLED)
                self.stop_button.config(state=tk.NORMAL)
                self.status_label.config(text="Generating questions...")
                # Poll again in 2 seconds
                self.polling_job = self.after(2000, self.poll_generation_status)
            else:
                # Process finished - check exit code
                stdout_content = ""
                stderr_content = ""
                
                # Read both stdout and stderr logs
                if hasattr(self, 'stdout_file') and os.path.exists(self.stdout_file.name):
                    try:
                        with open(self.stdout_file.name, 'r', encoding='utf-8') as f:
                            stdout_content = f.read()
                    except Exception as e:
                        stdout_content = f"Error reading stdout: {e}"
                
                if hasattr(self, 'stderr_file') and os.path.exists(self.stderr_file.name):
                    try:
                        with open(self.stderr_file.name, 'r', encoding='utf-8') as f:
                            stderr_content = f.read()
                    except Exception as e:
                        stderr_content = f"Error reading stderr: {e}"
                
                self.is_generating = False
                self.generate_button.config(state=tk.NORMAL)
                self.stop_button.config(state=tk.DISABLED)
                
                # Check if process exited with error
                if poll_result != 0:
                    # Build detailed error message
                    error_msg = f"Generation failed with exit code {poll_result}\n\n"
                    
                    # Add stderr content (usually contains errors)
                    if stderr_content:
                        error_msg += "=== STDERR (Errors) ===\n"
                        error_msg += stderr_content
                        error_msg += "\n\n"
                    
                    # Add stdout content (may contain useful info)
                    if stdout_content:
                        error_msg += "=== STDOUT ===\n"
                        # Show last 50 lines of stdout
                        stdout_lines = stdout_content.strip().split('\n')
                        last_lines = '\n'.join(stdout_lines[-50:]) if len(stdout_lines) > 50 else stdout_content
                        error_msg += last_lines
                        error_msg += "\n\n"
                    
                    # Show log file locations for debugging
                    if hasattr(self, 'stderr_file'):
                        error_msg += f"Full error log: {self.stderr_file.name}\n"
                    if hasattr(self, 'stdout_file'):
                        error_msg += f"Full output log: {self.stdout_file.name}\n"
                    
                    messagebox.showerror("Generation Error", error_msg)
                    self.status_label.config(text="Generation failed", foreground="red")
                else:
                    # Success - but check if there are any warnings in stderr
                    if stderr_content and "ERROR" in stderr_content.upper():
                        # Show warnings even on success
                        warning_msg = "Generation completed, but there were warnings:\n\n"
                        warning_msg += stderr_content[-500:]  # Last 500 chars
                        messagebox.showwarning("Generation Warnings", warning_msg)
                    
                    self.status_label.config(text="Generation complete", foreground="green")
                
                # Clean up temp files after a delay (keep them for debugging)
                # Don't delete immediately - user might want to check them
                
                self.generation_process = None
                self.polling_job = None
                # Update schema progress display to show new questions
                self.update_schema_progress_display()
                # Refresh questions list to show new questions
                if self.on_status_change:
                    self.on_status_change()
        else:
            # No process running
            self.is_generating = False
            self.generate_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
            self.update_status_display()
            self.polling_job = None


