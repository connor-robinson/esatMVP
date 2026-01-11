#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run script for Question Review Application

Checks dependencies and environment, then launches the app.
"""

import sys
import os
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed."""
    missing = []
    
    try:
        import supabase
    except ImportError:
        missing.append("supabase")
    
    try:
        from dotenv import load_dotenv
    except ImportError:
        missing.append("python-dotenv")
    
    # tkinterweb is optional
    try:
        import tkinterweb
    except ImportError:
        print("Warning: tkinterweb not installed. Math rendering will be limited.")
        print("Install with: pip install tkinterweb")
    
    if missing:
        print("Error: Missing required dependencies:")
        for dep in missing:
            print(f"  - {dep}")
        print("\nInstall with:")
        print(f"  pip install {' '.join(missing)}")
        print("\nOr install all requirements:")
        print("  pip install -r requirements_review_app.txt")
        return False
    
    return True

def check_environment():
    """Check if environment variables are set."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    env_path = project_root / ".env.local"
    
    if not env_path.exists():
        print(f"Warning: .env.local file not found at {env_path}")
        print("The app will try to use environment variables directly.")
        return True
    
    # Try loading .env.local
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path)
    except ImportError:
        pass
    
    # Check for required variables
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url:
        print("Warning: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL not found in environment")
    if not supabase_key:
        print("Warning: SUPABASE_SERVICE_ROLE_KEY not found in environment")
    
    if not supabase_url or not supabase_key:
        print("\nPlease set these environment variables or add them to .env.local:")
        print("  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)")
        print("  SUPABASE_SERVICE_ROLE_KEY")
        print("\nThe app may still work if variables are set elsewhere.")
    
    return True

def main():
    """Main entry point."""
    print("Question Review Application")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Check environment
    check_environment()
    
    print("\nStarting application...\n")
    
    # Import and run the app
    try:
        from question_review.app import main as app_main
        app_main()
    except KeyboardInterrupt:
        print("\n\nApplication interrupted by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError starting application: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
























