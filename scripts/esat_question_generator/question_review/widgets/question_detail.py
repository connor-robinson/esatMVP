#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Question Detail Widget

Displays and allows editing of question details with math rendering.
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime
import tempfile
from pathlib import Path
from PIL import Image, ImageTk
import io

TKINTERWEB_AVAILABLE = False
try:
    from tkinterweb import HtmlFrame
    TKINTERWEB_AVAILABLE = True
except ImportError:
    pass  # Will fall back to plain text


class QuestionDetailWidget(ttk.Frame):
    """Widget for displaying and editing question details."""
    
    def __init__(self, parent, db, on_question_updated: Optional[Callable[[], None]] = None, **kwargs):
        super().__init__(parent, **kwargs)
        self.db = db
        self.on_question_updated = on_question_updated
        self.current_question: Optional[Dict[str, Any]] = None
        self.editing_section: Optional[str] = None
        self.temp_html_files = []
        
        self.setup_ui()
    
    def setup_ui(self):
        """Set up the UI components."""
        # Create scrollable canvas
        canvas = tk.Canvas(self, bg="white", highlightthickness=0)
        scrollbar = ttk.Scrollbar(self, orient=tk.VERTICAL, command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor=tk.NW)
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Bind mousewheel
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.content_frame = scrollable_frame
    
    def load_question(self, question: Dict[str, Any]):
        """Load a question for display."""
        self.current_question = question
        self.clear_content()
        self.render_question()
    
    def clear_content(self):
        """Clear all content."""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
        self.editing_section = None
    
    def render_question(self):
        """Render the question details."""
        if not self.current_question:
            no_question_label = ttk.Label(
                self.content_frame,
                text="Select a question from the list to review",
                foreground="gray",
                font=("", 12),
                background="white"
            )
            no_question_label.pack(pady=50)
            return
        
        question = self.current_question
        
        # Header with badges
        header_frame = ttk.Frame(self.content_frame)
        header_frame.pack(fill=tk.X, padx=10, pady=10)
        
        schema = question.get("schema_id", "N/A")
        difficulty = question.get("difficulty", "N/A")
        status = question.get("status", "N/A")
        
        ttk.Label(header_frame, text=schema, foreground="white", background="#4a5568", padding=5).pack(side=tk.LEFT, padx=2)
        ttk.Label(header_frame, text=difficulty, foreground="white", background="#718096", padding=5).pack(side=tk.LEFT, padx=2)
        
        # Status badge (simplified - no review jargon)
        if status == "approved":
            status_bg = "#48bb78"  # Green
            status_text = "Generated"
        else:
            status_bg = "#a0aec0"  # Gray for other statuses
            status_text = status
        ttk.Label(header_frame, text=status_text, foreground="white", background=status_bg, padding=5).pack(side=tk.LEFT, padx=2)
        
        created_at = question.get("created_at", "")
        if created_at:
            try:
                date_obj = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                date_str = date_obj.strftime("%Y-%m-%d %H:%M:%S")
            except:
                date_str = created_at
        else:
            date_str = "N/A"
        ttk.Label(header_frame, text=date_str, foreground="gray", font=("", 8), background="white").pack(side=tk.RIGHT, padx=5)
        
        # Question Stem
        self.create_editable_section(
            "Question Stem",
            "question_stem",
            question.get("question_stem", ""),
            height=8
        )
        
        # Options
        self.create_options_section(question.get("options", {}), question.get("correct_option", ""))
        
        # Solution Reasoning
        solution_reasoning = question.get("solution_reasoning")
        if solution_reasoning:
            self.create_editable_section(
                "Solution Reasoning",
                "solution_reasoning",
                solution_reasoning,
                height=6
            )
        
        # Solution Key Insight
        solution_key_insight = question.get("solution_key_insight")
        if solution_key_insight:
            self.create_editable_section(
                "Solution Key Insight",
                "solution_key_insight",
                solution_key_insight,
                height=4
            )
        
        # Distractor Map
        distractor_map = question.get("distractor_map")
        if distractor_map and isinstance(distractor_map, dict):
            self.create_distractor_section(distractor_map)
        
        # Tags
        self.create_tags_section(
            question.get("primary_tag"),
            question.get("secondary_tags", [])
        )
        
        # Review actions removed - no review workflow needed
    
    def create_editable_section(self, title: str, field_name: str, content: str, height: int = 4):
        """Create an editable section with math rendering."""
        section_frame = ttk.LabelFrame(self.content_frame, text=title, padding=8)
        section_frame.pack(fill=tk.BOTH, expand=False, padx=10, pady=5)
        
        # Display frame (shows rendered content) - only take space it needs
        display_frame = ttk.Frame(section_frame)
        display_frame.pack(fill=tk.BOTH, expand=False)
        
        # Edit frame (hidden, shows textarea)
        edit_frame = ttk.Frame(section_frame)
        
        # Render math content using matplotlib
        try:
            # Import from parent package
            import sys
            current_dir = Path(__file__).parent
            parent_dir = current_dir.parent.parent
            if str(parent_dir) not in sys.path:
                sys.path.insert(0, str(parent_dir))
            from question_review.math_renderer import parse_math_content, render_math_segments_to_tkinter
            
            # Parse and render math
            segments = parse_math_content(content)
            rendered_segments = render_math_segments_to_tkinter(segments)
            
            # Create a scrollable canvas for horizontal scrolling
            canvas_container = tk.Frame(display_frame, bg="white")
            canvas_container.pack(fill=tk.BOTH, expand=True, anchor=tk.W)
            
            # Canvas with horizontal scrollbar
            canvas = tk.Canvas(canvas_container, bg="white", highlightthickness=0)
            h_scrollbar = ttk.Scrollbar(canvas_container, orient="horizontal", command=canvas.xview)
            canvas.configure(xscrollcommand=h_scrollbar.set)
            
            # Frame inside canvas to hold content
            content_frame_inner = tk.Frame(canvas, bg="white")
            canvas_window = canvas.create_window((0, 0), window=content_frame_inner, anchor="nw")
            
            def configure_scroll_region(event=None):
                canvas.update_idletasks()
                canvas.configure(scrollregion=canvas.bbox("all"))
                # Make canvas width match the scrollable region or container width, whichever is smaller
                canvas_width = canvas.winfo_width()
                if canvas_width > 1:  # Avoid initial sizing issues
                    content_width = content_frame_inner.winfo_reqwidth()
                    canvas.itemconfig(canvas_window, width=max(canvas_width, content_width))
            
            def configure_canvas_width(event):
                canvas_width = event.width
                content_width = content_frame_inner.winfo_reqwidth()
                canvas.itemconfig(canvas_window, width=max(canvas_width, content_width))
            
            content_frame_inner.bind("<Configure>", configure_scroll_region)
            canvas.bind("<Configure>", configure_canvas_width)
            
            canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)
            
            for text_content, math_image in rendered_segments:
                if text_content and text_content.strip():
                    # Add text widget for text content - don't expand, just fit content
                    text_widget = tk.Text(content_frame_inner, wrap=tk.WORD, bg="white", fg="black", 
                                         height=1, font=("", 10), relief=tk.FLAT, borderwidth=0,
                                         padx=0, pady=0, highlightthickness=0, width=1)
                    text_widget.pack(side=tk.LEFT, fill=tk.NONE, expand=False, anchor=tk.W)
                    text_widget.insert("1.0", text_content)
                    text_widget.config(state=tk.DISABLED)
                    # Auto-resize text widget to content width
                    text_widget.update_idletasks()
                    lines = int(text_widget.index("end-1c").split(".")[0])
                    # Calculate approximate width needed
                    chars_per_line = max(len(line) for line in text_content.split('\n')) if text_content else 1
                    text_widget.config(height=lines, width=min(chars_per_line + 2, 80))
                elif math_image:
                    # Add image for math (inline with text, no padding)
                    try:
                        math_image.seek(0)
                        pil_image = Image.open(math_image)
                        photo = ImageTk.PhotoImage(pil_image)
                        img_label = tk.Label(content_frame_inner, image=photo, bg="white", 
                                            padx=1, pady=0)  # Minimal padding
                        img_label.image = photo  # Keep a reference
                        img_label.pack(side=tk.LEFT, anchor=tk.W)
                    except Exception as e:
                        print(f"Error displaying math image: {e}")
                        # Fallback: show raw math
                        math_text = next((s.content for s in segments if s.type in ("inline", "display")), "")
                        if math_text:
                            text_widget = tk.Text(content_frame_inner, wrap=tk.NONE, bg="white", fg="black",
                                                 height=1, font=("Courier", 10), relief=tk.FLAT,
                                                 padx=0, pady=0, highlightthickness=0, width=len(math_text) + 4)
                            text_widget.pack(side=tk.LEFT, anchor=tk.W)
                            text_widget.insert("1.0", f"${math_text}$")
                            text_widget.config(state=tk.DISABLED)
            
            # If no content was rendered, show original text with scrolling
            if not rendered_segments and content.strip():
                text_frame = tk.Frame(display_frame, bg="white")
                text_frame.pack(fill=tk.BOTH, expand=True)
                
                text_widget = tk.Text(text_frame, wrap=tk.WORD, bg="white", fg="black", insertbackground="black",
                                     relief=tk.FLAT, borderwidth=0, padx=0, pady=0, highlightthickness=0)
                h_scrollbar_text = ttk.Scrollbar(text_frame, orient="horizontal", command=text_widget.xview)
                text_widget.configure(xscrollcommand=h_scrollbar_text.set)
                
                text_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
                h_scrollbar_text.pack(side=tk.BOTTOM, fill=tk.X)
                
                text_widget.insert("1.0", content)
                text_widget.config(state=tk.DISABLED)
                text_widget.update_idletasks()
                lines = int(text_widget.index("end-1c").split(".")[0])
                text_widget.config(height=min(max(lines, 1), 15))
        except Exception as e:
            print(f"Error rendering math with matplotlib: {e}")
            # Fallback: plain text display with scrolling - auto-size based on content
            text_frame = tk.Frame(display_frame, bg="white")
            text_frame.pack(fill=tk.BOTH, expand=True)
            
            text_widget = tk.Text(text_frame, wrap=tk.WORD, bg="white", fg="black", insertbackground="black")
            h_scrollbar_fallback = ttk.Scrollbar(text_frame, orient="horizontal", command=text_widget.xview)
            text_widget.configure(xscrollcommand=h_scrollbar_fallback.set)
            
            text_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            h_scrollbar_fallback.pack(side=tk.BOTTOM, fill=tk.X)
            
            text_widget.insert("1.0", content)
            text_widget.config(state=tk.DISABLED)
            # Auto-resize to content
            text_widget.update_idletasks()
            lines = int(text_widget.index("end-1c").split(".")[0])
            text_widget.config(height=min(max(lines, 3), 15))
        
        # Edit button
        def start_edit():
            self.editing_section = field_name
            display_frame.pack_forget()
            edit_frame.pack(fill=tk.BOTH, expand=True)
        
        def cancel_edit():
            self.editing_section = None
            edit_frame.pack_forget()
            display_frame.pack(fill=tk.BOTH, expand=True)
        
        def save_edit():
            new_content = edit_text.get("1.0", tk.END).rstrip()
            try:
                self.update_question_field(field_name, new_content)
                self.current_question[field_name] = new_content
                cancel_edit()
                # Reload question to show updated content
                updated = self.db.get_question_by_id(self.current_question["id"])
                if updated:
                    self.load_question(updated)
                    if self.on_question_updated:
                        self.on_question_updated()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to update {title}: {e}")
        
        button_frame = ttk.Frame(section_frame)
        button_frame.pack(fill=tk.X, pady=(5, 0))
        
        if self.editing_section != field_name:
            ttk.Button(button_frame, text="Edit", command=start_edit).pack(side=tk.LEFT)
        else:
            # Create text widget with both horizontal and vertical scrollbars
            text_edit_frame = tk.Frame(edit_frame, bg="white")
            text_edit_frame.pack(fill=tk.BOTH, expand=True)
            
            edit_text = tk.Text(
                text_edit_frame,
                wrap=tk.WORD,
                height=min(max(len(content.split('\n')) + 2, 4), 20),
                bg="white",
                fg="black",
                insertbackground="black",
                font=("Consolas", 10)
            )
            h_scrollbar_edit = ttk.Scrollbar(text_edit_frame, orient="horizontal", command=edit_text.xview)
            v_scrollbar_edit = ttk.Scrollbar(text_edit_frame, orient="vertical", command=edit_text.yview)
            edit_text.configure(xscrollcommand=h_scrollbar_edit.set, yscrollcommand=v_scrollbar_edit.set)
            
            edit_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            v_scrollbar_edit.pack(side=tk.RIGHT, fill=tk.Y)
            h_scrollbar_edit.pack(side=tk.BOTTOM, fill=tk.X)
            
            edit_text.insert("1.0", content)
            
            edit_buttons = ttk.Frame(edit_frame)
            edit_buttons.pack(fill=tk.X, pady=(5, 0))
            ttk.Button(edit_buttons, text="Save", command=save_edit).pack(side=tk.LEFT, padx=5)
            ttk.Button(edit_buttons, text="Cancel", command=cancel_edit).pack(side=tk.LEFT, padx=5)
    
    def create_options_section(self, options: Dict[str, str], correct_option: str):
        """Create options section."""
        section_frame = ttk.LabelFrame(self.content_frame, text="Options", padding=10)
        section_frame.pack(fill=tk.BOTH, expand=False, padx=10, pady=5)
        
        for option_key in sorted(options.keys()):
            option_value = options.get(option_key, "")
            if not option_value:
                continue  # Skip empty options
            
            is_correct = option_key == correct_option
            
            option_frame = ttk.Frame(section_frame)
            option_frame.pack(fill=tk.X, expand=False, pady=2)  # Reduced vertical spacing
            
            label_text = f"Option {option_key}"
            if is_correct:
                label_text += " (Correct)"
            
            label = ttk.Label(option_frame, text=label_text, font=("", 10, "bold"))
            label.pack(anchor=tk.W)
            
            # Display option value (with math rendering)
            try:
                # Import from parent package
                import sys
                current_dir = Path(__file__).parent
                parent_dir = current_dir.parent.parent
                if str(parent_dir) not in sys.path:
                    sys.path.insert(0, str(parent_dir))
                from question_review.math_renderer import parse_math_content, render_math_segments_to_tkinter
                
                segments = parse_math_content(option_value)
                rendered_segments = render_math_segments_to_tkinter(segments)
                
                # Create a scrollable canvas for horizontal scrolling in options
                canvas_container_opt = tk.Frame(option_frame, bg="white")
                canvas_container_opt.pack(fill=tk.BOTH, expand=True, anchor=tk.W)
                
                canvas_opt = tk.Canvas(canvas_container_opt, bg="white", highlightthickness=0)
                h_scrollbar_opt = ttk.Scrollbar(canvas_container_opt, orient="horizontal", command=canvas_opt.xview)
                canvas_opt.configure(xscrollcommand=h_scrollbar_opt.set)
                
                content_frame_opt = tk.Frame(canvas_opt, bg="white")
                canvas_window_opt = canvas_opt.create_window((0, 0), window=content_frame_opt, anchor="nw")
                
                def configure_scroll_region_opt(event=None):
                    canvas_opt.update_idletasks()
                    canvas_opt.configure(scrollregion=canvas_opt.bbox("all"))
                    canvas_width_opt = canvas_opt.winfo_width()
                    if canvas_width_opt > 1:
                        content_width_opt = content_frame_opt.winfo_reqwidth()
                        canvas_opt.itemconfig(canvas_window_opt, width=max(canvas_width_opt, content_width_opt))
                
                def configure_canvas_width_opt(event):
                    canvas_width_opt = event.width
                    content_width_opt = content_frame_opt.winfo_reqwidth()
                    canvas_opt.itemconfig(canvas_window_opt, width=max(canvas_width_opt, content_width_opt))
                
                content_frame_opt.bind("<Configure>", configure_scroll_region_opt)
                canvas_opt.bind("<Configure>", configure_canvas_width_opt)
                
                canvas_opt.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
                h_scrollbar_opt.pack(side=tk.BOTTOM, fill=tk.X)
                
                for text_content, math_image in rendered_segments:
                    if text_content and text_content.strip():
                        text_widget = tk.Text(content_frame_opt, wrap=tk.WORD, bg="white", fg="black",
                                             height=1, font=("", 10), relief=tk.FLAT, borderwidth=0,
                                             padx=0, pady=0, highlightthickness=0, width=1)
                        text_widget.pack(side=tk.LEFT, fill=tk.NONE, expand=False, anchor=tk.W)
                        text_widget.insert("1.0", text_content)
                        text_widget.config(state=tk.DISABLED)
                        text_widget.update_idletasks()
                        lines = int(text_widget.index("end-1c").split(".")[0])
                        chars_per_line = max(len(line) for line in text_content.split('\n')) if text_content else 1
                        text_widget.config(height=lines, width=min(chars_per_line + 2, 80))
                    elif math_image:
                        try:
                            math_image.seek(0)
                            pil_image = Image.open(math_image)
                            photo = ImageTk.PhotoImage(pil_image)
                            img_label = tk.Label(content_frame_opt, image=photo, bg="white", 
                                                padx=1, pady=0)
                            img_label.image = photo
                            img_label.pack(side=tk.LEFT, anchor=tk.W)
                        except Exception as e:
                            print(f"Error displaying option math: {e}")
                            if option_value:
                                text_widget = tk.Text(content_frame_opt, wrap=tk.NONE, bg="white", fg="black",
                                                     height=1, font=("Courier", 10), relief=tk.FLAT,
                                                     padx=0, pady=0, highlightthickness=0, width=len(option_value) + 4)
                                text_widget.pack(side=tk.LEFT, anchor=tk.W)
                                text_widget.insert("1.0", option_value)
                                text_widget.config(state=tk.DISABLED)
                
                if not rendered_segments and option_value.strip():
                    text_widget = tk.Text(option_frame, wrap=tk.WORD, bg="white", fg="black",
                                         relief=tk.FLAT, borderwidth=0, padx=0, pady=0, highlightthickness=0)
                    text_widget.pack(fill=tk.X, expand=False)
                    text_widget.insert("1.0", option_value)
                    text_widget.config(state=tk.DISABLED)
                    text_widget.update_idletasks()
                    lines = int(text_widget.index("end-1c").split(".")[0])
                    text_widget.config(height=min(max(lines, 1), 10))
            except Exception as e:
                print(f"Error rendering option: {e}")
                if option_value.strip():
                    text_widget = tk.Text(option_frame, wrap=tk.WORD, bg="white", fg="black",
                                         relief=tk.FLAT, borderwidth=0, padx=0, pady=0, highlightthickness=0)
                    text_widget.pack(fill=tk.X, expand=False)
                    text_widget.insert("1.0", option_value)
                    text_widget.config(state=tk.DISABLED)
                    text_widget.update_idletasks()
                    lines = int(text_widget.index("end-1c").split(".")[0])
                    text_widget.config(height=min(max(lines, 1), 10))
            
            # Highlight correct option
            if is_correct:
                option_frame.config(relief=tk.RAISED, borderwidth=2)
                style = ttk.Style()
                style.configure("Correct.TFrame", background="#c6f6d5")
    
    def create_distractor_section(self, distractor_map: Dict[str, str]):
        """Create distractor map section."""
        section_frame = ttk.LabelFrame(self.content_frame, text="Distractor Analysis", padding=10)
        section_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        for dist_key in sorted(distractor_map.keys()):
            dist_value = distractor_map.get(dist_key, "")
            
            dist_frame = ttk.Frame(section_frame)
            dist_frame.pack(fill=tk.X, pady=5)
            
            ttk.Label(dist_frame, text=f"Distractor {dist_key}", font=("", 9, "bold")).pack(anchor=tk.W)
            
            # Display distractor value - auto-size
            text_widget = tk.Text(dist_frame, wrap=tk.WORD, bg="white", fg="black")
            text_widget.pack(fill=tk.X, expand=False)
            text_widget.insert("1.0", dist_value)
            text_widget.config(state=tk.DISABLED)
            text_widget.update_idletasks()
            lines = int(text_widget.index("end-1c").split(".")[0])
            text_widget.config(height=min(max(lines, 2), 8))
    
    def create_tags_section(self, primary_tag: Optional[str], secondary_tags: List[str]):
        """Create tags editing section."""
        section_frame = ttk.LabelFrame(self.content_frame, text="Curriculum Tags", padding=10)
        section_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # Primary tag
        primary_frame = ttk.Frame(section_frame)
        primary_frame.pack(fill=tk.X, pady=5)
        ttk.Label(primary_frame, text="Primary Tag:").pack(side=tk.LEFT, padx=5)
        primary_entry = ttk.Entry(primary_frame, width=20)
        primary_entry.pack(side=tk.LEFT, padx=5)
        if primary_tag:
            primary_entry.insert(0, primary_tag)
        
        # Secondary tags
        secondary_frame = ttk.Frame(section_frame)
        secondary_frame.pack(fill=tk.X, pady=5)
        ttk.Label(secondary_frame, text="Secondary Tags:").pack(side=tk.LEFT, padx=5)
        secondary_entry = ttk.Entry(secondary_frame, width=40)
        secondary_entry.pack(side=tk.LEFT, padx=5)
        if secondary_tags:
            secondary_entry.insert(0, ", ".join(secondary_tags))
        
        # Save button
        def save_tags():
            primary = primary_entry.get().strip() or None
            secondary_str = secondary_entry.get().strip()
            secondary = [tag.strip() for tag in secondary_str.split(",") if tag.strip()] if secondary_str else []
            
            try:
                self.db.update_question_tags(
                    self.current_question["id"],
                    primary_tag=primary,
                    secondary_tags=secondary
                )
                # Reload question
                updated = self.db.get_question_by_id(self.current_question["id"])
                if updated:
                    self.load_question(updated)
                    if self.on_question_updated:
                        self.on_question_updated()
                messagebox.showinfo("Success", "Tags updated successfully")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to update tags: {e}")
        
        ttk.Button(section_frame, text="Save Tags", command=save_tags).pack(pady=5)
    
    def update_question_field(self, field_name: str, value: Any):
        """Update a single question field."""
        if not self.current_question:
            return
        
        updates = {field_name: value}
        updated = self.db.update_question_content(self.current_question["id"], updates)
        if updated:
            self.current_question = updated
        else:
            raise Exception("Failed to update question")
    
    # Review actions removed - questions are automatically approved when generated


