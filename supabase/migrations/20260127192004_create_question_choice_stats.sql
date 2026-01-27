-- Migration: Create question_choice_stats aggregate table and triggers
-- Description: Implements scalable per-question community statistics for exam review page
-- Part 1: Official paper questions

-- ============================================================================
-- CREATE paper_session_responses TABLE (if it doesn't exist)
-- ============================================================================
-- This table stores individual question responses extracted from paper_sessions JSON
-- If responses are already stored elsewhere, this can be skipped

CREATE TABLE IF NOT EXISTS paper_session_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES paper_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  paper_id bigint REFERENCES papers(id) ON DELETE SET NULL,
  section_code text,
  choice text CHECK (choice ~ '^[A-H]$' OR choice IS NULL),
  is_correct boolean,
  time_spent_seconds integer,
  created_at timestamptz DEFAULT now()
);

-- Indexes for paper_session_responses
CREATE INDEX IF NOT EXISTS idx_paper_session_responses_session ON paper_session_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_paper_session_responses_user ON paper_session_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_session_responses_question ON paper_session_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_paper_session_responses_paper ON paper_session_responses(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_session_responses_created ON paper_session_responses(created_at DESC);

-- RLS for paper_session_responses
ALTER TABLE paper_session_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own session responses" ON paper_session_responses;
CREATE POLICY "Users can view own session responses"
  ON paper_session_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own session responses" ON paper_session_responses;
CREATE POLICY "Users can insert own session responses"
  ON paper_session_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE paper_session_responses IS 'Individual question responses extracted from paper_sessions for analytics';

-- ============================================================================
-- CREATE question_choice_stats AGGREGATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS question_choice_stats (
  question_id bigint PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  paper_id bigint REFERENCES papers(id) ON DELETE SET NULL,
  section_code text,
  attempts bigint DEFAULT 0 NOT NULL,
  correct bigint DEFAULT 0 NOT NULL,
  time_sum_seconds bigint DEFAULT 0 NOT NULL,
  a_count bigint DEFAULT 0 NOT NULL,
  b_count bigint DEFAULT 0 NOT NULL,
  c_count bigint DEFAULT 0 NOT NULL,
  d_count bigint DEFAULT 0 NOT NULL,
  e_count bigint DEFAULT 0 NOT NULL,
  f_count bigint DEFAULT 0 NOT NULL,
  g_count bigint DEFAULT 0 NOT NULL,
  h_count bigint DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for question_choice_stats
CREATE INDEX IF NOT EXISTS idx_question_choice_stats_paper ON question_choice_stats(paper_id);
CREATE INDEX IF NOT EXISTS idx_question_choice_stats_section ON question_choice_stats(section_code);
CREATE INDEX IF NOT EXISTS idx_question_choice_stats_paper_section ON question_choice_stats(paper_id, section_code);

-- RLS for question_choice_stats (public read for aggregates, no write)
ALTER TABLE question_choice_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view question stats" ON question_choice_stats;
CREATE POLICY "Anyone can view question stats"
  ON question_choice_stats FOR SELECT
  TO public
  USING (true);

COMMENT ON TABLE question_choice_stats IS 'Aggregated community statistics per question: attempts, time, and answer choice popularity';

-- ============================================================================
-- TRIGGER FUNCTION: Update question_choice_stats on INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_question_choice_stats()
RETURNS TRIGGER AS $$
DECLARE
  choice_upper text;
  time_seconds bigint;
  question_section_code text;
BEGIN
  -- Normalize choice to uppercase
  choice_upper := UPPER(TRIM(NEW.choice));
  
  -- Handle NULL time_spent_seconds
  time_seconds := COALESCE(NEW.time_spent_seconds, 0);
  
  -- Use section_code from response, or try to get from question if missing
  question_section_code := NEW.section_code;
  
  -- Only try to look up section_code from question if it's NULL
  IF question_section_code IS NULL THEN
    SELECT COALESCE(part_letter, part_name)
    INTO question_section_code
    FROM questions
    WHERE id = NEW.question_id
    LIMIT 1;
  END IF;
  
  -- UPSERT into question_choice_stats
  INSERT INTO question_choice_stats (
    question_id,
    paper_id,
    section_code,
    attempts,
    correct,
    time_sum_seconds,
    a_count,
    b_count,
    c_count,
    d_count,
    e_count,
    f_count,
    g_count,
    h_count,
    updated_at
  )
  VALUES (
    NEW.question_id,
    NEW.paper_id,
    question_section_code,
    1,
    CASE WHEN NEW.is_correct = true THEN 1 ELSE 0 END,
    time_seconds,
    CASE WHEN choice_upper = 'A' THEN 1 ELSE 0 END,
    CASE WHEN choice_upper = 'B' THEN 1 ELSE 0 END,
    CASE WHEN choice_upper = 'C' THEN 1 ELSE 0 END,
    CASE WHEN choice_upper = 'D' THEN 1 ELSE 0 END,
    CASE WHEN choice_upper = 'E' THEN 1 ELSE 0 END,
    CASE WHEN choice_upper = 'F' THEN 1 ELSE 0 END,
    CASE WHEN choice_upper = 'G' THEN 1 ELSE 0 END,
    CASE WHEN choice_upper = 'H' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (question_id) DO UPDATE SET
    attempts = question_choice_stats.attempts + 1,
    correct = question_choice_stats.correct + CASE WHEN NEW.is_correct = true THEN 1 ELSE 0 END,
    time_sum_seconds = question_choice_stats.time_sum_seconds + time_seconds,
    a_count = question_choice_stats.a_count + CASE WHEN choice_upper = 'A' THEN 1 ELSE 0 END,
    b_count = question_choice_stats.b_count + CASE WHEN choice_upper = 'B' THEN 1 ELSE 0 END,
    c_count = question_choice_stats.c_count + CASE WHEN choice_upper = 'C' THEN 1 ELSE 0 END,
    d_count = question_choice_stats.d_count + CASE WHEN choice_upper = 'D' THEN 1 ELSE 0 END,
    e_count = question_choice_stats.e_count + CASE WHEN choice_upper = 'E' THEN 1 ELSE 0 END,
    f_count = question_choice_stats.f_count + CASE WHEN choice_upper = 'F' THEN 1 ELSE 0 END,
    g_count = question_choice_stats.g_count + CASE WHEN choice_upper = 'G' THEN 1 ELSE 0 END,
    h_count = question_choice_stats.h_count + CASE WHEN choice_upper = 'H' THEN 1 ELSE 0 END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on paper_session_responses
DROP TRIGGER IF EXISTS trigger_update_question_choice_stats ON paper_session_responses;
CREATE TRIGGER trigger_update_question_choice_stats
  AFTER INSERT ON paper_session_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_question_choice_stats();

COMMENT ON FUNCTION update_question_choice_stats() IS 'Maintains question_choice_stats aggregates when responses are inserted';

-- ============================================================================
-- FUNCTION: Populate paper_session_responses from paper_sessions JSON
-- ============================================================================
-- This function extracts individual responses from paper_sessions JSON arrays
-- and inserts them into paper_session_responses for existing sessions

CREATE OR REPLACE FUNCTION populate_session_responses_from_json()
RETURNS void AS $$
DECLARE
  session_record RECORD;
  answer_record JSONB;
  question_index integer;
  question_id_val bigint;
  question_paper_id bigint;
  question_part_letter text;
  question_part_name text;
  choice_val text;
  is_correct_val boolean;
  time_seconds integer;
  section_code_val text;
BEGIN
  -- Process each completed session
  FOR session_record IN 
    SELECT 
      ps.id,
      ps.user_id,
      ps.paper_id,
      ps.answers,
      ps.per_question_seconds,
      ps.correct_flags,
      ps.question_order,
      ps.selected_sections
    FROM paper_sessions ps
    WHERE ps.ended_at IS NOT NULL
      AND ps.answers IS NOT NULL
      AND jsonb_array_length(ps.answers::jsonb) > 0
      AND ps.paper_id IS NOT NULL
  LOOP
    -- Extract answers array
    IF session_record.answers IS NOT NULL THEN
      question_index := 0;
      
      FOR answer_record IN SELECT * FROM jsonb_array_elements(session_record.answers::jsonb)
      LOOP
        -- Get question_id from question_order or calculate from range
        question_id_val := NULL;
        question_paper_id := NULL;
        question_part_letter := NULL;
        question_part_name := NULL;
        
        IF session_record.question_order IS NOT NULL 
           AND array_length(session_record.question_order, 1) > question_index THEN
          -- Find question by number in order
          SELECT id, paper_id, part_letter, part_name 
          INTO question_id_val, question_paper_id, question_part_letter, question_part_name
          FROM questions
          WHERE paper_id = session_record.paper_id
            AND question_number = session_record.question_order[question_index + 1]
          LIMIT 1;
        ELSE
          -- Fallback: try to get question by index
          SELECT id, paper_id, part_letter, part_name
          INTO question_id_val, question_paper_id, question_part_letter, question_part_name
          FROM questions
          WHERE paper_id = session_record.paper_id
          ORDER BY question_number
          OFFSET question_index
          LIMIT 1;
        END IF;
        
        -- Extract choice
        choice_val := answer_record->>'choice';
        
        -- Extract is_correct from correct_flags array
        is_correct_val := NULL;
        IF session_record.correct_flags IS NOT NULL 
           AND jsonb_array_length(session_record.correct_flags::jsonb) > question_index THEN
          is_correct_val := (session_record.correct_flags::jsonb->question_index)::boolean;
        END IF;
        
        -- Extract time_spent_seconds from per_question_seconds array
        time_seconds := NULL;
        IF session_record.per_question_seconds IS NOT NULL 
           AND array_length(session_record.per_question_seconds, 1) > question_index THEN
          time_seconds := session_record.per_question_seconds[question_index + 1];
        END IF;
        
        -- Determine section_code from question's part_letter or part_name
        section_code_val := COALESCE(question_part_letter, question_part_name);
        
        -- Use question's paper_id if available, otherwise fall back to session's paper_id
        question_paper_id := COALESCE(question_paper_id, session_record.paper_id);
        
        -- Insert response if question_id found and choice exists
        IF question_id_val IS NOT NULL AND choice_val IS NOT NULL THEN
          INSERT INTO paper_session_responses (
            session_id,
            user_id,
            question_id,
            paper_id,
            section_code,
            choice,
            is_correct,
            time_spent_seconds
          )
          VALUES (
            session_record.id,
            session_record.user_id,
            question_id_val,
            question_paper_id,
            section_code_val,
            choice_val,
            is_correct_val,
            time_seconds
          )
          ON CONFLICT DO NOTHING; -- Skip if already exists
        END IF;
        
        question_index := question_index + 1;
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION populate_session_responses_from_json() IS 'One-time function to backfill paper_session_responses from existing paper_sessions JSON data';

