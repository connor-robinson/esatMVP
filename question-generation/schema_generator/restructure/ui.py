import tkinter as tk
from tkinter import ttk, messagebox
import threading
import subprocess
import time
import sys
import os
from pathlib import Path
from db import NSAASchemaDB
import exporter

class SchemaRestructureUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.db = NSAASchemaDB()
        self.workers = []
        self.is_running = False
        
        self.setup_window()
        self.setup_ui()
        self.update_stats_loop()
        self.start_exporter_thread()

    def start_exporter_thread(self):
        self.exporter_thread = threading.Thread(target=exporter.run_periodic_export, args=(60,), daemon=True)
        self.exporter_thread.start()
        self.log("Started background Markdown exporter (every 60s)")

    def setup_window(self):
        self.title("NSAA Schema Restructuring - Monitor")
        self.geometry("800x600")
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def setup_ui(self):
        # Top frame for controls
        control_frame = ttk.Frame(self, padding="10")
        control_frame.pack(fill=tk.X)
        
        self.start_btn = ttk.Button(control_frame, text="Start Agents", command=self.start_agents)
        self.start_btn.pack(side=tk.LEFT, padx=5)
        
        self.stop_btn = ttk.Button(control_frame, text="Stop Agents", command=self.stop_agents, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=5)
        
        self.worker_count_var = tk.IntVar(value=3)
        ttk.Label(control_frame, text="Agents:").pack(side=tk.LEFT, padx=5)
        ttk.Spinbox(control_frame, from_=1, to=10, textvariable=self.worker_count_var, width=5).pack(side=tk.LEFT, padx=5)

        # Stats frame
        stats_frame = ttk.LabelFrame(self, text="Real-time Stats", padding="10")
        stats_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.queue_label = ttk.Label(stats_frame, text="Queue: Pending: 0 | Done: 0 | Processing: 0")
        self.queue_label.pack(anchor=tk.W)
        
        self.schema_label = ttk.Label(stats_frame, text="Schemas: M: 0 | P: 0 | C: 0 | B: 0")
        self.schema_label.pack(anchor=tk.W)
        
        self.density_label = ttk.Label(stats_frame, text="Density: 1: 0 | 2: 0 | 3: 0 | 4+: 0")
        self.density_label.pack(anchor=tk.W)

        # Log frame
        log_frame = ttk.LabelFrame(self, text="Activity Log", padding="10")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.log_text = tk.Text(log_frame, height=20, state=tk.DISABLED)
        self.log_text.pack(fill=tk.BOTH, expand=True)

    def log(self, message):
        self.log_text.config(state=tk.NORMAL)
        timestamp = time.strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def start_agents(self):
        if self.is_running:
            return
            
        count = self.worker_count_var.get()
        self.log(f"Starting {count} agents...")
        self.is_running = True
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)
        
        for i in range(count):
            name = f"Agent-{i+1}"
            agent_py = Path(__file__).resolve().parent / "agent.py"
            p = subprocess.Popen([sys.executable, str(agent_py), name])
            self.workers.append(p)

    def stop_agents(self):
        if not self.is_running:
            return
            
        self.log("Stopping agents...")
        for p in self.workers:
            p.terminate()
        self.workers = []
        self.is_running = False
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)

    def update_stats_loop(self):
        try:
            stats = self.db.get_stats()
            
            q = stats["queue"]
            self.queue_label.config(text=f"Queue: Pending: {q.get('pending', 0)} | Done: {q.get('done', 0)} | Processing: {q.get('processing', 0)} | Skipped: {q.get('skipped', 0)}")
            
            s = stats["schemas"]
            self.schema_label.config(text=f"Schemas: M: {s.get('Maths', 0)} | P: {s.get('Physics', 0)} | C: {s.get('Chemistry', 0)} | B: {s.get('Biology', 0)}")
            
            d = stats["density"]
            self.density_label.config(text=f"Density (Exemplars per Schema): 1: {d['1']} | 2: {d['2']} | 3: {d['3']} | 4+: {d['4+']}")
            
        except Exception as e:
            print(f"Error updating stats: {e}")
            
        self.after(2000, self.update_stats_loop)

    def on_closing(self):
        if self.is_running:
            if messagebox.askokcancel("Quit", "Agents are running. Stop them and quit?"):
                self.stop_agents()
                self.destroy()
        else:
            self.destroy()

if __name__ == "__main__":
    app = SchemaRestructureUI()
    app.mainloop()

