#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply RLS fix for review app - allows anonymous users to read and update questions"""
import os
import sys
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
    print("ERROR: DATABASE_URL or SUPABASE_DB_URL not found in environment variables.")
    print("Please set one of these in your .env.local file.")
    print("\nFor Supabase, you can find the connection string in:")
    print("Dashboard > Settings > Database > Connection string > URI")
    sys.exit(1)

try:
    # Connect to database
    print("Connecting to database...")
    conn = psycopg2.connect(db_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    print("Applying RLS policies for review app...")
    
    # Drop existing policies if they exist (for idempotency)
    cur.execute('DROP POLICY IF EXISTS "Anonymous users can read all questions" ON ai_generated_questions;')
    cur.execute('DROP POLICY IF EXISTS "Anonymous users can update questions" ON ai_generated_questions;')
    
    # Policy: Anonymous users can read all questions
    cur.execute("""
        CREATE POLICY "Anonymous users can read all questions"
        ON ai_generated_questions
        FOR SELECT
        TO anon
        USING (true);
    """)
    print("✓ Created policy: Anonymous users can read all questions")
    
    # Policy: Anonymous users can update questions
    cur.execute("""
        CREATE POLICY "Anonymous users can update questions"
        ON ai_generated_questions
        FOR UPDATE
        TO anon
        USING (true)
        WITH CHECK (true);
    """)
    print("✓ Created policy: Anonymous users can update questions")
    
    print("\n✅ RLS policies applied successfully!")
    print("The review app should now be able to read and update questions.")
    
    cur.close()
    conn.close()
    
except psycopg2.Error as e:
    print(f"ERROR: Database error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

