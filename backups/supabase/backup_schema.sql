-- Supabase Database Backup - Schema
-- Project: NocalcProject (bcbttpsokwoapjypwwwq)
-- Backup Date: 2026-02-16
-- 
-- This file contains the complete database schema including:
-- - Table definitions
-- - Constraints (primary keys, foreign keys, checks)
-- - Indexes
-- - Sequences
-- - Row Level Security policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sequences
CREATE SEQUENCE IF NOT EXISTS questions_id_seq;
CREATE SEQUENCE IF NOT EXISTS papers_id_seq;
CREATE SEQUENCE IF NOT EXISTS conversion_tables_id_seq;
CREATE SEQUENCE IF NOT EXISTS conversion_rows_id_seq;
CREATE SEQUENCE IF NOT EXISTS paper_session_responses_id_seq;
CREATE SEQUENCE IF NOT EXISTS paper_session_sections_id_seq;
CREATE SEQUENCE IF NOT EXISTS drill_reviews_id_seq;
CREATE SEQUENCE IF NOT EXISTS drill_session_attempts_id_seq;
CREATE SEQUENCE IF NOT EXISTS builder_attempts_id_seq;
CREATE SEQUENCE IF NOT EXISTS builder_session_questions_id_seq;

-- Table definitions will be added below
-- Note: This is a simplified schema backup. For complete restoration,
-- use the migrations in supabase/migrations/ directory
