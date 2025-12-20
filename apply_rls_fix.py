#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply RLS fix to allow anonymous reads"""
import os
from dotenv import load_dotenv

# Try multiple paths for .env.local
env_paths = [
    '.env.local',
    os.path.join(os.path.dirname(__file__), '.env.local'),
    os.path.join(os.path.dirname(__file__), '..', '.env.local'),
]
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break
else:
    # Try loading from current directory
    load_dotenv('.env.local')

try:
    from supabase import create_client
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: Missing Supabase credentials!")
        exit(1)
    
    client = create_client(supabase_url, supabase_key)
    
    print("Applying RLS fix...")
    
    # SQL to apply
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
    
    # Execute SQL using RPC (if available) or direct query
    try:
        # Try using the PostgREST client to execute SQL
        # Note: Supabase Python client doesn't have direct SQL execution
        # We need to use the REST API or psycopg2
        print("Note: Supabase Python client doesn't support direct SQL execution.")
        print("Please run this SQL in your Supabase dashboard SQL Editor:")
        print("=" * 70)
        print(sql)
        print("=" * 70)
        
        # However, we can test if the policy works by trying to read
        print("\nTesting if questions are readable...")
        result = client.table("ai_generated_questions").select("id").limit(1).execute()
        print(f"[OK] Can read questions with service role")
        
        # Test with anon key
        from supabase import create_client as create_anon_client
        anon_client = create_anon_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        )
        
        try:
            result = anon_client.table("ai_generated_questions").select("id").limit(1).execute()
            print("[OK] Can read questions with anon key - RLS is working!")
            print("RLS fix may already be applied, or questions are accessible.")
        except Exception as e:
            print(f"[FAIL] Cannot read with anon key: {e}")
            print("You need to apply the SQL above in Supabase dashboard.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

