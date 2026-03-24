#!/usr/bin/env python3
"""
Simple GUI to view batch processing status

Shows which questions have been processed, their status, and any errors.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

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

from db_sync import DatabaseSync
from batch_process_utils import get_processing_metadata

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext
except ImportError:
    print("ERROR: tkinter not available. Install it with your Python distribution.")
    sys.exit(1)


class ProcessingStatusViewer:
    """Simple GUI to view batch processing status."""
    
    def __init__(self, root):
        self.root = root
        self.root.title("Batch Processing Status Viewer")
        self.root.geometry("1200x700")
        
        # Initialize database
        self.db_sync = DatabaseSync()
        if not self.db_sync.enabled or not self.db_sync.client:
            messagebox.showerror("Error", "Database sync not enabled. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
            sys.exit(1)
        
        self.questions: List[Dict[str, Any]] = []
        self.filtered_questions: List[Dict[str, Any]] = []
        
        self.setup_ui()
        self.refresh_data()
        
        # Auto-refresh every 5 seconds
        self.auto_refresh()
    
    def setup_ui(self):
        """Set up the user interface."""
        # Top frame with controls
        control_frame = ttk.Frame(self.root, padding="10")
        control_frame.pack(fill=tk.X)
        
        # Refresh button
        ttk.Button(control_frame, text="Refresh", command=self.refresh_data).pack(side=tk.LEFT, padx=5)
        
        # Status filter
        ttk.Label(control_frame, text="Filter:").pack(side=tk.LEFT, padx=5)
        self.status_filter = ttk.Combobox(control_frame, values=["All", "pending", "running", "rewritten", "tagged", "verified", "render_ok", "done", "failed", "needs_review"], state="readonly", width=15)
        self.status_filter.set("All")
        self.status_filter.pack(side=tk.LEFT, padx=5)
        self.status_filter.bind("<<ComboboxSelected>>", lambda e: self.apply_filter())
        
        # Search box
        ttk.Label(control_frame, text="Search ID:").pack(side=tk.LEFT, padx=5)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", lambda *args: self.apply_filter())
        ttk.Entry(control_frame, textvariable=self.search_var, width=20).pack(side=tk.LEFT, padx=5)
        
        # Stats frame
        stats_frame = ttk.LabelFrame(self.root, text="Statistics", padding="10")
        stats_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.stats_label = ttk.Label(stats_frame, text="Loading...", font=("Arial", 10))
        self.stats_label.pack()
        
        # Main content area with treeview
        content_frame = ttk.Frame(self.root)
        content_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Treeview for questions
        columns = ("ID", "Status", "Stage", "Primary Tag", "Attempts", "Last Error")
        self.tree = ttk.Treeview(content_frame, columns=columns, show="headings", height=20)
        
        # Configure columns
        self.tree.heading("ID", text="Question ID")
        self.tree.heading("Status", text="Status")
        self.tree.heading("Stage", text="Stage")
        self.tree.heading("Primary Tag", text="Primary Tag")
        self.tree.heading("Attempts", text="Attempts")
        self.tree.heading("Last Error", text="Last Error")
        
        self.tree.column("ID", width=200)
        self.tree.column("Status", width=100)
        self.tree.column("Stage", width=120)
        self.tree.column("Primary Tag", width=120)
        self.tree.column("Attempts", width=80)
        self.tree.column("Last Error", width=400)
        
        # Scrollbars
        v_scrollbar = ttk.Scrollbar(content_frame, orient=tk.VERTICAL, command=self.tree.yview)
        h_scrollbar = ttk.Scrollbar(content_frame, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        # Grid layout
        self.tree.grid(row=0, column=0, sticky="nsew")
        v_scrollbar.grid(row=0, column=1, sticky="ns")
        h_scrollbar.grid(row=1, column=0, sticky="ew")
        content_frame.grid_rowconfigure(0, weight=1)
        content_frame.grid_columnconfigure(0, weight=1)
        
        # Double-click to view details
        self.tree.bind("<Double-1>", self.show_details)
        
        # Status bar
        self.status_bar = ttk.Label(self.root, text="Ready", relief=tk.SUNKEN)
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM)
    
    def refresh_data(self):
        """Refresh data from database."""
        try:
            self.status_bar.config(text="Loading questions...")
            self.root.update()
            
            # Fetch all questions
            result = self.db_sync.client.table("ai_generated_questions").select("*").execute()
            self.questions = result.data if result.data else []
            
            self.update_stats()
            self.apply_filter()
            self.status_bar.config(text=f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load data: {e}")
            self.status_bar.config(text=f"Error: {e}")
    
    def update_stats(self):
        """Update statistics display."""
        if not self.questions:
            self.stats_label.config(text="No questions found")
            return
        
        stats = {
            "total": len(self.questions),
            "pending": 0,
            "running": 0,
            "rewritten": 0,
            "tagged": 0,
            "verified": 0,
            "render_ok": 0,
            "done": 0,
            "failed": 0,
            "needs_review": 0
        }
        
        for question in self.questions:
            verifier_report = question.get("verifier_report") or {}
            processing = get_processing_metadata(verifier_report)
            status = processing.get("status", "pending")
            stats[status] = stats.get(status, 0) + 1
        
        stats_text = (
            f"Total: {stats['total']} | "
            f"Done: {stats['done']} | "
            f"Failed: {stats['failed']} | "
            f"Pending: {stats['pending']} | "
            f"Running: {stats['running']} | "
            f"Needs Review: {stats['needs_review']}"
        )
        self.stats_label.config(text=stats_text)
    
    def apply_filter(self):
        """Apply status filter and search."""
        # Clear tree
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Get filter values
        status_filter = self.status_filter.get()
        search_text = self.search_var.get().lower()
        
        # Filter questions
        self.filtered_questions = []
        for question in self.questions:
            verifier_report = question.get("verifier_report") or {}
            processing = get_processing_metadata(verifier_report)
            status = processing.get("status", "pending")
            
            # Status filter
            if status_filter != "All" and status != status_filter:
                continue
            
            # Search filter
            question_id = question.get("id", "")
            if search_text and search_text not in question_id.lower():
                continue
            
            self.filtered_questions.append(question)
        
        # Populate tree
        for question in self.filtered_questions:
            question_id = question.get("id", "unknown")
            verifier_report = question.get("verifier_report") or {}
            processing = get_processing_metadata(verifier_report)
            status = processing.get("status", "pending")
            stage = processing.get("stage", "")
            attempts = processing.get("attempts", 0)
            primary_tag = question.get("primary_tag", "")
            
            # Get last error
            errors = processing.get("errors", [])
            last_error = ""
            if errors:
                last_error_obj = errors[-1]
                last_error = last_error_obj.get("error", "")[:100]  # Truncate long errors
            
            # Color coding based on status
            tags = []
            if status == "done":
                tags = ("done",)
            elif status == "failed":
                tags = ("failed",)
            elif status == "needs_review":
                tags = ("needs_review",)
            elif status == "running":
                tags = ("running",)
            
            item = self.tree.insert("", tk.END, values=(
                question_id[:50],  # Truncate long IDs
                status,
                stage or "-",
                primary_tag or "-",
                attempts,
                last_error or "-"
            ), tags=tags)
        
        # Configure tag colors
        self.tree.tag_configure("done", background="#d4edda")
        self.tree.tag_configure("failed", background="#f8d7da")
        self.tree.tag_configure("needs_review", background="#fff3cd")
        self.tree.tag_configure("running", background="#d1ecf1")
        
        self.status_bar.config(text=f"Showing {len(self.filtered_questions)} of {len(self.questions)} questions")
    
    def show_details(self, event):
        """Show detailed information about selected question."""
        selection = self.tree.selection()
        if not selection:
            return
        
        item = self.tree.item(selection[0])
        question_id = item['values'][0]
        
        # Find the question
        question = None
        for q in self.filtered_questions:
            if q.get("id", "").startswith(question_id):
                question = q
                break
        
        if not question:
            return
        
        # Create detail window
        detail_window = tk.Toplevel(self.root)
        detail_window.title(f"Question Details: {question_id}")
        detail_window.geometry("800x600")
        
        # Create scrolled text widget
        text_widget = scrolledtext.ScrolledText(detail_window, wrap=tk.WORD, width=80, height=30)
        text_widget.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Format question details
        details = []
        details.append(f"Question ID: {question.get('id', 'unknown')}\n")
        details.append("=" * 80 + "\n\n")
        
        # Processing status
        verifier_report = question.get("verifier_report") or {}
        processing = get_processing_metadata(verifier_report)
        details.append("PROCESSING STATUS:\n")
        details.append(f"  Status: {processing.get('status', 'pending')}\n")
        details.append(f"  Stage: {processing.get('stage', '-')}\n")
        details.append(f"  Run ID: {processing.get('run_id', '-')}\n")
        details.append(f"  Attempts: {processing.get('attempts', 0)}\n")
        details.append("\n")
        
        # Tags
        details.append("TAGS:\n")
        details.append(f"  Primary Tag: {question.get('primary_tag', '-')}\n")
        secondary_tags = question.get('secondary_tags', [])
        if secondary_tags:
            details.append(f"  Secondary Tags: {', '.join(secondary_tags)}\n")
        details.append("\n")
        
        # Errors
        errors = processing.get("errors", [])
        if errors:
            details.append("ERRORS:\n")
            for error_obj in errors[-5:]:  # Show last 5 errors
                timestamp = error_obj.get("timestamp", "")
                stage = error_obj.get("stage", "")
                error_msg = error_obj.get("error", "")
                details.append(f"  [{timestamp}] {stage}: {error_msg}\n")
            details.append("\n")
        
        # Question content (truncated)
        details.append("QUESTION CONTENT:\n")
        stem = question.get("question_stem", "")
        if stem:
            details.append(f"  Stem: {stem[:200]}...\n")
        details.append("\n")
        
        # Solution
        solution_reasoning = question.get("solution_reasoning", "")
        if solution_reasoning:
            details.append("SOLUTION:\n")
            details.append(f"  {solution_reasoning[:500]}...\n")
        
        text_widget.insert(tk.END, "".join(details))
        text_widget.config(state=tk.DISABLED)
    
    def auto_refresh(self):
        """Auto-refresh every 5 seconds."""
        self.refresh_data()
        self.root.after(5000, self.auto_refresh)


def main():
    """Main entry point."""
    root = tk.Tk()
    app = ProcessingStatusViewer(root)
    root.mainloop()


if __name__ == "__main__":
    main()





















