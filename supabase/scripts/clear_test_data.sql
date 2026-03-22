-- Script to clear test/sample data from analytics tables
-- Run this when you want to reset and start fresh with real data

-- WARNING: This will delete ALL existing data. Make sure this is what you want!

-- Clear session attempts
DELETE FROM builder_attempts;

-- Clear session questions
DELETE FROM builder_session_questions;

-- Clear sessions
DELETE FROM builder_sessions;

-- Clear drill session attempts
DELETE FROM drill_session_attempts;

-- Clear drill sessions
DELETE FROM drill_sessions;

-- Clear topic progress (this is the main analytics data)
DELETE FROM topic_progress;

-- Clear daily metrics
DELETE FROM user_daily_metrics;

-- Clear presets (optional - comment out if you want to keep your presets)
-- DELETE FROM session_presets;

-- Verify counts
SELECT 'builder_attempts' as table_name, COUNT(*) as remaining_rows FROM builder_attempts
UNION ALL
SELECT 'builder_session_questions', COUNT(*) FROM builder_session_questions
UNION ALL
SELECT 'builder_sessions', COUNT(*) FROM builder_sessions
UNION ALL
SELECT 'drill_session_attempts', COUNT(*) FROM drill_session_attempts
UNION ALL
SELECT 'drill_sessions', COUNT(*) FROM drill_sessions
UNION ALL
SELECT 'topic_progress', COUNT(*) FROM topic_progress
UNION ALL
SELECT 'user_daily_metrics', COUNT(*) FROM user_daily_metrics;

