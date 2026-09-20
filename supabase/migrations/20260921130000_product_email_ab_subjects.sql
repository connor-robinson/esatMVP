-- Subject-line A/B testing for product email campaigns.

ALTER TABLE public.product_email_campaigns
  ADD COLUMN IF NOT EXISTS subject_b text;

CREATE TABLE IF NOT EXISTS public.product_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.product_email_campaigns (id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  variant text NOT NULL CHECK (variant IN ('a', 'b')),
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS product_email_sends_campaign_id_idx
  ON public.product_email_sends (campaign_id);

CREATE INDEX IF NOT EXISTS product_email_sends_campaign_variant_idx
  ON public.product_email_sends (campaign_id, variant);

ALTER TABLE public.product_email_sends ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.product_email_sends FROM PUBLIC;
GRANT ALL ON public.product_email_sends TO service_role;
