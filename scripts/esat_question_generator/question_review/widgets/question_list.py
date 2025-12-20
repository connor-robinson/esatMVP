#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Question List Widget

Displays a scrollable list of questions with filtering and pagination.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime


class QuestionListWidget(ttk.Frame):
    """Widget for displaying and filtering question list."""
    
    def __init__(self, parent, db, on_question_select: Callable[[str], None], **kwargs):
        super().__init__(parent, **kwargs)
        self.db = db
        self.on_question_select = on_question_select
        self.current_questions: List[Dict[str, Any]] = []
        self.current_page = 1
        self.total_pages = 1
        self.status_filter = "approved"  # Default to approved questions (all generated questions)
        self.primary_tag_filter = ""
        self.secondary_tag_filter = ""
        
        self.setup_ui()
        self.refresh_questions()
    
    def setup_ui(self):
        """Set up the UI components."""
        # Title
        self.title_label = ttk.Label(self, text="Generated Questions", font=("", 12, "bold"))
        self.title_label.pack(pady=(0, 10))
        
        # Status filter frame (simplified - no review jargon)
        status_frame = ttk.Frame(self)
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(status_frame, text="Show:", font=("", 9)).pack(side=tk.LEFT, padx=5)
        
        self.status_var = tk.StringVar(value="approved")
        self.status_var.trace("w", lambda *args: self.on_status_filter_change())
        
        ttk.Radiobutton(
            status_frame,
            text="Questions",
            variable=self.status_var,
            value="approved",
            command=self.on_status_filter_change
        ).pack(side=tk.LEFT, padx=5)
        
        ttk.Radiobutton(
            status_frame,
            text="All",
            variable=self.status_var,
            value="all",
            command=self.on_status_filter_change
        ).pack(side=tk.LEFT, padx=5)
        
        # Filters frame
        filters_frame = ttk.LabelFrame(self, text="Filters", padding=10)
        filters_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Primary tag filter
        ttk.Label(filters_frame, text="Primary Tag:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.primary_tag_entry = ttk.Entry(filters_frame, width=20)
        self.primary_tag_entry.grid(row=0, column=1, sticky=tk.EW, padx=5, pady=5)
        self.primary_tag_entry.bind("<Return>", lambda e: self.apply_filters())
        filters_frame.columnconfigure(1, weight=1)
        
        # Secondary tag filter
        ttk.Label(filters_frame, text="Secondary Tag:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.secondary_tag_entry = ttk.Entry(filters_frame, width=20)
        self.secondary_tag_entry.grid(row=1, column=1, sticky=tk.EW, padx=5, pady=5)
        self.secondary_tag_entry.bind("<Return>", lambda e: self.apply_filters())
        
        # Filter buttons
        filter_buttons_frame = ttk.Frame(filters_frame)
        filter_buttons_frame.grid(row=2, column=0, columnspan=2, pady=5)
        
        ttk.Button(filter_buttons_frame, text="Apply Filters", command=self.apply_filters).pack(side=tk.LEFT, padx=5)
        ttk.Button(filter_buttons_frame, text="Clear", command=self.clear_filters).pack(side=tk.LEFT, padx=5)
        
        # Question list frame with scrollbar
        list_frame = ttk.Frame(self)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Canvas for scrolling
        self.canvas = tk.Canvas(
            list_frame,
            yscrollcommand=scrollbar.set,
            bg="white",
            highlightthickness=0
        )
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.canvas.yview)
        
        # Frame inside canvas for question cards
        self.questions_container = ttk.Frame(self.canvas)
        self.canvas_window = self.canvas.create_window(
            (0, 0), window=self.questions_container, anchor=tk.NW
        )
        
        # Bind canvas resize
        self.questions_container.bind("<Configure>", self._on_frame_configure)
        self.canvas.bind("<Configure>", self._on_canvas_configure)
        
        # Bind mousewheel
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)
        
        # Pagination frame
        pagination_frame = ttk.Frame(self)
        pagination_frame.pack(fill=tk.X, pady=(0, 5))
        
        self.prev_button = ttk.Button(
            pagination_frame, text="◄ Previous", command=self.prev_page, state=tk.DISABLED
        )
        self.prev_button.pack(side=tk.LEFT, padx=5)
        
        self.page_label = ttk.Label(pagination_frame, text="Page 1 of 1")
        self.page_label.pack(side=tk.LEFT, padx=10, expand=True)
        
        self.next_button = ttk.Button(
            pagination_frame, text="Next ►", command=self.next_page, state=tk.DISABLED
        )
        self.next_button.pack(side=tk.RIGHT, padx=5)
        
        # Count label
        self.count_label = ttk.Label(self, text="0 questions")
        self.count_label.pack(pady=5)
    
    def _on_frame_configure(self, event=None):
        """Update scroll region when frame size changes."""
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))
    
    def _on_canvas_configure(self, event=None):
        """Update canvas window width when canvas size changes."""
        canvas_width = event.width
        self.canvas.itemconfig(self.canvas_window, width=canvas_width)
    
    def _on_mousewheel(self, event):
        """Handle mousewheel scrolling."""
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
    
    def on_status_filter_change(self):
        """Handle status filter change."""
        new_status = self.status_var.get()
        self.status_filter = new_status if new_status != "all" else None
        
        # Update title
        if new_status == "approved":
            self.title_label.config(text="Generated Questions")
        else:
            self.title_label.config(text="All Questions")
        
        self.current_page = 1
        self.refresh_questions()
    
    def apply_filters(self):
        """Apply filters and refresh questions."""
        self.primary_tag_filter = self.primary_tag_entry.get().strip()
        self.secondary_tag_filter = self.secondary_tag_entry.get().strip()
        self.current_page = 1
        self.refresh_questions()
    
    def clear_filters(self):
        """Clear all filters."""
        self.primary_tag_entry.delete(0, tk.END)
        self.secondary_tag_entry.delete(0, tk.END)
        self.primary_tag_filter = ""
        self.secondary_tag_filter = ""
        self.current_page = 1
        self.refresh_questions()
    
    def refresh_questions(self):
        """Refresh the question list from database."""
        try:
            questions, pagination = self.db.get_questions(
                status=self.status_filter,  # Can be None for "all"
                page=self.current_page,
                limit=20,
                primary_tag=self.primary_tag_filter if self.primary_tag_filter else None,
                secondary_tag=self.secondary_tag_filter if self.secondary_tag_filter else None,
            )
            self.current_questions = questions
            self.total_pages = pagination.get("totalPages", 1)
            
            # Update pagination controls
            self.prev_button.config(state=tk.NORMAL if self.current_page > 1 else tk.DISABLED)
            self.next_button.config(state=tk.NORMAL if self.current_page < self.total_pages else tk.DISABLED)
            self.page_label.config(text=f"Page {self.current_page} of {self.total_pages}")
            self.count_label.config(text=f"{pagination.get('total', 0)} questions")
            
            self.render_questions()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to fetch questions: {e}")
    
    def render_questions(self):
        """Render question cards in the list."""
        # Clear existing questions
        for widget in self.questions_container.winfo_children():
            widget.destroy()
        
        if not self.current_questions:
            no_questions_label = ttk.Label(
                self.questions_container,
                text="No questions found",
                foreground="gray"
            )
            no_questions_label.pack(pady=20)
            return
        
        # Create question cards
        for question in self.current_questions:
            card = self.create_question_card(question)
            card.pack(fill=tk.X, padx=5, pady=5)
        
        # Update scroll region
        self._on_frame_configure()
    
    def create_question_card(self, question: Dict[str, Any]) -> ttk.Frame:
        """Create a question card widget."""
        card = ttk.Frame(self.questions_container, relief=tk.RAISED, borderwidth=1)
        card.pack_configure(fill=tk.X, padx=5, pady=5)
        
        # Question ID (clickable)
        question_id = question.get("id", "")
        id_label = ttk.Label(
            card,
            text=f"ID: {question.get('generation_id', 'N/A')[:8]}",
            font=("", 8),
            foreground="gray"
        )
        id_label.pack(anchor=tk.W, padx=5, pady=(5, 0))
        
        # Header with badges
        header_frame = ttk.Frame(card)
        header_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Schema and difficulty badges
        schema = question.get("schema_id", "N/A")
        difficulty = question.get("difficulty", "N/A")
        ttk.Label(header_frame, text=schema, foreground="white", background="#4a5568", padding=2).pack(side=tk.LEFT, padx=2)
        ttk.Label(header_frame, text=difficulty, foreground="white", background="#718096", padding=2).pack(side=tk.LEFT, padx=2)
        
        # Primary tag badge
        primary_tag = question.get("primary_tag")
        if primary_tag:
            ttk.Label(header_frame, text=primary_tag, foreground="white", background="#5da8f0", padding=2).pack(side=tk.LEFT, padx=2)
        
        # Date
        created_at = question.get("created_at", "")
        if created_at:
            try:
                date_obj = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                date_str = date_obj.strftime("%Y-%m-%d")
            except:
                date_str = created_at[:10] if len(created_at) >= 10 else created_at
        else:
            date_str = "N/A"
        
        ttk.Label(header_frame, text=date_str, foreground="gray", font=("", 8)).pack(side=tk.RIGHT, padx=5)
        
        # Question stem preview (truncated)
        stem = question.get("question_stem", "")
        if len(stem) > 100:
            stem_preview = stem[:100] + "..."
        else:
            stem_preview = stem
        
        stem_label = ttk.Label(
            card,
            text=stem_preview,
            wraplength=300,
            font=("", 9)
        )
        stem_label.pack(anchor=tk.W, padx=5, pady=(0, 5))
        
        # Make card clickable
        def on_click(event):
            self.on_question_select(question_id)
        
        card.bind("<Button-1>", on_click)
        for widget in card.winfo_children():
            widget.bind("<Button-1>", on_click)
        
        # Change cursor on hover
        card.bind("<Enter>", lambda e: card.config(cursor="hand2"))
        card.bind("<Leave>", lambda e: card.config(cursor=""))
        
        return card
    
    def prev_page(self):
        """Go to previous page."""
        if self.current_page > 1:
            self.current_page -= 1
            self.refresh_questions()
    
    def next_page(self):
        """Go to next page."""
        if self.current_page < self.total_pages:
            self.current_page += 1
            self.refresh_questions()
    
    def select_question_by_id(self, question_id: str):
        """Programmatically select a question (scroll to it if visible)."""
        # If question is in current list, we could highlight it
        # For now, just refresh to ensure it's loaded
        self.refresh_questions()


