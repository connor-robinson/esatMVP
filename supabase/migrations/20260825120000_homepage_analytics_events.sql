-- Homepage / calibration funnel analytics events.
-- The API routes already write here; this table was missing in production.

CREATE TABLE IF NOT EXISTS public.homepage_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_analytics_events_event
  ON public.homepage_analytics_events (event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_homepage_analytics_events_user
  ON public.homepage_analytics_events (user_id, created_at DESC);

ALTER TABLE public.homepage_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS homepage_analytics_insert ON public.homepage_analytics_events;
CREATE POLICY homepage_analytics_insert ON public.homepage_analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

COMMENT ON TABLE public.homepage_analytics_events IS
  'Coarse product funnel events (calibration, homepage). No PII in properties.';
