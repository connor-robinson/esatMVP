#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mark all Physics, Chemistry, and Biology questions as 'old'

This script updates all questions with schema_id starting with P, C, or B
to have status = 'old' in the database.
"""

import os
import sys
from pathlib import Path

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    from supabase import create_client, Client
    from project import safe_load_dotenv
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print("Please ensure supabase-py is installed: pip install supabase")
    sys.exit(1)


def main():
    """Mark all P, C, B questions as 'old'."""
    # Load environment variables
    project_root = Path(__file__).parent.parent.parent
    env_path = project_root / ".env.local"
    safe_load_dotenv(str(env_path))
    
    # Get Supabase credentials
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
        sys.exit(1)
    
    # Create Supabase client
    try:
        client = create_client(supabase_url, supabase_key)
        print("✓ Connected to Supabase")
    except Exception as e:
        print(f"ERROR: Failed to connect to Supabase: {e}")
        sys.exit(1)
    
    # First, check how many questions match
    print("\n🔍 Counting Physics, Chemistry, and Biology questions...")
    try:
        # Get all questions (we'll filter by schema_id prefix in Python)
        response = client.table("ai_generated_questions").select("id, schema_id, status").execute()
        
        if not response.data:
            print("⚠ No questions found in database")
            return
        
        # Filter for P, C, B schemas
        pcb_questions = [
            q for q in response.data 
            if q.get("schema_id", "").startswith(("P", "C", "B"))
        ]
        
        total_count = len(pcb_questions)
        print(f"✓ Found {total_count} Physics/Chemistry/Biology questions")
        
        if total_count == 0:
            print("⚠ No P/C/B questions to update")
            return
        
        # Show breakdown by subject
        physics_count = sum(1 for q in pcb_questions if q.get("schema_id", "").startswith("P"))
        chem_count = sum(1 for q in pcb_questions if q.get("schema_id", "").startswith("C"))
        bio_count = sum(1 for q in pcb_questions if q.get("schema_id", "").startswith("B"))
        
        print(f"  - Physics (P): {physics_count}")
        print(f"  - Chemistry (C): {chem_count}")
        print(f"  - Biology (B): {bio_count}")
        
        # Show current status breakdown
        status_counts = {}
        for q in pcb_questions:
            status = q.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"\n📊 Current status breakdown:")
        for status, count in sorted(status_counts.items()):
            print(f"  - {status}: {count}")
        
        # Confirm before proceeding
        print(f"\n⚠️  This will update {total_count} questions to status 'old'")
        response = input("Continue? (yes/no): ").strip().lower()
        
        if response != "yes":
            print("❌ Cancelled")
            return
        
        # Update all P, C, B questions
        print(f"\n🔄 Updating questions...")
        
        # Update in batches to avoid timeouts
        batch_size = 100
        updated_count = 0
        
        # Get all question IDs
        pcb_ids = [q["id"] for q in pcb_questions]
        
        for i in range(0, len(pcb_ids), batch_size):
            batch_ids = pcb_ids[i:i + batch_size]
            
            # Update batch
            try:
                result = client.table("ai_generated_questions")\
                    .update({"status": "old"})\
                    .in_("id", batch_ids)\
                    .execute()
                
                updated_count += len(batch_ids)
                print(f"  ✓ Updated batch {i//batch_size + 1}: {updated_count}/{total_count} questions")
                
            except Exception as e:
                print(f"  ✗ Error updating batch {i//batch_size + 1}: {e}")
                continue
        
        print(f"\n✅ Successfully updated {updated_count}/{total_count} questions to status 'old'")
        
        # Verify the update
        print("\n🔍 Verifying update...")
        verify_response = client.table("ai_generated_questions")\
            .select("id, schema_id, status")\
            .execute()
        
        verified_pcb = [q for q in verify_response.data if q.get("schema_id", "").startswith(("P", "C", "B"))]
        old_count = sum(1 for q in verified_pcb if q.get("status") == "old")
        
        print(f"✓ Verified: {old_count}/{len(verified_pcb)} P/C/B questions now have status 'old'")
        
        if old_count < len(verified_pcb):
            print(f"⚠ Warning: {len(verified_pcb) - old_count} questions were not updated")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

