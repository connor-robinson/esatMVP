-- Threaded inbox replies + legacy bug report status for admin support workflow.

ALTER TABLE public.inbox_messages
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS support_request_id uuid REFERENCES public.support_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_bug_report_id uuid REFERENCES public.app_bug_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allow_reply boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inbox_messages_direction_check'
  ) THEN
    ALTER TABLE public.inbox_messages
      ADD CONSTRAINT inbox_messages_direction_check
      CHECK (direction IN ('outbound', 'inbound'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inbox_messages_parent
  ON public.inbox_messages (parent_id, created_at ASC)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbox_messages_direction_created
  ON public.inbox_messages (direction, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_support_request
  ON public.inbox_messages (support_request_id)
  WHERE support_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbox_messages_legacy_bug
  ON public.inbox_messages (legacy_bug_report_id)
  WHERE legacy_bug_report_id IS NOT NULL;

ALTER TABLE public.app_bug_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_bug_reports_status_check'
  ) THEN
    ALTER TABLE public.app_bug_reports
      ADD CONSTRAINT app_bug_reports_status_check
      CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'spam'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_app_bug_reports_status_created
  ON public.app_bug_reports (status, created_at DESC);

COMMENT ON COLUMN public.inbox_messages.direction IS
  'outbound = ESAT Camp → user; inbound = user reply → team';
COMMENT ON COLUMN public.inbox_messages.parent_id IS
  'Reply thread root / parent message';
COMMENT ON COLUMN public.inbox_messages.allow_reply IS
  'When true, recipient can reply from their inbox';
COMMENT ON COLUMN public.app_bug_reports.status IS
  'Admin triage status (open / resolved / …)';
