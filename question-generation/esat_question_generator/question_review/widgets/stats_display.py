#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Statistics Display Widget

Displays question statistics (total, by schema, by difficulty).
"""

import tkinter as tk
from tkinter import ttk
from typing import Dict, Any, Optional


class StatsDisplayWidget(ttk.Frame):
    """Widget for displaying question statistics."""
    
    def __init__(self, parent, db, **kwargs):
        super().__init__(parent, **kwargs)
        self.db = db
        self.setup_ui()
        self.refresh_stats()
    
    def setup_ui(self):
        """Set up the UI components."""
        # Title
        title_label = ttk.Label(self, text="Statistics", font=("", 12, "bold"))
        title_label.pack(pady=(0, 10))
        
        # Stats grid
        self.stats_frame = ttk.Frame(self)
        self.stats_frame.pack(fill=tk.BOTH, expand=True)
        
        # Create stat cards
        self.total_card = self.create_stat_card("Total Questions", "0", "#4a5568")
        
        # Layout
        self.total_card.pack(fill=tk.X, padx=5, pady=5)
        
        # By difficulty section
        difficulty_frame = ttk.LabelFrame(self.stats_frame, text="By Difficulty", padding=10)
        difficulty_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.difficulty_labels = {}
        for diff in ["Easy", "Medium", "Hard"]:
            diff_frame = ttk.Frame(difficulty_frame)
            diff_frame.pack(fill=tk.X, pady=2)
            
            ttk.Label(diff_frame, text=f"{diff}:", width=10).pack(side=tk.LEFT, padx=5)
            value_label = ttk.Label(diff_frame, text="0", font=("", 12, "bold"), foreground="#4a5568")
            value_label.pack(side=tk.LEFT, padx=5)
            
            self.difficulty_labels[diff] = value_label
    
    def create_stat_card(self, label: str, initial_value: str, color: str) -> ttk.Frame:
        """Create a stat card widget."""
        card = ttk.Frame(self.stats_frame, relief=tk.RAISED, borderwidth=1, padding=10)
        
        # Label
        label_widget = ttk.Label(
            card,
            text=label,
            font=("", 9),
            foreground="gray"
        )
        label_widget.pack()
        
        # Value (will be updated)
        value_widget = ttk.Label(
            card,
            text=initial_value,
            font=("", 18, "bold"),
            foreground=color
        )
        value_widget.pack()
        
        # Store reference to value widget
        card.value_widget = value_widget
        
        return card
    
    def refresh_stats(self):
        """Refresh statistics from database."""
        try:
            stats = self.db.get_stats()
            
            # Update total
            total = stats.get("total", 0)
            self.total_card.value_widget.config(text=str(total))
            
            # Update difficulty breakdown
            by_difficulty = stats.get("byDifficulty", {})
            for diff in ["Easy", "Medium", "Hard"]:
                count = by_difficulty.get(diff, 0)
                self.difficulty_labels[diff].config(text=str(count))
        except Exception as e:
            print(f"Error refreshing stats: {e}")


