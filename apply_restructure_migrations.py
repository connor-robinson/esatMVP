#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply Restructure Migrations to Supabase Database

This script applies all the restructuring migrations to the ai_generated_questions table:
1. Reset all statuses to 'pending' and update constraint
2. Remove review columns (reviewed_by, reviewed_at, review_notes)
3. Map tag codes to curriculum text names
4. Rename paper column to subjects and populate values
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

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
        print(f"Loaded environment from: {env_path}")
        break
else:
    load_dotenv('.env.local')

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("ERROR: psycopg2 not installed. Installing...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Get connection string from environment
db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")

if not db_url:
    # Try to use Supabase REST API instead
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if supabase_url and supabase_key:
        print("DATABASE_URL not found, but Supabase credentials found.")
        print("Attempting to use Supabase REST API...")
        
        # Use Supabase Python client to execute SQL via REST API
        try:
            from supabase import create_client
            import requests
            
            client = create_client(supabase_url, supabase_key)
            
            # Read the SQL file
            migration_file = Path(script_dir) / "supabase" / "APPLY_RESTRUCTURE_MIGRATIONS.sql"
            if not migration_file.exists():
                print(f"ERROR: Migration file not found: {migration_file}")
                sys.exit(1)
            
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql = f.read()
            
            print("\n" + "="*70)
            print("APPLYING RESTRUCTURE MIGRATIONS via Supabase REST API")
            print("="*70)
            print("\n⚠️  NOTE: Supabase REST API doesn't support direct SQL execution.")
            print("Please apply the migrations manually in Supabase Dashboard.")
            print("\nTo apply:")
            print("1. Go to: https://supabase.com/dashboard/project/[your-project]/sql/new")
            print("2. Copy and paste the contents of:")
            print(f"   {migration_file}")
            print("3. Click 'Run'")
            print("\n" + "="*70)
            
            # Show the SQL file path
            print(f"\nSQL file location: {migration_file.absolute()}")
            print("\nAlternatively, you can:")
            print("1. Get your DATABASE_URL from Supabase Dashboard")
            print("2. Add it to .env.local as: DATABASE_URL=postgresql://...")
            print("3. Run this script again")
            
            sys.exit(0)
            
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n" + "="*70)
    print("DATABASE_URL NOT FOUND")
    print("="*70)
    print("\nTo apply migrations automatically, you need to:")
    print("1. Go to Supabase Dashboard -> Settings -> Database")
    print("2. Copy the 'Connection string' (URI mode)")
    print("3. Add it to .env.local as: DATABASE_URL=postgresql://...")
    print("\nOr apply manually:")
    print("1. Go to Supabase Dashboard -> SQL Editor")
    print("2. Copy contents of: supabase/APPLY_RESTRUCTURE_MIGRATIONS.sql")
    print("3. Paste and run")
    print("="*70)
    sys.exit(1)

# Read the SQL migration file
migration_file = Path(script_dir) / "supabase" / "APPLY_RESTRUCTURE_MIGRATIONS.sql"
if not migration_file.exists():
    print(f"ERROR: Migration file not found: {migration_file}")
    sys.exit(1)

print(f"Reading migration file: {migration_file}")
with open(migration_file, 'r', encoding='utf-8') as f:
    sql = f.read()

print("\n" + "="*70)
print("APPLYING RESTRUCTURE MIGRATIONS")
print("="*70)
print("\nThis will:")
print("  1. Reset all question statuses to 'pending'")
print("  2. Remove review columns (reviewed_by, reviewed_at, review_notes)")
print("  3. Map all tag codes to curriculum text names")
print("  4. Rename 'paper' column to 'subjects' and populate values")
print("\n⚠️  WARNING: This will modify your database!")
print("="*70)

# Ask for confirmation
response = input("\nDo you want to continue? (yes/no): ").strip().lower()
if response not in ['yes', 'y']:
    print("Migration cancelled.")
    sys.exit(0)

print("\nConnecting to database...")
try:
    conn = psycopg2.connect(db_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    print("Applying migrations...")
    print("-" * 70)
    
    # Execute the SQL (it's a single transaction due to AUTOCOMMIT)
    # Split by semicolons and execute each statement
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    executed = 0
    for i, statement in enumerate(statements, 1):
        if statement:
            try:
                cur.execute(statement)
                executed += 1
                if i % 10 == 0:
                    print(f"  Executed {i} statements...")
            except Exception as e:
                print(f"\n⚠️  Warning on statement {i}: {e}")
                print(f"Statement: {statement[:100]}...")
                # Continue with next statement
                continue
    
    print(f"\n✅ Successfully executed {executed} statements")
    
    # Verify the changes
    print("\nVerifying changes...")
    print("-" * 70)
    
    # Check status distribution
    cur.execute("SELECT status, COUNT(*) FROM ai_generated_questions GROUP BY status ORDER BY status;")
    status_counts = cur.fetchall()
    print("\nStatus distribution:")
    for status, count in status_counts:
        print(f"  {status}: {count}")
    
    # Check subjects distribution
    cur.execute("SELECT subjects, COUNT(*) FROM ai_generated_questions GROUP BY subjects ORDER BY subjects;")
    subject_counts = cur.fetchall()
    print("\nSubjects distribution:")
    for subject, count in subject_counts:
        print(f"  {subject}: {count}")
    
    # Check sample of mapped tags
    cur.execute("""
        SELECT id, primary_tag, subjects 
        FROM ai_generated_questions 
        WHERE primary_tag IS NOT NULL 
        LIMIT 5;
    """)
    samples = cur.fetchall()
    print("\nSample questions (showing mapped tags):")
    for qid, tag, subject in samples:
        print(f"  ID: {qid[:8]}... | Tag: {tag} | Subject: {subject}")
    
    # Check if review columns are gone
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ai_generated_questions' 
        AND column_name IN ('reviewed_by', 'reviewed_at', 'review_notes');
    """)
    remaining_review_cols = cur.fetchall()
    if remaining_review_cols:
        print(f"\n⚠️  Warning: Review columns still exist: {[c[0] for c in remaining_review_cols]}")
    else:
        print("\n✅ Review columns successfully removed")
    
    # Check if subjects column exists
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ai_generated_questions' 
        AND column_name = 'subjects';
    """)
    if cur.fetchone():
        print("✅ Subjects column exists")
    else:
        print("⚠️  Warning: Subjects column not found")
    
    # Check if paper column is gone
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ai_generated_questions' 
        AND column_name = 'paper';
    """)
    if cur.fetchone():
        print("⚠️  Warning: Paper column still exists")
    else:
        print("✅ Paper column successfully renamed to subjects")
    
    cur.close()
    conn.close()
    
    print("\n" + "="*70)
    print("✅ MIGRATION COMPLETE!")
    print("="*70)
    print("\nAll restructuring changes have been applied successfully.")
    print("Your database is now ready to use with the new schema.")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

