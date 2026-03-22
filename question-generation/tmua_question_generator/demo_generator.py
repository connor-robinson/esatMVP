#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Demo Generator for TMUA Questions

Generates questions for specific schemas with detailed pipeline output display.
Shows all stages: Designer, Implementer, Verifier, Style Checker, etc.
"""

import os
import sys
import json
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from pathlib import Path
from typing import Dict, Any, Optional
import threading

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
    RunConfig, ModelsConfig, run_once, parse_schemas_from_markdown, read_text,
    safe_load_dotenv, choose_difficulty, get_default_models_config
)

# Import database sync (optional)
try:
    from db_sync import sync_question_from_pipeline
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


class DemoGeneratorUI:
    """Tkinter UI for demo generation with detailed pipeline output."""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("TMUA Question Generator - Demo Mode")
        self.root.geometry("1400x900")
        
        # Generation state
        self.is_generating = False
        self.generation_thread = None
        self.current_schema = None
        self.current_mode = None
        
        # Setup UI
        self.setup_ui()
        
    def setup_ui(self):
        """Setup the UI components."""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # Control panel (left)
        control_frame = ttk.LabelFrame(main_frame, text="Generation Control", padding="10")
        control_frame.grid(row=0, column=0, rowspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 10))
        
        # Schema selection
        ttk.Label(control_frame, text="Target Schemas:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.schema_var = tk.StringVar(value="M_6abc19f7, M_574bb542")
        schema_entry = ttk.Entry(control_frame, textvariable=self.schema_var, width=30)
        schema_entry.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Mode selection
        ttk.Label(control_frame, text="Variation Modes:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.mode_var = tk.StringVar(value="FAR,SIBLING")
        mode_entry = ttk.Entry(control_frame, textvariable=self.mode_var, width=30)
        mode_entry.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=5)
        ttk.Label(control_frame, text="(Comma-separated: FAR, SIBLING)", font=("TkDefaultFont", 8)).grid(row=4, column=0, sticky=tk.W)
        
        # Start button
        self.start_button = ttk.Button(control_frame, text="Start Generation", command=self.start_generation)
        self.start_button.grid(row=5, column=0, pady=20, sticky=(tk.W, tk.E))
        
        # Stop button
        self.stop_button = ttk.Button(control_frame, text="Stop", command=self.stop_generation, state=tk.DISABLED)
        self.stop_button.grid(row=6, column=0, pady=5, sticky=(tk.W, tk.E))
        
        # Status
        self.status_label = ttk.Label(control_frame, text="Ready", foreground="green")
        self.status_label.grid(row=7, column=0, pady=10)
        
        # Progress
        self.progress_var = tk.StringVar(value="0/0")
        ttk.Label(control_frame, text="Progress:").grid(row=8, column=0, sticky=tk.W)
        ttk.Label(control_frame, textvariable=self.progress_var).grid(row=9, column=0, sticky=tk.W)
        
        # Output display (right)
        output_frame = ttk.LabelFrame(main_frame, text="Pipeline Output", padding="10")
        output_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        output_frame.columnconfigure(0, weight=1)
        output_frame.rowconfigure(0, weight=1)
        
        # Create notebook for tabs
        self.notebook = ttk.Notebook(output_frame)
        self.notebook.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Create tabs for each stage
        self.stage_tabs = {}
        stages = ["Designer", "Graph Decision", "Template Selector", "Implementer", "Graph Generation", 
                  "Verifier", "Style Checker", "KaTeX Validator", "Final Output"]
        
        for stage in stages:
            frame = ttk.Frame(self.notebook)
            self.notebook.add(frame, text=stage)
            
            # Text widget with scrollbar
            text_frame = ttk.Frame(frame)
            text_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
            frame.columnconfigure(0, weight=1)
            frame.rowconfigure(0, weight=1)
            
            text_widget = scrolledtext.ScrolledText(text_frame, wrap=tk.WORD, width=80, height=30)
            text_widget.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
            text_frame.columnconfigure(0, weight=1)
            text_frame.rowconfigure(0, weight=1)
            
            self.stage_tabs[stage] = text_widget
        
        # Summary tab
        summary_frame = ttk.Frame(self.notebook)
        self.notebook.add(summary_frame, text="Summary")
        summary_text = scrolledtext.ScrolledText(summary_frame, wrap=tk.WORD, width=80, height=30)
        summary_text.pack(fill=tk.BOTH, expand=True)
        self.stage_tabs["Summary"] = summary_text
        
    def append_to_stage(self, stage: str, text: str):
        """Append text to a stage tab."""
        if stage in self.stage_tabs:
            widget = self.stage_tabs[stage]
            widget.insert(tk.END, text + "\n")
            widget.see(tk.END)
            self.root.update_idletasks()
    
    def clear_stage(self, stage: str):
        """Clear a stage tab."""
        if stage in self.stage_tabs:
            self.stage_tabs[stage].delete(1.0, tk.END)
    
    def clear_all_stages(self):
        """Clear all stage tabs."""
        for stage in self.stage_tabs:
            self.clear_stage(stage)
    
    def start_generation(self):
        """Start the generation process."""
        if self.is_generating:
            return
        
        # Parse schemas and modes
        schema_str = self.schema_var.get().strip()
        mode_str = self.mode_var.get().strip()
        
        schemas = [s.strip() for s in schema_str.split(",") if s.strip()]
        modes = [m.strip().upper() for m in mode_str.split(",") if m.strip()]
        
        if not schemas:
            messagebox.showerror("Error", "Please specify at least one schema ID")
            return
        
        if not modes:
            messagebox.showerror("Error", "Please specify at least one variation mode (FAR or SIBLING)")
            return
        
        # Clear previous output
        self.clear_all_stages()
        
        # Update UI state
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.is_generating = True
        self.status_label.config(text="Generating...", foreground="blue")
        
        # Start generation in thread
        self.generation_thread = threading.Thread(
            target=self.run_generation,
            args=(schemas, modes),
            daemon=True
        )
        self.generation_thread.start()
    
    def stop_generation(self):
        """Stop the generation process."""
        self.is_generating = False
        self.status_label.config(text="Stopped", foreground="orange")
        self.start_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.DISABLED)
    
    def run_generation(self, schemas: list, modes: list):
        """Run the generation process."""
        try:
            # Setup
            base_dir = Path(__file__).parent
            project_root = base_dir.parent.parent
            env_path = project_root / ".env.local"
            
            self.append_to_stage("Summary", f"Setup: base_dir = {base_dir}")
            self.append_to_stage("Summary", f"Setup: project_root = {project_root}")
            self.append_to_stage("Summary", f"Setup: env_path = {env_path}")
            self.append_to_stage("Summary", f"Setup: env_path.exists() = {env_path.exists()}")
            
            if env_path.exists() and env_path.is_file():
                self.append_to_stage("Summary", f"Loading .env.local from: {env_path}")
                result = safe_load_dotenv(str(env_path))
                if not result:
                    self.append_to_stage("Summary", f"⚠ Warning: Failed to load .env.local (may use existing env vars)")
            else:
                self.append_to_stage("Summary", f"⚠ Warning: .env.local not found at {env_path}")
                # Try loading from project root directly (if .env.local doesn't exist)
                env_path_alt = project_root / ".env"
                if env_path_alt.exists() and env_path_alt.is_file():
                    self.append_to_stage("Summary", f"Trying .env instead: {env_path_alt}")
                    safe_load_dotenv(str(env_path_alt))
                else:
                    self.append_to_stage("Summary", f"⚠ Warning: No .env or .env.local found. Using existing environment variables.")
            
            # Check if GEMINI_API_KEY is set
            api_key = os.environ.get("GEMINI_API_KEY", "").strip()
            if not api_key:
                error_msg = "ERROR: GEMINI_API_KEY not found in environment. Please check .env.local file."
                self.append_to_stage("Summary", error_msg)
                messagebox.showerror("Configuration Error", error_msg)
                return
            else:
                self.append_to_stage("Summary", f"✓ GEMINI_API_KEY found (length: {len(api_key)})")
            
            models = get_default_models_config()
            cfg = RunConfig(
                max_designer_retries=3,
                max_implementer_regen=2,
                max_format_fix=2,
                max_style_regen=2,
                seed=None,
                enable_tag_labeling=False,  # Disable for demo
                allow_schema_prefixes=("M",),
            )
            
            # Load schemas
            scripts_dir = base_dir.parent
            esat_schemas_dir = scripts_dir / "esat_question_generator" / "schemas"
            schemas_paper1_path = esat_schemas_dir / "Schemas_TMUA_Paper1.md"
            
            self.append_to_stage("Summary", f"Loading schemas from: {schemas_paper1_path}")
            
            if not schemas_paper1_path.exists():
                error_msg = f"ERROR: Schema file not found: {schemas_paper1_path}"
                self.append_to_stage("Summary", error_msg)
                messagebox.showerror("File Not Found", error_msg)
                return
            
            try:
                schemas_md = read_text(schemas_paper1_path)
                self.append_to_stage("Summary", f"✓ Schema file loaded ({len(schemas_md)} characters)")
                all_schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=("M",))
                self.append_to_stage("Summary", f"✓ Parsed {len(all_schemas)} schemas from file")
            except Exception as e:
                error_msg = f"ERROR: Failed to load/parse schema file: {str(e)}"
                self.append_to_stage("Summary", error_msg)
                import traceback
                self.append_to_stage("Summary", traceback.format_exc())
                messagebox.showerror("Schema Load Error", error_msg)
                return
            
            # Verify requested schemas exist
            missing = [s for s in schemas if s not in all_schemas]
            if missing:
                error_msg = f"ERROR: Schemas not found: {missing}\nAvailable schemas: {list(all_schemas.keys())[:10]}..."
                self.append_to_stage("Summary", error_msg)
                messagebox.showerror("Schema Not Found", error_msg)
                return
            
            total_questions = len(schemas) * len(modes)
            completed = 0
            
            self.append_to_stage("Summary", f"Starting generation for {len(schemas)} schemas × {len(modes)} modes = {total_questions} questions")
            self.append_to_stage("Summary", f"Schemas: {', '.join(schemas)}")
            self.append_to_stage("Summary", f"Modes: {', '.join(modes)}")
            self.append_to_stage("Summary", "=" * 70)
            
            # Generate for each schema × mode combination
            for schema_id in schemas:
                if not self.is_generating:
                    break
                
                for mode in modes:
                    if not self.is_generating:
                        break
                    
                    completed += 1
                    self.progress_var.set(f"{completed}/{total_questions}")
                    self.current_schema = schema_id
                    self.current_mode = mode
                    
                    self.append_to_stage("Summary", f"\n[{completed}/{total_questions}] Generating {schema_id} ({mode})")
                    self.append_to_stage("Summary", "-" * 70)
                    
                    # Create callbacks for detailed output (fix closure by capturing current values)
                    current_schema = schema_id
                    current_mode = mode
                    
                    def make_callback(callback_name):
                        def callback(*args, **kwargs):
                            getattr(self, callback_name)(*args, **kwargs)
                        return callback
                    
                    callbacks = {
                        "on_schema_selected": lambda sid, diff: self.on_schema_selected(sid, diff),
                        "on_stage_start": lambda stage, info: self.on_stage_start(stage, info),
                        "on_stage_progress": lambda stage, info: self.on_stage_progress(stage, info),
                        "on_stage_complete": lambda stage, output: self.on_stage_complete(stage, output),
                        "on_stage_error": lambda stage, error: self.on_stage_error(stage, error),
                    }
                    
                    # Force schema and mode
                    try:
                        # Monkey-patch select_variation_mode to force the desired mode
                        import project as project_module
                        original_select = project_module.select_variation_mode
                        
                        # Capture mode in closure
                        forced_mode = current_mode
                        def forced_select_variation_mode(base_dir):
                            return forced_mode
                        
                        project_module.select_variation_mode = forced_select_variation_mode
                        
                        try:
                            result = run_once(
                                base_dir=str(base_dir),
                                cfg=cfg,
                                models=models,
                                callbacks=callbacks,
                                forced_schema_id=schema_id,
                                curriculum_parser=None,
                            )
                        finally:
                            # Restore original function
                            project_module.select_variation_mode = original_select
                        
                        if result.get("status") == "accepted":
                            self.append_to_stage("Summary", f"✓ {schema_id} ({mode}) - ACCEPTED")
                            
                            # Show final output
                            if "item" in result:
                                item = result["item"]
                                self.append_to_stage("Final Output", f"\n{'='*70}")
                                self.append_to_stage("Final Output", f"Schema: {schema_id} | Mode: {mode}")
                                self.append_to_stage("Final Output", f"{'='*70}\n")
                                
                                # Show question
                                q_pkg = item.get("question_package", {})
                                question = q_pkg.get("question", {})
                                self.append_to_stage("Final Output", "QUESTION:")
                                self.append_to_stage("Final Output", question.get("stem", ""))
                                self.append_to_stage("Final Output", "\nOPTIONS:")
                                for opt, text in question.get("options", {}).items():
                                    correct = "✓" if opt == question.get("correct_option") else " "
                                    self.append_to_stage("Final Output", f"  {correct} {opt}: {text}")
                                
                                # Show solution
                                solution = q_pkg.get("solution", {})
                                self.append_to_stage("Final Output", "\nSOLUTION:")
                                self.append_to_stage("Final Output", solution.get("reasoning", ""))
                                
                                # Show graphs if present
                                if item.get("graphs"):
                                    self.append_to_stage("Final Output", "\nQUESTION GRAPHS:")
                                    self.append_to_stage("Final Output", json.dumps(item.get("graphs"), indent=2))
                                
                                if item.get("solution_graphs"):
                                    self.append_to_stage("Final Output", "\nSOLUTION GRAPHS:")
                                    self.append_to_stage("Final Output", json.dumps(item.get("solution_graphs"), indent=2))
                        else:
                            self.append_to_stage("Summary", f"✗ {schema_id} ({mode}) - {result.get('status', 'UNKNOWN')}")
                    
                    except Exception as e:
                        error_msg = f"✗ {schema_id} ({mode}) - ERROR: {str(e)}"
                        self.append_to_stage("Summary", error_msg)
                        import traceback
                        full_traceback = traceback.format_exc()
                        self.append_to_stage("Summary", f"Full traceback for {schema_id} ({mode}):")
                        self.append_to_stage("Summary", full_traceback)
                        # Also append to the relevant stage tab if we know which stage failed
                        if self.current_schema == schema_id and self.current_mode == mode:
                            self.append_to_stage("Summary", f"Error occurred during generation of {schema_id} ({mode})")
            
            # Final status
            if self.is_generating:
                self.status_label.config(text="Complete", foreground="green")
                self.append_to_stage("Summary", "\n" + "=" * 70)
                self.append_to_stage("Summary", f"Generation complete: {completed}/{total_questions} questions")
            
        except Exception as e:
            error_msg = f"FATAL ERROR: {str(e)}"
            self.append_to_stage("Summary", error_msg)
            import traceback
            full_traceback = traceback.format_exc()
            self.append_to_stage("Summary", "\nFull traceback:")
            self.append_to_stage("Summary", full_traceback)
            self.status_label.config(text="Error", foreground="red")
            # Also show in a popup
            messagebox.showerror("Fatal Error", f"{error_msg}\n\nCheck the Summary tab for full details.")
        finally:
            self.is_generating = False
            self.start_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
    
    def on_schema_selected(self, schema_id: str, difficulty: str):
        """Callback when schema is selected."""
        self.append_to_stage("Summary", f"Selected schema: {schema_id} (difficulty: {difficulty})")
    
    def on_stage_start(self, stage: str, info: str):
        """Callback when a stage starts."""
        self.append_to_stage(stage, f"\n[{datetime.now().strftime('%H:%M:%S')}] START: {info}")
        self.append_to_stage("Summary", f"→ {stage}: {info}")
    
    def on_stage_progress(self, stage: str, info: str):
        """Callback for stage progress updates."""
        self.append_to_stage(stage, f"  [{datetime.now().strftime('%H:%M:%S')}] {info}")
    
    def on_stage_complete(self, stage: str, output: Any):
        """Callback when a stage completes."""
        import yaml
        
        self.append_to_stage(stage, f"\n[{datetime.now().strftime('%H:%M:%S')}] COMPLETE")
        
        # Format output based on stage
        if stage == "Designer":
            self.append_to_stage(stage, "\nDesigner Output (YAML):")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Graph Decision":
            self.append_to_stage(stage, f"\nGraph Decision: {output}")
        
        elif stage == "Template Selector":
            self.append_to_stage(stage, "\nTemplate Selector Output (YAML):")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Implementer":
            self.append_to_stage(stage, "\nImplementer Output:")
            q_pkg = output.get("question", {}) if isinstance(output, dict) else {}
            if q_pkg:
                self.append_to_stage(stage, f"Stem: {q_pkg.get('stem', '')[:200]}...")
                self.append_to_stage(stage, f"Options: {list(q_pkg.get('options', {}).keys())}")
            
            # Show graph_intent if present
            if "_graph_intent" in output:
                self.append_to_stage(stage, "\nGraph Intent:")
                try:
                    yaml_str = yaml.safe_dump(output["_graph_intent"], sort_keys=False, default_flow_style=False, allow_unicode=True)
                    self.append_to_stage(stage, yaml_str)
                except:
                    self.append_to_stage(stage, str(output["_graph_intent"]))
        
        elif stage == "Graph Generation" or stage == "Graph Regen":
            self.append_to_stage(stage, f"\nGraph Generation Result:")
            if isinstance(output, dict):
                try:
                    yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                    self.append_to_stage(stage, yaml_str)
                except:
                    self.append_to_stage(stage, str(output))
            else:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Verifier":
            self.append_to_stage(stage, "\nVerifier Report:")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Style Checker":
            self.append_to_stage(stage, "\nStyle Checker Report:")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        else:
            # Generic output
            try:
                if isinstance(output, dict):
                    yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                    self.append_to_stage(stage, yaml_str)
                else:
                    self.append_to_stage(stage, str(output))
            except:
                self.append_to_stage(stage, str(output))
        
        self.append_to_stage("Summary", f"✓ {stage} complete")
    
    def on_stage_error(self, stage: str, error: str):
        """Callback when a stage errors."""
        self.append_to_stage(stage, f"\n[{datetime.now().strftime('%H:%M:%S')}] ERROR: {error}")
        self.append_to_stage("Summary", f"✗ {stage} error: {error}")


def main():
    """Main entry point."""
    root = tk.Tk()
    app = DemoGeneratorUI(root)
    root.mainloop()


if __name__ == "__main__":
    from datetime import datetime
    main()




"""
Demo Generator for TMUA Questions

