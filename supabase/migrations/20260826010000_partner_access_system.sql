-- Partner / Institution Access system
-- Separate entitlement layer from Stripe. One-time invite tokens (hashed only).

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE partner_status AS ENUM ('active', 'paused', 'ended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE partner_invite_status AS ENUM ('unused', 'redeemed', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PARTNERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  display_name text NOT NULL,
  status partner_status NOT NULL DEFAULT 'active',
  access_level text NOT NULL DEFAULT 'full',
  access_starts_at timestamptz NOT NULL DEFAULT now(),
  access_ends_at timestamptz NOT NULL,
  default_invite_expiry timestamptz,
  max_invites integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partners_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT partners_access_window CHECK (access_ends_at > access_starts_at)
);

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

CREATE OR REPLACE FUNCTION public.set_partners_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partners_updated_at ON partners;
CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partners_updated_at();

-- ============================================================================
-- PARTNER INVITES
-- Raw tokens are NEVER stored. Only SHA-256 hex hashes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_prefix text,
  status partner_invite_status NOT NULL DEFAULT 'unused',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_id uuid,
  label text,
  CONSTRAINT partner_invites_token_hash_hex CHECK (token_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_partner_invites_partner_status
  ON partner_invites(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_invites_batch
  ON partner_invites(partner_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_partner_invites_redeemed_by
  ON partner_invites(redeemed_by_user_id)
  WHERE redeemed_by_user_id IS NOT NULL;

-- ============================================================================
-- PARTNER ENTITLEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_id uuid NOT NULL REFERENCES partner_invites(id) ON DELETE RESTRICT,
  access_level text NOT NULL DEFAULT 'full',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text,
  activated_at timestamptz,
  CONSTRAINT partner_entitlements_one_invite UNIQUE (invite_id),
  CONSTRAINT partner_entitlements_one_user_per_partner UNIQUE (partner_id, user_id),
  CONSTRAINT partner_entitlements_window CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_partner_entitlements_user
  ON partner_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_entitlements_partner_active
  ON partner_entitlements(partner_id)
  WHERE revoked_at IS NULL;

-- ============================================================================
-- PARTNER FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_id uuid NOT NULL REFERENCES partner_entitlements(id) ON DELETE CASCADE,
  usefulness_rating integer NOT NULL CHECK (usefulness_rating BETWEEN 1 AND 5),
  most_useful_feature text NOT NULL,
  improvement_feedback text,
  recommendation_rating integer CHECK (recommendation_rating BETWEEN 0 AND 10),
  contact_permission boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_feedback_one_per_entitlement UNIQUE (entitlement_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_feedback_partner
  ON partner_feedback(partner_id);

CREATE TABLE IF NOT EXISTS partner_feedback_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id uuid NOT NULL REFERENCES partner_entitlements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  prompt_count integer NOT NULL DEFAULT 1 CHECK (prompt_count >= 1),
  CONSTRAINT partner_feedback_prompts_one UNIQUE (entitlement_id)
);

-- ============================================================================
-- PARTNER ANALYTICS EVENTS (first-party)
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entitlement_id uuid REFERENCES partner_entitlements(id) ON DELETE SET NULL,
  event text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_analytics_partner_event
  ON partner_analytics_events(partner_id, event, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_analytics_activation_once
  ON partner_analytics_events(entitlement_id, event)
  WHERE event = 'partner_user_activated' AND entitlement_id IS NOT NULL;

-- ============================================================================
-- REDEEM RATE LIMIT (best-effort server protection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_redeem_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_redeem_attempts_ip_time
  ON partner_redeem_attempts(ip_hash, created_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_feedback_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_redeem_attempts ENABLE ROW LEVEL SECURITY;

-- Partners: authenticated users may read active partner display fields only
-- (no notes). Admins use service role.
DROP POLICY IF EXISTS "Users can read active partners display" ON partners;
CREATE POLICY "Users can read active partners display"
  ON partners FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Invites: no direct user access (service role / RPC only)
-- Entitlements: users see own
DROP POLICY IF EXISTS "Users can view own partner entitlements" ON partner_entitlements;
CREATE POLICY "Users can view own partner entitlements"
  ON partner_entitlements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Feedback: users manage own
DROP POLICY IF EXISTS "Users can view own partner feedback" ON partner_feedback;
CREATE POLICY "Users can view own partner feedback"
  ON partner_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own partner feedback" ON partner_feedback;
CREATE POLICY "Users can insert own partner feedback"
  ON partner_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own feedback prompts" ON partner_feedback_prompts;
CREATE POLICY "Users can view own feedback prompts"
  ON partner_feedback_prompts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can upsert own feedback prompts" ON partner_feedback_prompts;
CREATE POLICY "Users can upsert own feedback prompts"
  ON partner_feedback_prompts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own feedback prompts" ON partner_feedback_prompts;
CREATE POLICY "Users can update own feedback prompts"
  ON partner_feedback_prompts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Analytics events / redeem attempts / invites: service role only (no policies)

-- ============================================================================
-- ACTIVE ENTITLEMENT HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_active_partner_entitlement(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM partner_entitlements e
    JOIN partners p ON p.id = e.partner_id
    WHERE e.user_id = p_user_id
      AND e.revoked_at IS NULL
      AND e.starts_at <= now()
      AND e.ends_at > now()
      AND p.status = 'active'
      AND p.access_starts_at <= now()
      AND p.access_ends_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_active_partner_entitlement(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_active_partner_entitlement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_partner_entitlement(uuid) TO service_role;

-- ============================================================================
-- ATOMIC REDEEM RPC
-- Server passes SHA-256 hex of the raw token. Never store raw tokens.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_partner_invite(
  p_token_hash text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite partner_invites%ROWTYPE;
  v_partner partners%ROWTYPE;
  v_entitlement partner_entitlements%ROWTYPE;
  v_starts timestamptz;
  v_ends timestamptz;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- Lock invite row
  SELECT * INTO v_invite
  FROM partner_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_partner
  FROM partners
  WHERE id = v_invite.partner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- Idempotent: same user already redeemed this invite
  IF v_invite.status = 'redeemed' AND v_invite.redeemed_by_user_id = p_user_id THEN
    SELECT * INTO v_entitlement
    FROM partner_entitlements
    WHERE invite_id = v_invite.id;

    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'partner_id', v_partner.id,
      'partner_slug', v_partner.slug,
      'partner_name', v_partner.name,
      'partner_display_name', v_partner.display_name,
      'access_level', COALESCE(v_entitlement.access_level, v_partner.access_level),
      'entitlement_id', v_entitlement.id,
      'starts_at', v_entitlement.starts_at,
      'ends_at', v_entitlement.ends_at,
      'batch_id', v_invite.batch_id,
      'batch_label', v_invite.label
    );
  END IF;

  IF v_invite.status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  IF v_invite.status = 'revoked' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unavailable');
  END IF;

  IF v_invite.status = 'expired' OR v_invite.expires_at <= now() THEN
    IF v_invite.status = 'unused' THEN
      UPDATE partner_invites SET status = 'expired' WHERE id = v_invite.id;
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_invite.status <> 'unused' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unavailable');
  END IF;

  IF v_partner.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partner_inactive');
  END IF;

  IF v_partner.access_starts_at > now() OR v_partner.access_ends_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partner_inactive');
  END IF;

  -- User already has entitlement for this partner
  IF EXISTS (
    SELECT 1 FROM partner_entitlements
    WHERE partner_id = v_partner.id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_entitled');
  END IF;

  v_starts := GREATEST(now(), v_partner.access_starts_at);
  v_ends := v_partner.access_ends_at;

  UPDATE partner_invites
  SET
    status = 'redeemed',
    redeemed_at = now(),
    redeemed_by_user_id = p_user_id
  WHERE id = v_invite.id
    AND status = 'unused';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO partner_entitlements (
    partner_id,
    user_id,
    invite_id,
    access_level,
    starts_at,
    ends_at
  ) VALUES (
    v_partner.id,
    p_user_id,
    v_invite.id,
    v_partner.access_level,
    v_starts,
    v_ends
  )
  RETURNING * INTO v_entitlement;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'partner_id', v_partner.id,
    'partner_slug', v_partner.slug,
    'partner_name', v_partner.name,
    'partner_display_name', v_partner.display_name,
    'access_level', v_entitlement.access_level,
    'entitlement_id', v_entitlement.id,
    'starts_at', v_entitlement.starts_at,
    'ends_at', v_entitlement.ends_at,
    'batch_id', v_invite.batch_id,
    'batch_label', v_invite.label
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_entitled');
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_partner_invite(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_partner_invite(text, uuid) TO service_role;

-- Peek invite without redeeming (for pre-auth validation). No user PII.
CREATE OR REPLACE FUNCTION public.peek_partner_invite(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite partner_invites%ROWTYPE;
  v_partner partners%ROWTYPE;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_invite
  FROM partner_invites
  WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_partner FROM partners WHERE id = v_invite.partner_id;

  IF v_invite.status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  IF v_invite.status = 'revoked' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unavailable');
  END IF;

  IF v_invite.status = 'expired' OR v_invite.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_partner.status <> 'active'
     OR v_partner.access_starts_at > now()
     OR v_partner.access_ends_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partner_inactive');
  END IF;

  IF v_invite.status <> 'unused' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unavailable');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'partner_slug', v_partner.slug,
    'partner_display_name', v_partner.display_name,
    'access_ends_at', v_partner.access_ends_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.peek_partner_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_partner_invite(text) TO service_role;

-- ============================================================================
-- SEED: Arkwright 2026
-- ============================================================================

INSERT INTO partners (
  slug,
  name,
  display_name,
  status,
  access_level,
  access_starts_at,
  access_ends_at,
  default_invite_expiry,
  notes
) VALUES (
  'arkwright-2026',
  'Arkwright Engineering Scholarships',
  'Arkwright Engineering Scholarships',
  'active',
  'full',
  now(),
  '2027-01-10 23:59:59+00',
  '2027-01-10 23:59:59+00',
  'Complimentary full access for Arkwright Engineering Scholars (2026 cohort).'
)
ON CONFLICT (slug) DO NOTHING;
