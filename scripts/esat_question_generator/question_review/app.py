#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Main Application Window for Question Review

Tkinter desktop application for reviewing AI-generated questions.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional
import sys
from datetime import datetime

from question_review.database import Database
from question_review.widgets.question_list import QuestionListWidget
from question_review.widgets.question_detail import QuestionDetailWidget
from question_review.widgets.generation_controls import GenerationControlsWidget
from question_review.widgets.stats_display import StatsDisplayWidget


class QuestionReviewApp(tk.Tk):
    """Main application window."""
    
    def __init__(self):
        super().__init__()
        
        self.db: Optional[Database] = None
        self.question_list: Optional[QuestionListWidget] = None
        self.question_detail: Optional[QuestionDetailWidget] = None
        self.generation_controls: Optional[GenerationControlsWidget] = None
        self.stats_display: Optional[StatsDisplayWidget] = None
        
        self.setup_window()
        self.setup_menu()
        # Initialize status bar first (status_var needed by setup_database)
        self.setup_status_bar()
        self.setup_database()
        self.setup_ui()
        
        # Refresh stats periodically
        self.after(5000, self.periodic_refresh)
    
    def setup_window(self):
        """Set up the main window."""
        self.title("Question Review - ChanAcademy")
        self.geometry("1400x900")
        self.minsize(1000, 600)
        
        # Configure light theme colors
        self.configure(bg="white")
        
        # Configure ttk style
        style = ttk.Style()
        style.theme_use("clam")
        
        # Light theme colors
        style.configure("TFrame", background="white")
        style.configure("TLabel", background="white", foreground="#1a1a1a")
        style.configure("TLabelFrame", background="white", foreground="#1a1a1a")
        style.configure("TLabelFrame.Label", background="white", foreground="#1a1a1a")
        style.configure("TButton", background="#f0f0f0", foreground="#1a1a1a")
        style.map("TButton", background=[("active", "#e0e0e0")])
        style.configure("TEntry", fieldbackground="white", foreground="#1a1a1a", insertcolor="#1a1a1a", bordercolor="#ccc")
        style.configure("TScrollbar", background="#e0e0e0", troughcolor="white", bordercolor="#ccc")
    
    def setup_menu(self):
        """Set up the menu bar."""
        menubar = tk.Menu(self)
        self.config(menu=menubar)
        
        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(label="Refresh", command=self.refresh_all, accelerator="F5")
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.quit)
        
        # Tools menu
        tools_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Tools", menu=tools_menu)
        # Batch approve removed - questions are automatically approved when generated
        
        # Help menu
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="About", command=self.show_about)
        
        # Bind F5 for refresh
        self.bind("<F5>", lambda e: self.refresh_all())
    
    def setup_database(self):
        """Initialize database connection."""
        try:
            self.db = Database()
            self.status_var.set("Connected to database")
        except Exception as e:
            messagebox.showerror(
                "Database Connection Error",
                f"Failed to connect to database:\n{e}\n\n"
                "Please check your .env.local file and ensure SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY are set correctly."
            )
            self.status_var.set(f"Database connection error: {e}")
    
    def setup_ui(self):
        """Set up the main UI layout."""
        if not self.db:
            # Show error message if database not connected
            error_label = ttk.Label(
                self,
                text="Database connection failed. Please check your configuration.",
                foreground="red",
                font=("", 12, "bold")
            )
            error_label.pack(expand=True)
            return
        
        # Top frame: Generation controls and stats
        top_frame = ttk.Frame(self, padding=10)
        top_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Generation controls (left)
        self.generation_controls = GenerationControlsWidget(
            top_frame,
            self.db,
            on_status_change=self.on_generation_status_change
        )
        self.generation_controls.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        
        # Stats display (right)
        self.stats_display = StatsDisplayWidget(top_frame, self.db, width=300)
        self.stats_display.pack(side=tk.RIGHT, padx=(10, 0))
        
        # Main content frame: Question list (left) and detail (right)
        main_frame = ttk.Frame(self)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))
        
        # Question list (left, 1/3 width)
        list_frame = ttk.Frame(main_frame)
        list_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=False, padx=(0, 10))
        list_frame.configure(width=400)
        list_frame.pack_propagate(False)
        
        self.question_list = QuestionListWidget(
            list_frame,
            self.db,
            on_question_select=self.on_question_select
        )
        self.question_list.pack(fill=tk.BOTH, expand=True)
        
        # Question detail (right, 2/3 width)
        detail_frame = ttk.Frame(main_frame)
        detail_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        self.question_detail = QuestionDetailWidget(
            detail_frame,
            self.db,
            on_question_updated=self.on_question_updated
        )
        self.question_detail.pack(fill=tk.BOTH, expand=True)
    
    def setup_status_bar(self):
        """Set up the status bar."""
        status_frame = ttk.Frame(self)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X)
        
        self.status_var = tk.StringVar(value="Ready")
        status_label = ttk.Label(status_frame, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W)
        status_label.pack(fill=tk.X)
        
        self.last_update_var = tk.StringVar(value="")
        update_label = ttk.Label(status_frame, textvariable=self.last_update_var, relief=tk.SUNKEN, anchor=tk.E, width=20)
        update_label.pack(side=tk.RIGHT, fill=tk.Y)
    
    def on_question_select(self, question_id: str):
        """Handle question selection from list."""
        if not self.db or not self.question_detail:
            return
        
        try:
            question = self.db.get_question_by_id(question_id)
            if question:
                self.question_detail.load_question(question)
                self.status_var.set(f"Loaded question: {question.get('generation_id', question_id)}")
            else:
                messagebox.showerror("Error", "Question not found")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load question: {e}")
    
    def on_question_updated(self):
        """Handle question update (refresh list and stats)."""
        if self.question_list:
            self.question_list.refresh_questions()
        if self.stats_display:
            self.stats_display.refresh_stats()
        self.update_last_refresh_time()
    
    def on_generation_status_change(self):
        """Handle generation status change (refresh list and stats)."""
        if self.question_list:
            self.question_list.refresh_questions()
        if self.stats_display:
            self.stats_display.refresh_stats()
    
    def refresh_all(self):
        """Refresh all data."""
        if self.question_list:
            self.question_list.refresh_questions()
        if self.stats_display:
            self.stats_display.refresh_stats()
        if self.generation_controls:
            self.generation_controls.check_generation_status()
        self.update_last_refresh_time()
        self.status_var.set("Refreshed")
    
    def periodic_refresh(self):
        """Periodically refresh stats."""
        if self.stats_display:
            self.stats_display.refresh_stats()
        # Schedule next refresh in 30 seconds
        self.after(30000, self.periodic_refresh)
    
    def update_last_refresh_time(self):
        """Update the last refresh time in status bar."""
        now = datetime.now().strftime("%H:%M:%S")
        self.last_update_var.set(now)
    
    # Batch approve removed - questions are automatically approved when generated
    
    def show_about(self):
        """Show about dialog."""
        messagebox.showinfo(
            "About Question Review",
            "Question Review App v1.0.0\n\n"
            "A desktop application for reviewing and managing\n"
            "AI-generated questions.\n\n"
            "ChanAcademy"
        )
    
    def quit(self):
        """Quit the application."""
        if messagebox.askyesno("Exit", "Are you sure you want to exit?"):
            super().quit()


def main():
    """Main entry point."""
    app = QuestionReviewApp()
    app.mainloop()


if __name__ == "__main__":
    main()


