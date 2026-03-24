#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database Migration CLI for TMUA Question Generator

This script applies database migrations to add missing columns:
- graphs, solution_graphs
- primary_tag, secondary_tags, tags_confidence, tags_labeled_at, tags_labeled_by
- test_type
- Updates paper constraint to allow Paper1/Paper2
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

# Try to import psycopg2
try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("ERROR: psycopg2 not installed. Installing...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    except ImportError:
        print("ERROR: Failed to install psycopg2. Please install manually:")
        print("  pip install psycopg2-binary")
        sys.exit(1)


def get_db_connection():
    """Get database connection from environment variables."""
    # Try DATABASE_URL first (direct connection)
    db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    
    if db_url:
        try:
            conn = psycopg2.connect(db_url)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            return conn
        except Exception as e:
            print(f"Warning: Could not connect using DATABASE_URL: {e}")
    
    # Try constructing from Supabase URL
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url:
        print("ERROR: Neither DATABASE_URL nor SUPABASE_URL found!")
        print("\nPlease provide one of:")
        print("  1. DATABASE_URL - Direct PostgreSQL connection string")
        print("  2. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY")
        print("\nYou can find DATABASE_URL in Supabase Dashboard -> Settings -> Database")
        sys.exit(1)
    
    # Extract project ref from URL
    import re
    match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
    if not match:
        print("ERROR: Could not parse Supabase URL")
        sys.exit(1)
    
    project_ref = match.group(1)
    
    # Try to get password from environment or prompt
    db_password = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("DATABASE_PASSWORD")
    
    if not db_password:
        print("ERROR: Database password not found!")
        print("Please set SUPABASE_DB_PASSWORD or DATABASE_PASSWORD in .env.local")
        print("You can find it in Supabase Dashboard -> Settings -> Database")
        sys.exit(1)
    
    # Construct connection string
    # Format: postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
    # For local Supabase: postgresql://postgres:postgres@localhost:54322/postgres
    db_url = os.getenv("SUPABASE_DB_URL") or f"postgresql://postgres.{project_ref}:{db_password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
    
    try:
        conn = psycopg2.connect(db_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        print(f"ERROR: Could not connect to database: {e}")
        print("\nTrying alternative: local Supabase connection...")
        # Try local Supabase
        local_url = "postgresql://postgres:postgres@localhost:54322/postgres"
        try:
            conn = psycopg2.connect(local_url)
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            return conn
        except Exception as e2:
            print(f"ERROR: Could not connect to local Supabase either: {e2}")
            print("\nPlease provide DATABASE_URL in .env.local")
            sys.exit(1)


def apply_migration():
    """Apply the migration to add missing columns."""
    print("=" * 70)
    print("  Applying Database Migration: Add TMUA Fields")
    print("=" * 70)
    print()
    
    # Read migration file
    migration_file = project_root / "supabase" / "migrations" / "20250115000000_add_tmua_fields_complete.sql"
    
    if not migration_file.exists():
        print(f"ERROR: Migration file not found: {migration_file}")
        sys.exit(1)
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    print("Connecting to database...")
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        print("Applying migration...")
        cur.execute(sql)
        print("✓ Migration applied successfully!")
        print()
        
        # Verify columns exist
        print("Verifying columns...")
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ai_generated_questions'
            AND column_name IN ('graphs', 'solution_graphs', 'primary_tag', 'secondary_tags', 
                                'tags_confidence', 'tags_labeled_at', 'tags_labeled_by', 'test_type')
            ORDER BY column_name;
        """)
        
        columns = cur.fetchall()
        if columns:
            print("\n✓ Verified columns exist:")
            for col_name, col_type in columns:
                print(f"  - {col_name}: {col_type}")
        else:
            print("⚠ Warning: Could not verify columns (they may already exist)")
        
        # Check paper constraint
        print("\nChecking paper constraint...")
        cur.execute("""
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name = 'paper_check';
        """)
        constraint = cur.fetchone()
        if constraint:
            print(f"✓ Paper constraint exists: {constraint[0]}")
            print(f"  Check: {constraint[1]}")
        else:
            print("⚠ Warning: Could not find paper_check constraint")
        
        cur.close()
        conn.close()
        
        print("\n" + "=" * 70)
        print("  Migration Complete!")
        print("=" * 70)
        print("\nYou can now sync questions with graphs and tags to the database.")
        
    except Exception as e:
        print(f"\n✗ ERROR applying migration: {e}")
        import traceback
        traceback.print_exc()
        cur.close()
        conn.close()
        sys.exit(1)


if __name__ == "__main__":
    apply_migration()






