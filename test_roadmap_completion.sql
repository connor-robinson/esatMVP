-- Test script for roadmap completion queries
-- Run this in Supabase Studio SQL Editor to verify completion tracking works

-- 1. Check paper_sessions table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'paper_sessions'
ORDER BY ordinal_position;

-- 2. View sample paper_sessions data
SELECT 
  id,
  user_id,
  paper_name,
  paper_variant,
  selected_sections,
  started_at,
  ended_at,
  (ended_at IS NOT NULL) as is_completed
FROM paper_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 3. Test completion query for a specific user and paper
-- Replace 'YOUR_USER_ID' and adjust paper_name/paper_variant as needed
-- Example: Check if NSAA 2020 Section 1 Part A is completed
SELECT 
  ps.id,
  ps.paper_name,
  ps.paper_variant,
  ps.selected_sections,
  ps.ended_at,
  CASE 
    WHEN ps.ended_at IS NOT NULL AND ps.selected_sections @> ARRAY['Section 1']::text[] 
    THEN true 
    ELSE false 
  END as section1_completed
FROM paper_sessions ps
WHERE ps.user_id = auth.uid()  -- Use your actual user ID or replace with specific UUID
  AND ps.paper_name = 'NSAA'
  AND ps.paper_variant = '2020-Section 1-Official'
  AND ps.ended_at IS NOT NULL
ORDER BY ps.ended_at DESC;

-- 4. Check all completed sessions for a user (grouped by paper variant)
SELECT 
  paper_name,
  paper_variant,
  COUNT(*) as completed_sessions,
  array_agg(DISTINCT unnest(selected_sections)) as all_sections_completed
FROM paper_sessions
WHERE user_id = auth.uid()  -- Use your actual user ID or replace with specific UUID
  AND ended_at IS NOT NULL
GROUP BY paper_name, paper_variant
ORDER BY paper_name, paper_variant;

-- 5. Verify section matching logic
-- This simulates what the isPartCompleted function does
-- Replace variables as needed:
-- - user_id: your user UUID
-- - exam_name: 'NSAA', 'ENGAA', or 'TMUA'
-- - paper_variant: format 'YEAR-PaperName-ExamType' (e.g., '2020-Section 1-Official')
-- - section: the section to check (e.g., 'Section 1', 'Section 2', 'Paper 1')
WITH test_params AS (
  SELECT 
    auth.uid() as test_user_id,  -- Replace with actual user ID if needed
    'NSAA' as test_exam_name,
    '2020-Section 1-Official' as test_paper_variant,
    'Section 1' as test_section
)
SELECT 
  ps.id,
  ps.paper_name,
  ps.paper_variant,
  ps.selected_sections,
  ps.ended_at,
  CASE 
    WHEN ps.ended_at IS NOT NULL 
      AND ps.selected_sections IS NOT NULL 
      AND array_length(ps.selected_sections, 1) > 0
      AND tp.test_section = ANY(ps.selected_sections)
    THEN true 
    ELSE false 
  END as is_part_completed
FROM paper_sessions ps
CROSS JOIN test_params tp
WHERE ps.user_id = tp.test_user_id
  AND ps.paper_name = tp.test_exam_name
  AND ps.paper_variant = tp.test_paper_variant
  AND ps.ended_at IS NOT NULL
ORDER BY ps.ended_at DESC;

-- 6. Get completion status for all parts in a stage
-- Example: NSAA 2020 has 3 parts: Section 1 Part A, Section 1 Part B, Section 2 Part B
-- This query checks completion for each section
SELECT 
  'Section 1' as section,
  COUNT(*) FILTER (
    WHERE ended_at IS NOT NULL 
      AND selected_sections @> ARRAY['Section 1']::text[]
  ) > 0 as is_completed
FROM paper_sessions
WHERE user_id = auth.uid()
  AND paper_name = 'NSAA'
  AND paper_variant = '2020-Section 1-Official'
  AND ended_at IS NOT NULL

UNION ALL

SELECT 
  'Section 2' as section,
  COUNT(*) FILTER (
    WHERE ended_at IS NOT NULL 
      AND selected_sections @> ARRAY['Section 2']::text[]
  ) > 0 as is_completed
FROM paper_sessions
WHERE user_id = auth.uid()
  AND paper_name = 'NSAA'
  AND paper_variant = '2020-Section 2-Official'
  AND ended_at IS NOT NULL;







