-- ESAT Mock Test Builder: question metadata, mocks, blueprints, settings.
-- Backward-compatible: new columns are nullable / have defaults; existing practice flows unchanged until settings are enabled.

-- ---------------------------------------------------------------------------
-- Question bank metadata for mock assembly
-- ---------------------------------------------------------------------------
ALTER TABLE ai_generated_questions
  ADD COLUMN IF NOT EXISTS mock_difficulty smallint
    CHECK (mock_difficulty IS NULL OR (mock_difficulty BETWEEN 1 AND 5)),
  ADD COLUMN IF NOT EXISTS estimated_time_seconds integer
    CHECK (estimated_time_seconds IS NULL OR estimated_time_seconds > 0),
  ADD COLUMN IF NOT EXISTS observed_median_time_seconds integer
    CHECK (observed_median_time_seconds IS NULL OR observed_median_time_seconds > 0),
  ADD COLUMN IF NOT EXISTS reasoning_type text,
  ADD COLUMN IF NOT EXISTS presentation_type text,
  ADD COLUMN IF NOT EXISTS quality_score real
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
  ADD COLUMN IF NOT EXISTS mock_eligible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS practice_eligible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reserved_for_mock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mock_usage_count integer NOT NULL DEFAULT 0
    CHECK (mock_usage_count >= 0);

COMMENT ON COLUMN ai_generated_questions.mock_difficulty IS
  '1=very easy … 5=very hard. Preferred over Easy/Medium/Hard for mock building.';
COMMENT ON COLUMN ai_generated_questions.estimated_time_seconds IS
  'Editorial / heuristic / LLM estimate. Never overwritten by observed medians.';
COMMENT ON COLUMN ai_generated_questions.observed_median_time_seconds IS
  'Cached median from student attempts. Distinct from estimated_time_seconds.';
COMMENT ON COLUMN ai_generated_questions.mock_eligible IS
  'May be selected into mock drafts when true and status/quality gates pass.';
COMMENT ON COLUMN ai_generated_questions.practice_eligible IS
  'May appear in ordinary question-bank practice when true (and global setting allows).';
COMMENT ON COLUMN ai_generated_questions.reserved_for_mock IS
  'True once assigned to an approved/published mock (soft reservation).';

CREATE INDEX IF NOT EXISTS idx_ai_questions_mock_eligible
  ON ai_generated_questions (subjects, mock_eligible, practice_eligible)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_ai_questions_reserved_for_mock
  ON ai_generated_questions (reserved_for_mock)
  WHERE reserved_for_mock = true;

-- ---------------------------------------------------------------------------
-- App settings (practice exclusion toggle, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esat_mock_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO esat_mock_settings (key, value)
VALUES (
  'exclude_published_mock_questions_from_practice',
  'true'::jsonb
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE esat_mock_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esat_mock_settings_admin_all" ON esat_mock_settings;
CREATE POLICY "esat_mock_settings_admin_all"
  ON esat_mock_settings
  FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- Blueprints (per-subject targets; defaults also live in TypeScript)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esat_mock_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esat_mock_blueprints_subject_check CHECK (
    subject IN ('Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS esat_mock_blueprints_one_default_per_subject
  ON esat_mock_blueprints (subject)
  WHERE is_default = true;

ALTER TABLE esat_mock_blueprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esat_mock_blueprints_admin_all" ON esat_mock_blueprints;
CREATE POLICY "esat_mock_blueprints_admin_all"
  ON esat_mock_blueprints
  FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- ---------------------------------------------------------------------------
-- Mocks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esat_mocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  mock_number integer NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  is_free boolean NOT NULL DEFAULT false,
  blueprint_id uuid REFERENCES esat_mock_blueprints(id) ON DELETE SET NULL,
  blueprint_snapshot jsonb,
  question_count integer NOT NULL DEFAULT 27,
  time_limit_minutes integer NOT NULL DEFAULT 40,
  predicted_difficulty numeric(4, 2),
  predicted_workload_seconds integer,
  topic_coverage jsonb,
  presentation_mix jsonb,
  answer_distribution jsonb,
  ai_review jsonb,
  paper_metrics jsonb,
  generation_notes jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esat_mocks_subject_check CHECK (
    subject IN ('Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology')
  ),
  CONSTRAINT esat_mocks_status_check CHECK (
    status IN ('draft', 'review', 'approved', 'published', 'archived')
  ),
  CONSTRAINT esat_mocks_mock_number_check CHECK (mock_number BETWEEN 1 AND 99),
  CONSTRAINT esat_mocks_question_count_check CHECK (question_count > 0),
  CONSTRAINT esat_mocks_unique_subject_number UNIQUE (subject, mock_number)
);

CREATE INDEX IF NOT EXISTS idx_esat_mocks_status ON esat_mocks (status);
CREATE INDEX IF NOT EXISTS idx_esat_mocks_subject ON esat_mocks (subject, mock_number);

ALTER TABLE esat_mocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esat_mocks_admin_all" ON esat_mocks;
CREATE POLICY "esat_mocks_admin_all"
  ON esat_mocks
  FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Authenticated users may read published mocks (for student library later).
DROP POLICY IF EXISTS "esat_mocks_auth_read_published" ON esat_mocks;
CREATE POLICY "esat_mocks_auth_read_published"
  ON esat_mocks
  FOR SELECT
  USING (status = 'published');

-- ---------------------------------------------------------------------------
-- Mock question slots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esat_mock_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id uuid NOT NULL REFERENCES esat_mocks(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES ai_generated_questions(id) ON DELETE RESTRICT,
  position integer NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  slot_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esat_mock_questions_position_check CHECK (position BETWEEN 1 AND 40),
  CONSTRAINT esat_mock_questions_unique_position UNIQUE (mock_id, position),
  CONSTRAINT esat_mock_questions_unique_question UNIQUE (mock_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_esat_mock_questions_question
  ON esat_mock_questions (question_id);

ALTER TABLE esat_mock_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esat_mock_questions_admin_all" ON esat_mock_questions;
CREATE POLICY "esat_mock_questions_admin_all"
  ON esat_mock_questions
  FOR ALL
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "esat_mock_questions_auth_read_published" ON esat_mock_questions;
CREATE POLICY "esat_mock_questions_auth_read_published"
  ON esat_mock_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM esat_mocks m
      WHERE m.id = esat_mock_questions.mock_id
        AND m.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- Mock attempt sessions (paper-level calibration; optional bridge to QB attempts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS esat_mock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id uuid NOT NULL REFERENCES esat_mocks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  score integer,
  max_score integer NOT NULL DEFAULT 27,
  total_time_ms integer,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  per_question_seconds jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esat_mock_attempts_score_check CHECK (score IS NULL OR score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_esat_mock_attempts_mock
  ON esat_mock_attempts (mock_id, completed);
CREATE INDEX IF NOT EXISTS idx_esat_mock_attempts_user
  ON esat_mock_attempts (user_id, mock_id);

ALTER TABLE esat_mock_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esat_mock_attempts_own" ON esat_mock_attempts;
CREATE POLICY "esat_mock_attempts_own"
  ON esat_mock_attempts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "esat_mock_attempts_admin_read" ON esat_mock_attempts;
CREATE POLICY "esat_mock_attempts_admin_read"
  ON esat_mock_attempts
  FOR SELECT
  USING (public.current_user_is_admin());
