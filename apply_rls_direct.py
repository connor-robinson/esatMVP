#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply RLS fix directly using psycopg2"""
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

# Get connection string from Supabase URL
supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url:
    print("ERROR: SUPABASE_URL not found!")
    exit(1)

# Extract connection details from URL
# Format: https://[project-ref].supabase.co
import re
match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
if not match:
    print("ERROR: Could not parse Supabase URL")
    exit(1)

project_ref = match.group(1)

# Get database password from service role key or use direct connection
# For Supabase, we need the direct database connection string
# This is usually: postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Try to get database connection from environment
db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")

if not db_url:
    print("ERROR: DATABASE_URL not found in environment variables.")
    print("Please provide the direct PostgreSQL connection string.")
    print("You can find it in Supabase Dashboard -> Settings -> Database -> Connection string")
    print("Or use the connection pooling string.")
    exit(1)

print("Connecting to database...")
try:
    conn = psycopg2.connect(db_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    print("Applying RLS fix...")
    
    # Apply the SQL
    sql = """
    DROP POLICY IF EXISTS "Public can read all questions" ON ai_generated_questions;
    
    CREATE POLICY "Public can read all questions"
      ON ai_generated_questions
      FOR SELECT
      TO anon
      USING (true);
    
    CREATE POLICY IF NOT EXISTS "Service role can read all questions"
      ON ai_generated_questions
      FOR SELECT
      TO service_role
      USING (true);
    """
    
    cur.execute(sql)
    print("[OK] RLS policies applied successfully!")
    
    # Verify
    cur.execute("""
        SELECT policyname, roles, cmd 
        FROM pg_policies 
        WHERE tablename = 'ai_generated_questions';
    """)
    policies = cur.fetchall()
    print("\nCurrent policies:")
    for policy in policies:
        print(f"  - {policy[0]}: {policy[1]} ({policy[2]})")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    exit(1)




























