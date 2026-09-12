-- In-app inbox: personal and broadcast messages from admins to users.

CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL
    CHECK (char_length(subject) >= 1 AND char_length(subject) <= 200),
  body text NOT NULL
    CHECK (char_length(body) >= 1 AND char_length(body) <= 10000),
  audience text NOT NULL
    CHECK (audience IN ('personal', 'broadcast')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_created
  ON public.inbox_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_audience_created
  ON public.inbox_messages (audience, created_at DESC);

-- Personal messages: one row per recipient. Broadcasts have no rows here
-- (visible to every authenticated user).
CREATE TABLE IF NOT EXISTS public.inbox_message_recipients (
  message_id uuid NOT NULL REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_message_recipients_user
  ON public.inbox_message_recipients (user_id, message_id);

CREATE TABLE IF NOT EXISTS public.inbox_message_reads (
  message_id uuid NOT NULL REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_message_reads_user
  ON public.inbox_message_reads (user_id, message_id);

ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_message_reads ENABLE ROW LEVEL SECURITY;

-- Ordinary users: no direct table access. All reads/writes go through
-- Next.js API routes using the service role after auth checks.
-- Admins may SELECT via current_user_is_admin() for debugging in SQL editors.

DROP POLICY IF EXISTS "Admins can read inbox messages" ON public.inbox_messages;
CREATE POLICY "Admins can read inbox messages"
  ON public.inbox_messages
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can read inbox recipients" ON public.inbox_message_recipients;
CREATE POLICY "Admins can read inbox recipients"
  ON public.inbox_message_recipients
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can read inbox reads" ON public.inbox_message_reads;
CREATE POLICY "Admins can read inbox reads"
  ON public.inbox_message_reads
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

REVOKE ALL ON public.inbox_messages FROM anon;
REVOKE ALL ON public.inbox_message_recipients FROM anon;
REVOKE ALL ON public.inbox_message_reads FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.inbox_messages FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.inbox_message_recipients FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.inbox_message_reads FROM authenticated;

GRANT SELECT ON public.inbox_messages TO authenticated;
GRANT SELECT ON public.inbox_message_recipients TO authenticated;
GRANT SELECT ON public.inbox_message_reads TO authenticated;

COMMENT ON TABLE public.inbox_messages IS
  'Admin-composed inbox messages. audience=broadcast (all users) or personal (see recipients).';
COMMENT ON TABLE public.inbox_message_recipients IS
  'Target users for personal inbox messages. Empty for broadcasts.';
COMMENT ON TABLE public.inbox_message_reads IS
  'Per-user read receipts for inbox messages.';
