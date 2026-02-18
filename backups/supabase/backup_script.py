"""
Quick Supabase Database Backup Script
Exports schema and data to SQL files
"""
import os
import json
from datetime import datetime
from supabase import create_client, Client

# Get Supabase credentials from environment or config
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://bcbttpsokwoapjypwwwq.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Need service role key for full access

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set")
    print("Please set it to create a full backup with data")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def export_table_data(table_name, backup_file):
    """Export all data from a table"""
    try:
        response = supabase.table(table_name).select("*").execute()
        if response.data:
            backup_file.write(f"\n-- Data for table: {table_name}\n")
            backup_file.write(f"TRUNCATE TABLE {table_name} CASCADE;\n\n")
            
            for row in response.data:
                # Convert row to INSERT statement
                columns = list(row.keys())
                values = []
                for col in columns:
                    val = row[col]
                    if val is None:
                        values.append("NULL")
                    elif isinstance(val, (dict, list)):
                        values.append(f"'{json.dumps(val).replace("'", "''")}'::jsonb")
                    elif isinstance(val, str):
                        values.append(f"'{str(val).replace("'", "''")}'")
                    else:
                        values.append(str(val))
                
                insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(values)});\n"
                backup_file.write(insert_sql)
            backup_file.write("\n")
    except Exception as e:
        print(f"Warning: Could not export {table_name}: {e}")

# Create backup file
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
backup_file_path = f"backup_{timestamp}.sql"

with open(backup_file_path, "w", encoding="utf-8") as f:
    f.write(f"-- Supabase Database Backup\n")
    f.write(f"-- Generated: {datetime.now().isoformat()}\n")
    f.write(f"-- Project: {SUPABASE_URL}\n\n")
    
    # List of tables to backup (excluding system tables)
    tables = [
        "questions", "papers", "conversion_tables", "conversion_rows",
        "paper_sessions", "paper_session_responses", "paper_session_sections",
        "drill_items", "drill_reviews", "drill_sessions", "drill_session_attempts",
        "topic_progress", "session_presets", "lesson_results",
        "builder_sessions", "builder_session_questions", "builder_attempts",
        "user_daily_metrics", "user_streaks", "user_insights",
        "ai_generated_questions", "question_bank_attempts",
        "profiles", "question_choice_stats"
    ]
    
    print(f"Exporting data from {len(tables)} tables...")
    for table in tables:
        print(f"  - {table}")
        export_table_data(table, f)
    
    print(f"\nBackup completed: {backup_file_path}")
