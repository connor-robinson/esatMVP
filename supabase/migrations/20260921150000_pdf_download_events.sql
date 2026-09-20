-- PDF download click events for admin analytics (mock papers first).

CREATE TABLE IF NOT EXISTS public.pdf_download_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL,
  asset text NOT NULL,
  href text NOT NULL,
  module_id text NULL,
  mock_number integer NULL,
  source text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pdf_download_events_category_check
    CHECK (category IN ('mock')),
  CONSTRAINT pdf_download_events_asset_check
    CHECK (asset IN ('paper', 'answers')),
  CONSTRAINT pdf_download_events_mock_number_check
    CHECK (mock_number IS NULL OR (mock_number >= 1 AND mock_number <= 5))
);

CREATE INDEX IF NOT EXISTS idx_pdf_download_events_category_created
  ON public.pdf_download_events (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_download_events_mock
  ON public.pdf_download_events (category, mock_number, created_at DESC)
  WHERE category = 'mock';

CREATE INDEX IF NOT EXISTS idx_pdf_download_events_module
  ON public.pdf_download_events (module_id, created_at DESC)
  WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pdf_download_events_user
  ON public.pdf_download_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.pdf_download_events ENABLE ROW LEVEL SECURITY;

-- Inserts go through the service-role API route. No direct client writes.

COMMENT ON TABLE public.pdf_download_events IS
  'PDF download clicks (mock papers/answers). Written by /api/downloads/track.';
