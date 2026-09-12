-- Log of product / tips email campaigns sent from admin.

CREATE TABLE IF NOT EXISTS public.product_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'partial', 'failed', 'dry_run')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_email_campaigns_created_at_idx
  ON public.product_email_campaigns (created_at DESC);

ALTER TABLE public.product_email_campaigns ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no policies for anon/authenticated.
REVOKE ALL ON public.product_email_campaigns FROM PUBLIC;
GRANT ALL ON public.product_email_campaigns TO service_role;