Generates questions for specific schemas with detailed pipeline output display.
Shows all stages: Designer, Implementer, Verifier, Style Checker, etc.
"""

import os
import sys
import json
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from pathlib import Path
from typing import Dict, Any, Optional
import threading

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
    RunConfig, ModelsConfig, run_once, parse_schemas_from_markdown, read_text,
    safe_load_dotenv, choose_difficulty, get_default_models_config
)

# Import database sync (optional)
try:
    from db_sync import sync_question_from_pipeline
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False


class DemoGeneratorUI:
    """Tkinter UI for demo generation with detailed pipeline output."""
    
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("TMUA Question Generator - Demo Mode")
        self.root.geometry("1400x900")
        
        # Generation state
        self.is_generating = False
        self.generation_thread = None
        self.current_schema = None
        self.current_mode = None
        
        # Setup UI
        self.setup_ui()
        
    def setup_ui(self):
        """Setup the UI components."""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # Control panel (left)
        control_frame = ttk.LabelFrame(main_frame, text="Generation Control", padding="10")
        control_frame.grid(row=0, column=0, rowspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), padx=(0, 10))
        
        # Schema selection
        ttk.Label(control_frame, text="Target Schemas:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.schema_var = tk.StringVar(value="M_6abc19f7, M_574bb542")
        schema_entry = ttk.Entry(control_frame, textvariable=self.schema_var, width=30)
        schema_entry.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=5)
        
        # Mode selection
        ttk.Label(control_frame, text="Variation Modes:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.mode_var = tk.StringVar(value="FAR,SIBLING")
        mode_entry = ttk.Entry(control_frame, textvariable=self.mode_var, width=30)
        mode_entry.grid(row=3, column=0, sticky=(tk.W, tk.E), pady=5)
        ttk.Label(control_frame, text="(Comma-separated: FAR, SIBLING)", font=("TkDefaultFont", 8)).grid(row=4, column=0, sticky=tk.W)
        
        # Start button
        self.start_button = ttk.Button(control_frame, text="Start Generation", command=self.start_generation)
        self.start_button.grid(row=5, column=0, pady=20, sticky=(tk.W, tk.E))
        
        # Stop button
        self.stop_button = ttk.Button(control_frame, text="Stop", command=self.stop_generation, state=tk.DISABLED)
        self.stop_button.grid(row=6, column=0, pady=5, sticky=(tk.W, tk.E))
        
        # Status
        self.status_label = ttk.Label(control_frame, text="Ready", foreground="green")
        self.status_label.grid(row=7, column=0, pady=10)
        
        # Progress
        self.progress_var = tk.StringVar(value="0/0")
        ttk.Label(control_frame, text="Progress:").grid(row=8, column=0, sticky=tk.W)
        ttk.Label(control_frame, textvariable=self.progress_var).grid(row=9, column=0, sticky=tk.W)
        
        # Output display (right)
        output_frame = ttk.LabelFrame(main_frame, text="Pipeline Output", padding="10")
        output_frame.grid(row=0, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        output_frame.columnconfigure(0, weight=1)
        output_frame.rowconfigure(0, weight=1)
        
        # Create notebook for tabs
        self.notebook = ttk.Notebook(output_frame)
        self.notebook.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Create tabs for each stage
        self.stage_tabs = {}
        stages = ["Designer", "Graph Decision", "Template Selector", "Implementer", "Graph Generation", 
                  "Verifier", "Style Checker", "KaTeX Validator", "Final Output"]
        
        for stage in stages:
            frame = ttk.Frame(self.notebook)
            self.notebook.add(frame, text=stage)
            
            # Text widget with scrollbar
            text_frame = ttk.Frame(frame)
            text_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
            frame.columnconfigure(0, weight=1)
            frame.rowconfigure(0, weight=1)
            
            text_widget = scrolledtext.ScrolledText(text_frame, wrap=tk.WORD, width=80, height=30)
            text_widget.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
            text_frame.columnconfigure(0, weight=1)
            text_frame.rowconfigure(0, weight=1)
            
            self.stage_tabs[stage] = text_widget
        
        # Summary tab
        summary_frame = ttk.Frame(self.notebook)
        self.notebook.add(summary_frame, text="Summary")
        summary_text = scrolledtext.ScrolledText(summary_frame, wrap=tk.WORD, width=80, height=30)
        summary_text.pack(fill=tk.BOTH, expand=True)
        self.stage_tabs["Summary"] = summary_text
        
    def append_to_stage(self, stage: str, text: str):
        """Append text to a stage tab."""
        if stage in self.stage_tabs:
            widget = self.stage_tabs[stage]
            widget.insert(tk.END, text + "\n")
            widget.see(tk.END)
            self.root.update_idletasks()
    
    def clear_stage(self, stage: str):
        """Clear a stage tab."""
        if stage in self.stage_tabs:
            self.stage_tabs[stage].delete(1.0, tk.END)
    
    def clear_all_stages(self):
        """Clear all stage tabs."""
        for stage in self.stage_tabs:
            self.clear_stage(stage)
    
    def start_generation(self):
        """Start the generation process."""
        if self.is_generating:
            return
        
        # Parse schemas and modes
        schema_str = self.schema_var.get().strip()
        mode_str = self.mode_var.get().strip()
        
        schemas = [s.strip() for s in schema_str.split(",") if s.strip()]
        modes = [m.strip().upper() for m in mode_str.split(",") if m.strip()]
        
        if not schemas:
            messagebox.showerror("Error", "Please specify at least one schema ID")
            return
        
        if not modes:
            messagebox.showerror("Error", "Please specify at least one variation mode (FAR or SIBLING)")
            return
        
        # Clear previous output
        self.clear_all_stages()
        
        # Update UI state
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.is_generating = True
        self.status_label.config(text="Generating...", foreground="blue")
        
        # Start generation in thread
        self.generation_thread = threading.Thread(
            target=self.run_generation,
            args=(schemas, modes),
            daemon=True
        )
        self.generation_thread.start()
    
    def stop_generation(self):
        """Stop the generation process."""
        self.is_generating = False
        self.status_label.config(text="Stopped", foreground="orange")
        self.start_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.DISABLED)
    
    def run_generation(self, schemas: list, modes: list):
        """Run the generation process."""
        try:
            # Setup
            base_dir = Path(__file__).parent
            project_root = base_dir.parent.parent
            env_path = project_root / ".env.local"
            
            self.append_to_stage("Summary", f"Setup: base_dir = {base_dir}")
            self.append_to_stage("Summary", f"Setup: project_root = {project_root}")
            self.append_to_stage("Summary", f"Setup: env_path = {env_path}")
            self.append_to_stage("Summary", f"Setup: env_path.exists() = {env_path.exists()}")
            
            if env_path.exists() and env_path.is_file():
                self.append_to_stage("Summary", f"Loading .env.local from: {env_path}")
                result = safe_load_dotenv(str(env_path))
                if not result:
                    self.append_to_stage("Summary", f"⚠ Warning: Failed to load .env.local (may use existing env vars)")
            else:
                self.append_to_stage("Summary", f"⚠ Warning: .env.local not found at {env_path}")
                # Try loading from project root directly (if .env.local doesn't exist)
                env_path_alt = project_root / ".env"
                if env_path_alt.exists() and env_path_alt.is_file():
                    self.append_to_stage("Summary", f"Trying .env instead: {env_path_alt}")
                    safe_load_dotenv(str(env_path_alt))
                else:
                    self.append_to_stage("Summary", f"⚠ Warning: No .env or .env.local found. Using existing environment variables.")
            
            # Check if GEMINI_API_KEY is set
            api_key = os.environ.get("GEMINI_API_KEY", "").strip()
            if not api_key:
                error_msg = "ERROR: GEMINI_API_KEY not found in environment. Please check .env.local file."
                self.append_to_stage("Summary", error_msg)
                messagebox.showerror("Configuration Error", error_msg)
                return
            else:
                self.append_to_stage("Summary", f"✓ GEMINI_API_KEY found (length: {len(api_key)})")
            
            models = get_default_models_config()
            cfg = RunConfig(
                max_designer_retries=3,
                max_implementer_regen=2,
                max_format_fix=2,
                max_style_regen=2,
                seed=None,
                enable_tag_labeling=False,  # Disable for demo
                allow_schema_prefixes=("M",),
            )
            
            # Load schemas
            scripts_dir = base_dir.parent
            esat_schemas_dir = scripts_dir / "esat_question_generator" / "schemas"
            schemas_paper1_path = esat_schemas_dir / "Schemas_TMUA_Paper1.md"
            
            self.append_to_stage("Summary", f"Loading schemas from: {schemas_paper1_path}")
            
            if not schemas_paper1_path.exists():
                error_msg = f"ERROR: Schema file not found: {schemas_paper1_path}"
                self.append_to_stage("Summary", error_msg)
                messagebox.showerror("File Not Found", error_msg)
                return
            
            try:
                schemas_md = read_text(schemas_paper1_path)
                self.append_to_stage("Summary", f"✓ Schema file loaded ({len(schemas_md)} characters)")
                all_schemas = parse_schemas_from_markdown(schemas_md, allow_prefixes=("M",))
                self.append_to_stage("Summary", f"✓ Parsed {len(all_schemas)} schemas from file")
            except Exception as e:
                error_msg = f"ERROR: Failed to load/parse schema file: {str(e)}"
                self.append_to_stage("Summary", error_msg)
                import traceback
                self.append_to_stage("Summary", traceback.format_exc())
                messagebox.showerror("Schema Load Error", error_msg)
                return
            
            # Verify requested schemas exist
            missing = [s for s in schemas if s not in all_schemas]
            if missing:
                error_msg = f"ERROR: Schemas not found: {missing}\nAvailable schemas: {list(all_schemas.keys())[:10]}..."
                self.append_to_stage("Summary", error_msg)
                messagebox.showerror("Schema Not Found", error_msg)
                return
            
            total_questions = len(schemas) * len(modes)
            completed = 0
            
            self.append_to_stage("Summary", f"Starting generation for {len(schemas)} schemas × {len(modes)} modes = {total_questions} questions")
            self.append_to_stage("Summary", f"Schemas: {', '.join(schemas)}")
            self.append_to_stage("Summary", f"Modes: {', '.join(modes)}")
            self.append_to_stage("Summary", "=" * 70)
            
            # Generate for each schema × mode combination
            for schema_id in schemas:
                if not self.is_generating:
                    break
                
                for mode in modes:
                    if not self.is_generating:
                        break
                    
                    completed += 1
                    self.progress_var.set(f"{completed}/{total_questions}")
                    self.current_schema = schema_id
                    self.current_mode = mode
                    
                    self.append_to_stage("Summary", f"\n[{completed}/{total_questions}] Generating {schema_id} ({mode})")
                    self.append_to_stage("Summary", "-" * 70)
                    
                    # Create callbacks for detailed output (fix closure by capturing current values)
                    current_schema = schema_id
                    current_mode = mode
                    
                    def make_callback(callback_name):
                        def callback(*args, **kwargs):
                            getattr(self, callback_name)(*args, **kwargs)
                        return callback
                    
                    callbacks = {
                        "on_schema_selected": lambda sid, diff: self.on_schema_selected(sid, diff),
                        "on_stage_start": lambda stage, info: self.on_stage_start(stage, info),
                        "on_stage_progress": lambda stage, info: self.on_stage_progress(stage, info),
                        "on_stage_complete": lambda stage, output: self.on_stage_complete(stage, output),
                        "on_stage_error": lambda stage, error: self.on_stage_error(stage, error),
                    }
                    
                    # Force schema and mode
                    try:
                        # Monkey-patch select_variation_mode to force the desired mode
                        import project as project_module
                        original_select = project_module.select_variation_mode
                        
                        # Capture mode in closure
                        forced_mode = current_mode
                        def forced_select_variation_mode(base_dir):
                            return forced_mode
                        
                        project_module.select_variation_mode = forced_select_variation_mode
                        
                        try:
                            result = run_once(
                                base_dir=str(base_dir),
                                cfg=cfg,
                                models=models,
                                callbacks=callbacks,
                                forced_schema_id=schema_id,
                                curriculum_parser=None,
                            )
                        finally:
                            # Restore original function
                            project_module.select_variation_mode = original_select
                        
                        if result.get("status") == "accepted":
                            self.append_to_stage("Summary", f"✓ {schema_id} ({mode}) - ACCEPTED")
                            
                            # Show final output
                            if "item" in result:
                                item = result["item"]
                                self.append_to_stage("Final Output", f"\n{'='*70}")
                                self.append_to_stage("Final Output", f"Schema: {schema_id} | Mode: {mode}")
                                self.append_to_stage("Final Output", f"{'='*70}\n")
                                
                                # Show question
                                q_pkg = item.get("question_package", {})
                                question = q_pkg.get("question", {})
                                self.append_to_stage("Final Output", "QUESTION:")
                                self.append_to_stage("Final Output", question.get("stem", ""))
                                self.append_to_stage("Final Output", "\nOPTIONS:")
                                for opt, text in question.get("options", {}).items():
                                    correct = "✓" if opt == question.get("correct_option") else " "
                                    self.append_to_stage("Final Output", f"  {correct} {opt}: {text}")
                                
                                # Show solution
                                solution = q_pkg.get("solution", {})
                                self.append_to_stage("Final Output", "\nSOLUTION:")
                                self.append_to_stage("Final Output", solution.get("reasoning", ""))
                                
                                # Show graphs if present
                                if item.get("graphs"):
                                    self.append_to_stage("Final Output", "\nQUESTION GRAPHS:")
                                    self.append_to_stage("Final Output", json.dumps(item.get("graphs"), indent=2))
                                
                                if item.get("solution_graphs"):
                                    self.append_to_stage("Final Output", "\nSOLUTION GRAPHS:")
                                    self.append_to_stage("Final Output", json.dumps(item.get("solution_graphs"), indent=2))
                        else:
                            self.append_to_stage("Summary", f"✗ {schema_id} ({mode}) - {result.get('status', 'UNKNOWN')}")
                    
                    except Exception as e:
                        error_msg = f"✗ {schema_id} ({mode}) - ERROR: {str(e)}"
                        self.append_to_stage("Summary", error_msg)
                        import traceback
                        full_traceback = traceback.format_exc()
                        self.append_to_stage("Summary", f"Full traceback for {schema_id} ({mode}):")
                        self.append_to_stage("Summary", full_traceback)
                        # Also append to the relevant stage tab if we know which stage failed
                        if self.current_schema == schema_id and self.current_mode == mode:
                            self.append_to_stage("Summary", f"Error occurred during generation of {schema_id} ({mode})")
            
            # Final status
            if self.is_generating:
                self.status_label.config(text="Complete", foreground="green")
                self.append_to_stage("Summary", "\n" + "=" * 70)
                self.append_to_stage("Summary", f"Generation complete: {completed}/{total_questions} questions")
            
        except Exception as e:
            error_msg = f"FATAL ERROR: {str(e)}"
            self.append_to_stage("Summary", error_msg)
            import traceback
            full_traceback = traceback.format_exc()
            self.append_to_stage("Summary", "\nFull traceback:")
            self.append_to_stage("Summary", full_traceback)
            self.status_label.config(text="Error", foreground="red")
            # Also show in a popup
            messagebox.showerror("Fatal Error", f"{error_msg}\n\nCheck the Summary tab for full details.")
        finally:
            self.is_generating = False
            self.start_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
    
    def on_schema_selected(self, schema_id: str, difficulty: str):
        """Callback when schema is selected."""
        self.append_to_stage("Summary", f"Selected schema: {schema_id} (difficulty: {difficulty})")
    
    def on_stage_start(self, stage: str, info: str):
        """Callback when a stage starts."""
        self.append_to_stage(stage, f"\n[{datetime.now().strftime('%H:%M:%S')}] START: {info}")
        self.append_to_stage("Summary", f"→ {stage}: {info}")
    
    def on_stage_progress(self, stage: str, info: str):
        """Callback for stage progress updates."""
        self.append_to_stage(stage, f"  [{datetime.now().strftime('%H:%M:%S')}] {info}")
    
    def on_stage_complete(self, stage: str, output: Any):
        """Callback when a stage completes."""
        import yaml
        
        self.append_to_stage(stage, f"\n[{datetime.now().strftime('%H:%M:%S')}] COMPLETE")
        
        # Format output based on stage
        if stage == "Designer":
            self.append_to_stage(stage, "\nDesigner Output (YAML):")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Graph Decision":
            self.append_to_stage(stage, f"\nGraph Decision: {output}")
        
        elif stage == "Template Selector":
            self.append_to_stage(stage, "\nTemplate Selector Output (YAML):")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Implementer":
            self.append_to_stage(stage, "\nImplementer Output:")
            q_pkg = output.get("question", {}) if isinstance(output, dict) else {}
            if q_pkg:
                self.append_to_stage(stage, f"Stem: {q_pkg.get('stem', '')[:200]}...")
                self.append_to_stage(stage, f"Options: {list(q_pkg.get('options', {}).keys())}")
            
            # Show graph_intent if present
            if "_graph_intent" in output:
                self.append_to_stage(stage, "\nGraph Intent:")
                try:
                    yaml_str = yaml.safe_dump(output["_graph_intent"], sort_keys=False, default_flow_style=False, allow_unicode=True)
                    self.append_to_stage(stage, yaml_str)
                except:
                    self.append_to_stage(stage, str(output["_graph_intent"]))
        
        elif stage == "Graph Generation" or stage == "Graph Regen":
            self.append_to_stage(stage, f"\nGraph Generation Result:")
            if isinstance(output, dict):
                try:
                    yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                    self.append_to_stage(stage, yaml_str)
                except:
                    self.append_to_stage(stage, str(output))
            else:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Verifier":
            self.append_to_stage(stage, "\nVerifier Report:")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        elif stage == "Style Checker":
            self.append_to_stage(stage, "\nStyle Checker Report:")
            try:
                yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                self.append_to_stage(stage, yaml_str)
            except:
                self.append_to_stage(stage, str(output))
        
        else:
            # Generic output
            try:
                if isinstance(output, dict):
                    yaml_str = yaml.safe_dump(output, sort_keys=False, default_flow_style=False, allow_unicode=True)
                    self.append_to_stage(stage, yaml_str)
                else:
                    self.append_to_stage(stage, str(output))
            except:
                self.append_to_stage(stage, str(output))
        
        self.append_to_stage("Summary", f"✓ {stage} complete")
    
    def on_stage_error(self, stage: str, error: str):
        """Callback when a stage errors."""
        self.append_to_stage(stage, f"\n[{datetime.now().strftime('%H:%M:%S')}] ERROR: {error}")
        self.append_to_stage("Summary", f"✗ {stage} error: {error}")


def main():
    """Main entry point."""
    root = tk.Tk()
    app = DemoGeneratorUI(root)
    root.mainloop()


if __name__ == "__main__":
    from datetime import datetime
    main()
