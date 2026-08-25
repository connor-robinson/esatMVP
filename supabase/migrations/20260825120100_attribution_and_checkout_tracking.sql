-- First-touch attribution, Stripe checkout audit rows, and GA commerce dedupe.

-- ---------------------------------------------------------------------------
-- attribution_visits (anon first-touch, write-once via API)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.attribution_visits (
  anon_id text PRIMARY KEY,
  first_landing_page text NOT NULL,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  gclid text,
  ga_client_id text,
  first_touch_at timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  merged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_visits_user_id
  ON public.attribution_visits (user_id);

ALTER TABLE public.attribution_visits ENABLE ROW LEVEL SECURITY;
-- No client policies: service-role API routes only.

COMMENT ON TABLE public.attribution_visits IS
  'Anonymous first-touch attribution. First-touch fields are immutable after insert.';

-- ---------------------------------------------------------------------------
-- profiles first-touch snapshot
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS attribution_anon_id text,
  ADD COLUMN IF NOT EXISTS first_landing_page text,
  ADD COLUMN IF NOT EXISTS first_referrer text,
  ADD COLUMN IF NOT EXISTS first_utm_source text,
  ADD COLUMN IF NOT EXISTS first_utm_medium text,
  ADD COLUMN IF NOT EXISTS first_utm_campaign text,
  ADD COLUMN IF NOT EXISTS first_gclid text,
  ADD COLUMN IF NOT EXISTS first_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS ga_client_id text;

COMMENT ON COLUMN public.profiles.first_touch_at IS
  'Immutable first-touch timestamp copied from attribution_visits on merge.';
COMMENT ON COLUMN public.profiles.ga_client_id IS
  'Latest known GA client_id (consent only) for Measurement Protocol.';

-- ---------------------------------------------------------------------------
-- checkout_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.checkout_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checkout_session_id text,
  subscription_id text,
  invoice_id text,
  amount_total integer,
  currency text,
  payment_status text,
  plan_type text,
  billing_reason text,
  stripe_customer_id text,
  raw_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_events_user_id
  ON public.checkout_events (user_id);

CREATE INDEX IF NOT EXISTS idx_checkout_events_checkout_session_id
  ON public.checkout_events (checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_checkout_events_subscription_id
  ON public.checkout_events (subscription_id);

CREATE INDEX IF NOT EXISTS idx_checkout_events_invoice_id
  ON public.checkout_events (invoice_id);

ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;
-- No client policies: service-role only.

COMMENT ON TABLE public.checkout_events IS
  'Stripe checkout / invoice audit trail for attribution and GA commerce.';

-- ---------------------------------------------------------------------------
-- ga_commerce_events (dedupe server + client)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ga_commerce_events (
  event_name text NOT NULL,
  transaction_id text NOT NULL,
  stripe_event_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_name, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_ga_commerce_events_user_id
  ON public.ga_commerce_events (user_id);

ALTER TABLE public.ga_commerce_events ENABLE ROW LEVEL SECURITY;
-- No client policies: service-role only.

COMMENT ON TABLE public.ga_commerce_events IS
  'Deduped GA4 commerce events (trial_started, purchase, cancelled, renewed).';
