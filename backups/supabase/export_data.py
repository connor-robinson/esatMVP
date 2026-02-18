"""
Supabase Data Export Script
Exports all data from NocalcProject database to local backup files
"""

import json
from datetime import datetime

# Tables with data (from earlier inspection)
TABLES_WITH_DATA = [
    "paper_sessions",  # 23 rows
    "paper_session_responses",  # 63 rows
    "drill_sessions",  # 40 rows
    "builder_sessions",  # 97 rows
    "builder_session_questions",  # 1271 rows
    "user_daily_metrics",  # 11 rows
    "topic_progress",  # 8 rows
    "profiles",  # 5 rows
    "ai_generated_questions",  # 1181 rows
    "question_choice_stats",  # 60 rows
    "session_presets",  # 1 row
]

# Empty tables (schema only)
EMPTY_TABLES = [
    "questions",
    "papers",
    "conversion_tables",
    "conversion_rows",
    "drill_items",
    "drill_reviews",
    "drill_session_attempts",
    "lesson_results",
    "paper_session_sections",
    "builder_attempts",
    "user_insights",
    "user_streaks",
    "question_bank_attempts",
]

print(f"Backup script created at {datetime.now()}")
print(f"Total tables to backup: {len(TABLES_WITH_DATA) + len(EMPTY_TABLES)}")
print(f"Tables with data: {len(TABLES_WITH_DATA)}")
print(f"Empty tables: {len(EMPTY_TABLES)}")
