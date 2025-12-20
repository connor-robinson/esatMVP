#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Question Generation

Runs question generation using the worker manager.
"""

import os
import sys
import time
import traceback
from pathlib import Path
from worker_manager import WorkerManager, RunConfig, ModelsConfig, SystematicGenerationConfig, load_schema_coverage
from project import safe_load_dotenv

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        # Python 3.7+
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for older Python versions
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Simple callbacks for console output (optional)
def progress_callback(successful: int, target: int):
    """Optional callback for console progress output."""
    # Can print to console if needed, but no file I/O
    pass

def status_callback(status_update: dict):
    """Optional callback for status updates."""
    # No-op - no status file needed
    pass


def main():
    """Main entry point."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Load environment - look for .env.local in project root (2 levels up from script)
    # Script is at: project_root/scripts/esat_question_generator/generate_with_progress.py
    # So project_root is 2 levels up
    project_root = os.path.dirname(os.path.dirname(base_dir))
    env_path = os.path.join(project_root, ".env.local")
    
    # Also try in the script directory
    if not os.path.exists(env_path):
        env_path = os.path.join(base_dir, ".env.local")
    
    # Load environment
    safe_load_dotenv(env_path)
    
    # Also try loading from base_dir if not found
    if not os.path.exists(env_path):
        safe_load_dotenv(os.path.join(base_dir, ".env.local"))

    # Validate API key before starting
    # Check multiple sources for the API key
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    
    # Check for API key (minimal output)
    if not api_key:
        # Also check if it's in the loaded .env file
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.strip().startswith('GEMINI_API_KEY=') and not line.strip().startswith('#'):
                            api_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                            # Also set it in os.environ for this process
                            os.environ['GEMINI_API_KEY'] = api_key
                            break
            except Exception:
                pass
    
    if not api_key:
        error_msg = "ERROR: GEMINI_API_KEY environment variable is missing or empty!"
        print(f"\n{'='*70}", file=sys.stderr)
        print(error_msg, file=sys.stderr)
        print(f"Current working directory: {os.getcwd()}", file=sys.stderr)
        print(f"Script directory: {base_dir}", file=sys.stderr)
        print(f"Project root: {project_root}", file=sys.stderr)
        print(f"Looking for .env.local at: {env_path}", file=sys.stderr)
        print(f".env.local exists: {os.path.exists(env_path)}", file=sys.stderr)
        print(f"Environment variables with 'GEMINI' in name:", file=sys.stderr)
        for key in os.environ.keys():
            if 'GEMINI' in key.upper():
                print(f"  - {key}: {'*' * min(len(os.environ[key]), 10)}", file=sys.stderr)
        print(f"{'='*70}\n", file=sys.stderr)
        print(f"ERROR: {error_msg}", file=sys.stderr)
        sys.exit(1)
    
    # Test API key before starting generation (silent - only show errors)
    try:
        from project import LLMClient
        test_client = LLMClient(api_key=api_key)
        test_response = test_client.client.models.generate_content(
            model="gemini-2.5-flash",
            contents="Say 'test' if you can read this.",
            config={"temperature": 0.1}
        )
    except Exception as test_error:
        error_str = str(test_error)
        if "403" in error_str or "PERMISSION_DENIED" in error_str or "leaked" in error_str.lower():
            error_msg = f"API key is invalid or revoked: {error_str[:200]}"
            print(f"ERROR: {error_msg}", file=sys.stderr)
            sys.exit(1)
        else:
            # Other errors during API test - log but don't fail (might be network issue)
            print(f"WARNING: API key test had an issue (continuing anyway): {error_str[:200]}", file=sys.stderr)
    
    # Configuration
    max_workers = int(os.environ.get("MAX_WORKERS", "8"))  # Default to max workers
    n_questions = int(os.environ.get("N_ITEMS", "10"))
    generation_mode = os.environ.get("GENERATION_MODE", "systematic")  # Default to systematic
    questions_per_schema = int(os.environ.get("QUESTIONS_PER_SCHEMA", "10"))
    category_order = os.environ.get("CATEGORY_ORDER", "M,P,B,C").split(",")
    
    # Find schema_coverage.json path
    # Look in: scripts/schema_generator/_cache/schema_coverage.json (relative to project root)
    project_root = os.path.dirname(os.path.dirname(base_dir))
    schema_coverage_path = os.path.join(project_root, "schema_generator", "_cache", "schema_coverage.json")
    if not os.path.exists(schema_coverage_path):
        # Try alternative path
        schema_coverage_path = os.path.join(base_dir, "..", "schema_generator", "_cache", "schema_coverage.json")
        schema_coverage_path = os.path.normpath(schema_coverage_path)
    
    # Load schema coverage to calculate total questions needed
    schema_coverage = load_schema_coverage(schema_coverage_path) if os.path.exists(schema_coverage_path) else {}

    # Print startup message
    print("Starting question generation...", file=sys.stderr)
    print(f"Working directory: {os.getcwd()}", file=sys.stderr)
    print(f"Script directory: {base_dir}", file=sys.stderr)
    print(f"Schema coverage path: {schema_coverage_path}", file=sys.stderr)
    print(f"Schema coverage exists: {os.path.exists(schema_coverage_path)}", file=sys.stderr)
    print(f"Generation mode: {generation_mode}", file=sys.stderr)
    print(f"Max workers: {max_workers}", file=sys.stderr)

    cfg = RunConfig(
        max_implementer_retries=int(os.environ.get("MAX_IMPLEMENTER_RETRIES", "2")),
        max_designer_retries=int(os.environ.get("MAX_DESIGNER_RETRIES", "2")),
        seed=int(os.environ["SEED"]) if os.environ.get("SEED") else None,
        difficulty_weights={
            "Easy": float(os.environ.get("W_EASY", "0.3")),
            "Medium": float(os.environ.get("W_MED", "0.5")),
            "Hard": float(os.environ.get("W_HARD", "0.2")),
        },
        schema_weights=None,
        out_dir=os.environ.get("OUT_DIR", "runs"),
        allow_schema_prefixes=tuple(os.environ.get("SCHEMA_PREFIXES", "M,P").split(",")),
    )

    models = ModelsConfig(
        designer=os.environ.get("MODEL_DESIGNER", "gemini-3-pro-preview"),
        implementer=os.environ.get("MODEL_IMPLEMENTER", "gemini-3-pro-preview"),
        verifier=os.environ.get("MODEL_VERIFIER", "gemini-3-pro-preview"),
        style_judge=os.environ.get("MODEL_STYLE", "gemini-2.5-flash"),
    )
    
    # Systematic generation config
    systematic_config = SystematicGenerationConfig(
        mode=generation_mode,
        category_order=category_order,
        questions_per_schema=questions_per_schema,
        schema_coverage_path=schema_coverage_path if os.path.exists(schema_coverage_path) else None
    )

    try:
        # Create worker manager
        manager = WorkerManager(base_dir, cfg, models, max_workers=max_workers, systematic_config=systematic_config)

        # Generate questions
        # Set max_failures from environment or default to 20
        max_failures = int(os.environ.get("MAX_FAILURES", "20"))
        
        # In systematic mode, calculate total from schema targets
        if generation_mode == "systematic" and manager.schema_targets:
            total_needed = sum(manager.schema_targets.values())
        else:
            total_needed = n_questions
        
        results = manager.generate_questions(
            total_needed, 
            progress_callback=progress_callback,
            status_callback=status_callback,
            max_failures=max_failures
        )

        # Print completion message
        if generation_mode == "random":
            final_total = n_questions
        else:
            # Calculate total from schema targets
            final_total = sum(manager.schema_targets.values()) if manager.schema_targets else (len(manager.schema_list) * questions_per_schema if manager.schema_list else n_questions)
        
        print(f"Generation completed! {manager.stats.successful}/{final_total} successful questions generated ({manager.stats.total_questions} total attempts, {manager.stats.failed} failed)")

        # Always exit with 0 - failures are tracked in the status, not exit code
        # This allows the API route to distinguish between script crashes and completed runs with failures
        sys.exit(0)

    except KeyboardInterrupt:
        print("\nGeneration interrupted by user", file=sys.stderr)
        sys.exit(130)  # Standard exit code for Ctrl+C
    except Exception as e:
        # Print error and exit
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in generation: {e}", file=sys.stderr)
        print(f"Error type: {type(e).__name__}", file=sys.stderr)
        print("Full traceback:", file=sys.stderr)
        print(error_trace, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

