-- Migration: Founding Tester Programme
-- Description: Staged temporary-premium tester programme with structured surveys,
-- analytics events, an email queue, admin-configurable durations/thresholds, and a
-- central "meaningful session" definition. Access is calculated server-side; a paid
-- subscription always overrides tester access.

-- ============================================================================
-- CONFIG (singleton)
-- Admin-tunable durations, approval mode, meaningful-session thresholds, discount.
-- Service-role only (no RLS policies); exposed to clients via API where needed.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tester_programme_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Stage rewards (durations)
  stage_1_hours integer NOT NULL DEFAULT 48,
  stage_2_days integer NOT NULL DEFAULT 7,
  stage_3_days integer NOT NULL DEFAULT 30,
  -- Stage 3 approval behaviour: automatically approve, require manual approval, or disable.
  stage_3_approval_mode text NOT NULL DEFAULT 'auto'
    CHECK (stage_3_approval_mode IN ('auto', 'manual', 'disabled')),
  -- Central "meaningful session" thresholds (a session qualifies if EITHER is met).
  meaningful_session_min_seconds integer NOT NULL DEFAULT 120,
  meaningful_session_min_questions integer NOT NULL DEFAULT 5,
  -- Whether existing paid users may be offered the programme.
  offer_to_paid_users boolean NOT NULL DEFAULT false,
  -- Founding-member discount (stored, not necessarily applied yet).
  founding_discount_percent integer NOT NULL DEFAULT 50,
  founding_discount_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tester_programme_config ENABLE ROW LEVEL SECURITY;
-- No policies: service role only.

INSERT INTO tester_programme_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TESTER PROGRAMMES (one row per enrolled user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tester_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  programme_status text NOT NULL DEFAULT 'stage_1_survey_pending'
    CHECK (programme_status IN (
      'not_joined',
      'stage_1_survey_pending',
      'stage_1_active',
      'stage_1_expired',
      'stage_2_active',
      'stage_2_expired',
      'final_survey_pending',
      'awaiting_manual_approval',
      'stage_3_active',
      'programme_completed',
      'revoked'
    )),
  current_stage integer NOT NULL DEFAULT 0, -- 0 = joined/pre-stage-1, 1/2/3 = active stage

  joined_at timestamptz NOT NULL DEFAULT now(),

  -- Stage 1: First Look
  stage_1_started_at timestamptz,
  stage_1_expires_at timestamptz,
  stage_1_survey_completed_at timestamptz,

  -- Stage 2: Active Tester
  stage_1_feedback_completed_at timestamptz,
  stage_2_started_at timestamptz,
  stage_2_expires_at timestamptz,

  -- Stage 3: Founding Tester
  final_survey_completed_at timestamptz,
  stage_3_started_at timestamptz,
  stage_3_expires_at timestamptz,

  -- Progress + rewards
  meaningful_sessions_completed integer NOT NULL DEFAULT 0,
  founding_discount_eligible boolean NOT NULL DEFAULT false,
  founding_discount_code text,
  founding_discount_percent integer,

  -- Testimonial / follow-up permissions
  follow_up_contact_allowed boolean,
  testimonial_permission text CHECK (testimonial_permission IN ('yes', 'maybe_later', 'no')),
  testimonial_display_type text CHECK (testimonial_display_type IN ('first_name', 'anonymous', 'private')),
  testimonial_text text,

  -- Consents (essential tester comms are required; marketing is separate/optional)
  essential_emails_consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,

  -- Admin
  manually_approved boolean NOT NULL DEFAULT false,
  admin_notes text,
  revoked_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tester_programmes_user ON tester_programmes(user_id);
CREATE INDEX IF NOT EXISTS idx_tester_programmes_status ON tester_programmes(programme_status);
CREATE INDEX IF NOT EXISTS idx_tester_programmes_stage_1_expires ON tester_programmes(stage_1_expires_at);
CREATE INDEX IF NOT EXISTS idx_tester_programmes_stage_2_expires ON tester_programmes(stage_2_expires_at);
CREATE INDEX IF NOT EXISTS idx_tester_programmes_stage_3_expires ON tester_programmes(stage_3_expires_at);

ALTER TABLE tester_programmes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tester programme" ON tester_programmes;
CREATE POLICY "Users can view own tester programme"
  ON tester_programmes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
-- All writes go through service role in API routes (server-side entitlement).

-- ============================================================================
-- SURVEY SUBMISSIONS (one row per completed survey — idempotency guard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tester_survey_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programme_id uuid NOT NULL REFERENCES tester_programmes(id) ON DELETE CASCADE,
  survey_key text NOT NULL CHECK (survey_key IN ('initial', 'stage_1_feedback', 'final')),
  survey_version integer NOT NULL DEFAULT 1,
  tester_stage integer,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, survey_key)
);

