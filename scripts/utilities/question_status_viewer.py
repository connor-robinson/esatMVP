#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Generated Questions Status Viewer

A simple tkinter GUI to display the count of AI-generated questions per schema
from the Supabase database.
"""

import os
import sys
import re
import tkinter as tk
from tkinter import ttk, messagebox
from dotenv import load_dotenv
from typing import List, Tuple

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Try multiple paths for .env.local
script_dir = os.path.dirname(os.path.abspath(__file__))
env_paths = [
    os.path.join(script_dir, '.env.local'),
    os.path.join(os.path.dirname(script_dir), '.env.local'),
    '.env.local',
]
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    load_dotenv('.env.local')

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed.")
    print("Installing supabase...")
    os.system(f"{sys.executable} -m pip install supabase python-dotenv")
    from supabase import create_client, Client


class QuestionStatusViewer:
    def __init__(self, root):
        self.root = root
        self.root.title("AI Generated Questions Status")
        self.root.geometry("800x600")
        
        # Get Supabase credentials
        self.supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            messagebox.showerror(
                "Configuration Error",
                "Missing Supabase credentials!\n\n"
                "Please set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and\n"
                "SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)\n"
                "in your .env.local file."
            )
            self.root.destroy()
            return
        
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            messagebox.showerror("Connection Error", f"Failed to connect to Supabase:\n{e}")
            self.root.destroy()
            return
        
        # Create UI
        self.create_ui()
        
        # Load data
        self.refresh_data()
    
    def create_ui(self):
        # Header frame
        header_frame = ttk.Frame(self.root, padding="10")
        header_frame.pack(fill=tk.X)
        
        title_label = ttk.Label(
            header_frame,
            text="AI Generated Questions by Schema",
            font=("Arial", 16, "bold")
        )
        title_label.pack()
        
        # Refresh button
        refresh_btn = ttk.Button(
            header_frame,
            text="Refresh",
            command=self.refresh_data
        )
        refresh_btn.pack(side=tk.RIGHT, padx=5)
        
        # Status label
        self.status_label = ttk.Label(
            header_frame,
            text="Loading...",
            foreground="gray"
        )
        self.status_label.pack(side=tk.RIGHT, padx=5)
        
        # Main content frame with scrollbar
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Create treeview with scrollbars
        tree_frame = ttk.Frame(main_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True)
        
        # Scrollbars
        v_scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL)
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        h_scrollbar = ttk.Scrollbar(tree_frame, orient=tk.HORIZONTAL)
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Treeview
        self.tree = ttk.Treeview(
            tree_frame,
            columns=("Schema ID", "Count"),
            show="headings",
            yscrollcommand=v_scrollbar.set,
            xscrollcommand=h_scrollbar.set
        )
        
        # Configure columns
        self.tree.heading("Schema ID", text="Schema ID", anchor=tk.W)
        self.tree.heading("Count", text="Question Count", anchor=tk.E)
        
        self.tree.column("Schema ID", width=400, anchor=tk.W)
        self.tree.column("Count", width=150, anchor=tk.E)
        
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Configure scrollbars
        v_scrollbar.config(command=self.tree.yview)
        h_scrollbar.config(command=self.tree.xview)
        
        # Subject totals frame
        subject_totals_frame = ttk.LabelFrame(self.root, text="Subject Totals", padding="10")
        subject_totals_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.subject_totals_frame_inner = ttk.Frame(subject_totals_frame)
        self.subject_totals_frame_inner.pack(fill=tk.X)
        
        # Subject labels (will be updated with data)
        self.maths_label = ttk.Label(
            self.subject_totals_frame_inner,
            text="Maths (M): 0",
            font=("Arial", 10, "bold")
        )
        self.maths_label.pack(side=tk.LEFT, padx=10)
        
        self.physics_label = ttk.Label(
            self.subject_totals_frame_inner,
            text="Physics (P): 0",
            font=("Arial", 10, "bold")
        )
        self.physics_label.pack(side=tk.LEFT, padx=10)
        
        self.chemistry_label = ttk.Label(
            self.subject_totals_frame_inner,
            text="Chemistry (C): 0",
            font=("Arial", 10, "bold")
        )
        self.chemistry_label.pack(side=tk.LEFT, padx=10)
        
        self.biology_label = ttk.Label(
            self.subject_totals_frame_inner,
            text="Biology (B): 0",
            font=("Arial", 10, "bold")
        )
        self.biology_label.pack(side=tk.LEFT, padx=10)
        
        # Summary frame
        summary_frame = ttk.Frame(self.root, padding="10")
        summary_frame.pack(fill=tk.X)
        
        self.summary_label = ttk.Label(
            summary_frame,
            text="Total: 0 questions across 0 schemas",
            font=("Arial", 10)
        )
        self.summary_label.pack()
    
    def refresh_data(self):
        """Fetch and display data from Supabase"""
        self.status_label.config(text="Loading...", foreground="gray")
        self.root.update()
        
        try:
            # Query all questions and group by schema_id
            # We'll fetch all and count in Python since Supabase doesn't support GROUP BY directly
            response = self.client.table("ai_generated_questions").select("schema_id").execute()
            
            if not response.data:
                self.status_label.config(text="No data found", foreground="orange")
                self.update_tree([])
                return
            
            # Count questions per schema
            schema_counts = {}
            for row in response.data:
                schema_id = row.get("schema_id", "Unknown")
                schema_counts[schema_id] = schema_counts.get(schema_id, 0) + 1
            
            # Sort by subject (M, P, C, B), then by schema number
            def sort_key(item):
                schema_id, count = item
                match = re.match(r'^([A-Z]+)(\d+)', schema_id)
                if match:
                    prefix, num_str = match.groups()
                    # Order: M (Maths)=0, P (Physics)=1, C (Chemistry)=2, B (Biology)=3
                    prefix_order = {'M': 0, 'P': 1, 'C': 2, 'B': 3}
                    try:
                        num = int(num_str)
                        return (prefix_order.get(prefix, 99), num)
                    except ValueError:
                        return (prefix_order.get(prefix, 99), 0)
                # For non-standard schema IDs, put them at the end
                return (99, 0)
            
            sorted_data = sorted(schema_counts.items(), key=sort_key)
            
            # Calculate subject totals
            subject_totals = {'M': 0, 'P': 0, 'C': 0, 'B': 0}
            for schema_id, count in schema_counts.items():
                match = re.match(r'^([A-Z]+)', schema_id)
                if match:
                    prefix = match.group(1)
                    if prefix in subject_totals:
                        subject_totals[prefix] += count
            
            # Update UI
            self.update_tree(sorted_data)
            self.update_subject_totals(subject_totals)
            
            total_questions = sum(count for _, count in sorted_data)
            total_schemas = len(sorted_data)
            self.summary_label.config(
                text=f"Total: {total_questions} questions across {total_schemas} schemas"
            )
            self.status_label.config(text="Loaded successfully", foreground="green")
            
        except Exception as e:
            error_msg = str(e)
            self.status_label.config(text="Error loading data", foreground="red")
            messagebox.showerror("Error", f"Failed to load data:\n{error_msg}")
            self.update_tree([])
    
    def update_tree(self, data: List[Tuple[str, int]]):
        """Update the treeview with new data"""
        # Clear existing items
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Add new items
        for schema_id, count in data:
            self.tree.insert("", tk.END, values=(schema_id, count))
    
    def update_subject_totals(self, subject_totals: dict):
        """Update the subject totals labels"""
        self.maths_label.config(text=f"Maths (M): {subject_totals.get('M', 0)}")
        self.physics_label.config(text=f"Physics (P): {subject_totals.get('P', 0)}")
        self.chemistry_label.config(text=f"Chemistry (C): {subject_totals.get('C', 0)}")
        self.biology_label.config(text=f"Biology (B): {subject_totals.get('B', 0)}")


def main():
    root = tk.Tk()
    app = QuestionStatusViewer(root)
    root.mainloop()


if __name__ == "__main__":
    main()

