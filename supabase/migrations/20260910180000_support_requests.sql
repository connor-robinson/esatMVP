-- Asynchronous customer support tickets (ESAT Camp Help).
-- Source of truth for support messages. Email notification is best-effort.

CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reply_email text NOT NULL
    CHECK (
      char_length(reply_email) >= 5
      AND char_length(reply_email) <= 254
      AND reply_email LIKE '%@%'
    ),
  category text NOT NULL
    CHECK (
      category IN (
        'technical_problem',
        'question_or_content_error',
        'subscription_or_payment',
        'account_or_access',
        'feedback',
        'other'
      )
    ),
  subject text NOT NULL
    CHECK (char_length(subject) >= 2 AND char_length(subject) <= 120),
  message text NOT NULL
    CHECK (char_length(message) >= 3 AND char_length(message) <= 4000),
  page_url text
    CHECK (page_url IS NULL OR char_length(page_url) <= 1000),
  user_agent text
    CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  viewport text
    CHECK (viewport IS NULL OR char_length(viewport) <= 64),
  platform text
    CHECK (platform IS NULL OR char_length(platform) <= 120),
  app_version text
    CHECK (app_version IS NULL OR char_length(app_version) <= 64),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'spam')),
  email_delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (
      email_delivery_status IN (
        'pending',
        'sent',
        'failed',
        'not_configured',
        'skipped_spam'
      )
    ),
  email_provider_id text
    CHECK (email_provider_id IS NULL OR char_length(email_provider_id) <= 200),
  email_delivery_error text
    CHECK (email_delivery_error IS NULL OR char_length(email_delivery_error) <= 500),
  idempotency_key text
    CHECK (idempotency_key IS NULL OR char_length(idempotency_key) <= 80),
  ip_hash text
    CHECK (ip_hash IS NULL OR char_length(ip_hash) <= 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_requests_idempotency
  ON public.support_requests (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_requests_status_created
  ON public.support_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_created
  ON public.support_requests (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_requests_ip_created
  ON public.support_requests (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_support_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_requests_updated_at ON public.support_requests;
CREATE TRIGGER trg_support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_support_requests_updated_at();

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: ordinary users cannot read or write
-- this table directly. All inserts go through a server route using the
-- service role. Admins may SELECT via current_user_is_admin().

DROP POLICY IF EXISTS "Admins can read support requests" ON public.support_requests;
CREATE POLICY "Admins can read support requests"
  ON public.support_requests
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update support requests" ON public.support_requests;
CREATE POLICY "Admins can update support requests"
  ON public.support_requests
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

REVOKE ALL ON public.support_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.support_requests FROM authenticated;
GRANT SELECT, UPDATE ON public.support_requests TO authenticated;

COMMENT ON TABLE public.support_requests IS
  'Customer support tickets submitted via the Help launcher. Server-only writes.';