CREATE INDEX IF NOT EXISTS idx_tester_submissions_user ON tester_survey_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_tester_submissions_programme ON tester_survey_submissions(programme_id);

ALTER TABLE tester_survey_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tester submissions" ON tester_survey_submissions;
CREATE POLICY "Users can view own tester submissions"
  ON tester_survey_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- SURVEY RESPONSES (structured; one row per question answer)
-- Versioned so questions can change without breaking old responses.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tester_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programme_id uuid NOT NULL REFERENCES tester_programmes(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES tester_survey_submissions(id) ON DELETE CASCADE,
  survey_key text NOT NULL CHECK (survey_key IN ('initial', 'stage_1_feedback', 'final')),
  survey_version integer NOT NULL DEFAULT 1,
  question_id text NOT NULL,
  answer_value jsonb NOT NULL, -- string | number | string[] depending on question type
  tester_stage integer,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tester_responses_user ON tester_survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_tester_responses_programme ON tester_survey_responses(programme_id);
CREATE INDEX IF NOT EXISTS idx_tester_responses_survey ON tester_survey_responses(survey_key, question_id);

ALTER TABLE tester_survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tester responses" ON tester_survey_responses;
CREATE POLICY "Users can view own tester responses"
  ON tester_survey_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- QUALIFYING SESSIONS (records which sessions counted as "meaningful" — idempotent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tester_qualifying_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programme_id uuid NOT NULL REFERENCES tester_programmes(id) ON DELETE CASCADE,
  session_type text NOT NULL, -- 'question_bank' | 'builder' | 'drill'
  session_ref text NOT NULL,  -- the source session id
  questions_answered integer,
  duration_seconds integer,
  counted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, session_type, session_ref)
);

CREATE INDEX IF NOT EXISTS idx_tester_qualifying_user ON tester_qualifying_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tester_qualifying_programme ON tester_qualifying_sessions(programme_id);

ALTER TABLE tester_qualifying_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tester qualifying sessions" ON tester_qualifying_sessions;
CREATE POLICY "Users can view own tester qualifying sessions"
  ON tester_qualifying_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ANALYTICS EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tester_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  programme_id uuid REFERENCES tester_programmes(id) ON DELETE SET NULL,
  event text NOT NULL,
  tester_stage integer,
  traffic_source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tester_events_event ON tester_analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_tester_events_user ON tester_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tester_events_created ON tester_analytics_events(created_at DESC);

ALTER TABLE tester_analytics_events ENABLE ROW LEVEL SECURITY;
-- Service role only.

-- ============================================================================
-- EMAIL QUEUE / LOG
-- Essential operational tester emails. Delivery is handled by a worker/provider;
-- this table is the durable queue + audit log. status: pending|sent|failed|skipped.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tester_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  programme_id uuid REFERENCES tester_programmes(id) ON DELETE CASCADE,
  email_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tester_email_status ON tester_email_log(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_tester_email_user ON tester_email_log(user_id);
-- Prevent duplicate one-shot emails per programme (ending-soon reminders use a dated key).
CREATE UNIQUE INDEX IF NOT EXISTS uq_tester_email_programme_key
  ON tester_email_log(programme_id, email_key);

ALTER TABLE tester_email_log ENABLE ROW LEVEL SECURITY;
-- Service role only.

-- ============================================================================
-- updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tester_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tester_programmes_updated_at ON tester_programmes;
CREATE TRIGGER trigger_tester_programmes_updated_at
  BEFORE UPDATE ON tester_programmes
  FOR EACH ROW EXECUTE FUNCTION update_tester_updated_at();

DROP TRIGGER IF EXISTS trigger_tester_config_updated_at ON tester_programme_config;
CREATE TRIGGER trigger_tester_config_updated_at
  BEFORE UPDATE ON tester_programme_config
  FOR EACH ROW EXECUTE FUNCTION update_tester_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tester_programme_config IS 'Singleton admin config for the Founding Tester Programme';
COMMENT ON TABLE tester_programmes IS 'Per-user Founding Tester Programme enrolment + stage state';
COMMENT ON TABLE tester_survey_submissions IS 'One row per completed tester survey (idempotency guard)';
COMMENT ON TABLE tester_survey_responses IS 'Structured, versioned per-question survey answers';
COMMENT ON TABLE tester_qualifying_sessions IS 'Sessions that counted as meaningful, deduplicated per programme';
COMMENT ON TABLE tester_analytics_events IS 'Funnel/analytics events for the tester programme';
COMMENT ON TABLE tester_email_log IS 'Durable queue + audit log for essential tester emails';
