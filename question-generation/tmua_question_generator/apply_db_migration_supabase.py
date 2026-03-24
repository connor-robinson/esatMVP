#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Migration CLI for TMUA Question Generator (Supabase Client Version)

This script applies database migrations using the Supabase Python client.
It uses the Supabase RPC function or direct SQL execution to add missing columns.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Try to load .env.local from multiple locations
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
env_paths = [
    project_root / ".env.local",
    script_dir / ".env.local",
    Path(".env.local"),
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        break

# Try to import supabase
try:
    from supabase import create_client
except ImportError:
    print("ERROR: supabase-py not installed. Installing...")
    os.system(f"{sys.executable} -m pip install supabase")
    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: Failed to install supabase-py. Please install manually:")
        print("  pip install supabase")
        sys.exit(1)


def apply_migration_via_supabase():
    """Apply migration using Supabase client (executes SQL via RPC or direct query)."""
    print("=" * 70)
    print("  Applying Database Migration: Add TMUA Fields")
    print("=" * 70)
    print()
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: Missing Supabase credentials!")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)
    
    print("Connecting to Supabase...")
    client = create_client(supabase_url, supabase_key)
    
    # Read migration file
    migration_file = project_root / "supabase" / "migrations" / "20250115000000_add_tmua_fields_complete.sql"
    
    if not migration_file.exists():
        print(f"ERROR: Migration file not found: {migration_file}")
        sys.exit(1)
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # Split SQL into individual statements
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    print(f"Executing {len(statements)} SQL statements...")
    
    # Execute each statement
    # Note: Supabase Python client doesn't directly support raw SQL execution
    # We need to use psycopg2 or provide instructions for using Supabase CLI
    
    print("\n⚠ WARNING: Supabase Python client cannot execute raw SQL directly.")
    print("\nPlease use one of these methods:")
    print("\n1. Use Supabase CLI (Recommended):")
    print(f"   cd {project_root}")
    print("   npx supabase db push")
    print("\n2. Use Supabase Dashboard:")
    print("   - Go to https://supabase.com/dashboard")
    print("   - Select your project")
    print("   - Go to SQL Editor")
    print("   - Paste the SQL from the migration file")
    print("   - Run it")
    print("\n3. Use direct PostgreSQL connection:")
    print("   python apply_db_migration.py")
    print("   (Requires DATABASE_URL or SUPABASE_DB_PASSWORD)")
    
    # Try to provide the SQL for manual execution
    print("\n" + "=" * 70)
    print("  SQL Migration (Copy this to Supabase SQL Editor)")
    print("=" * 70)
    print()
    print(sql)
    print()
    print("=" * 70)
    
    return False  # Indicates manual execution needed


if __name__ == "__main__":
    success = apply_migration_via_supabase()
    if not success:
        sys.exit(1)






