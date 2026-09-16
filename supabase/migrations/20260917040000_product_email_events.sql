-- Click / unsubscribe events for product email campaigns.

CREATE TABLE IF NOT EXISTS public.product_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.product_email_campaigns (id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('click', 'unsubscribe')),
  destination_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_email_events_campaign_id_idx
  ON public.product_email_events (campaign_id);

CREATE INDEX IF NOT EXISTS product_email_events_campaign_type_idx
  ON public.product_email_events (campaign_id, event_type);

CREATE INDEX IF NOT EXISTS product_email_events_campaign_recipient_type_idx
  ON public.product_email_events (campaign_id, recipient_id, event_type);

CREATE INDEX IF NOT EXISTS product_email_events_created_at_idx
  ON public.product_email_events (created_at DESC);

ALTER TABLE public.product_email_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.product_email_events FROM PUBLIC;
GRANT ALL ON public.product_email_events TO service_role;
