-- One-off: set every row in ai_generated_questions to pending (re-queue for review).
-- Run in Supabase → SQL Editor (or psql against your project).
--
-- Requires your CHECK constraint to allow 'pending'. If the UPDATE fails with a
-- constraint violation, use the legacy variant at the bottom instead.

UPDATE ai_generated_questions
SET status = 'pending',
    updated_at = now();

-- Legacy DBs (status only: pending_review, approved, rejected, needs_revision, old):
-- UPDATE ai_generated_questions
-- SET status = 'pending_review',
--     updated_at = now();
