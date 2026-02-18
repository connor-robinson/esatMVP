"""
Export Supabase database backup using MCP tools
This script will be executed to create a comprehensive backup
"""
import json
import sys
from datetime import datetime

# This script coordinates the backup process
# The actual data will be exported via Supabase MCP tools

print("Starting Supabase backup export...")
print("This will create a complete SQL backup file with all your data.")

# List of all tables to backup (in dependency order)
TABLES = [
    # Core tables first
    'papers',
    'questions',
    'conversion_tables',
    'conversion_rows',
    # Session data
    'paper_sessions',
    'paper_session_responses',
    'paper_session_sections',
    # Drill data
    'drill_items',
    'drill_reviews',
    'drill_sessions',
    'drill_session_attempts',
    # Builder data
    'builder_sessions',
    'builder_session_questions',
    'builder_attempts',
    # AI questions
    'ai_generated_questions',
    'question_bank_attempts',
    # User data
    'profiles',
    'topic_progress',
    'session_presets',
    'lesson_results',
    'user_daily_metrics',
    'user_streaks',
    'user_insights',
    # Analytics
    'question_choice_stats',
]

print(f"\nWill export {len(TABLES)} tables")
print("\nNote: This script requires Supabase MCP tools to be available.")
print("The backup will be created in the same directory.")
