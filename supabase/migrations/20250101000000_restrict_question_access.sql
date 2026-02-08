-- Migration: Restrict question access for handover
-- Description: Updates RLS policies to limit question visibility to approved questions only
-- Date: 2025-01-XX
-- 
-- IMPORTANT: Run this migration on your DEV/STAGING Supabase project before handover
-- DO NOT run on production without testing first

-- ============================================================================
-- RESTRICT QUESTION ACCESS
-- ============================================================================

-- Drop the permissive policy that allows all authenticated users to read all questions
DROP POLICY IF EXISTS "Users can read all questions" ON ai_generated_questions;

-- Create a restrictive policy that only shows approved questions
CREATE POLICY "Users can read approved questions only"
  ON ai_generated_questions
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Optional: If you want to allow users to see their own reviewed questions
-- (e.g., questions they've reviewed), you can add this additional policy:
-- 
-- CREATE POLICY "Users can read questions they reviewed"
--   ON ai_generated_questions
--   FOR SELECT
--   TO authenticated
--   USING (
--     status IN ('pending_review', 'needs_revision') 
--     AND tags_labeled_by = auth.uid()::text
--   );

-- ============================================================================
-- RESTRICT QUESTION UPDATES (Optional - for stricter security)
-- ============================================================================

-- If you want to restrict who can update questions, you can:
-- 1. Drop the existing update policy
-- 2. Create a new policy that only allows admins or specific users

-- Example: Only allow updates if user has admin role in profiles table
-- (Uncomment if you have a role-based system)

-- DROP POLICY IF EXISTS "Users can update question status" ON ai_generated_questions;
-- 
-- CREATE POLICY "Only admins can update questions"
--   ON ai_generated_questions
--   FOR UPDATE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE profiles.id = auth.uid() 
--       AND profiles.role = 'admin'
--     )
--   )
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE profiles.id = auth.uid() 
--       AND profiles.role = 'admin'
--     )
--   );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify the policies:
-- SELECT * FROM pg_policies WHERE tablename = 'ai_generated_questions';

-- Test that unauthenticated users cannot access questions:
-- (Should return empty or error)
-- SELECT * FROM ai_generated_questions;

-- Test that authenticated users only see approved questions:
-- (Should only return questions where status = 'approved')
-- SELECT id, status, question_stem FROM ai_generated_questions;
