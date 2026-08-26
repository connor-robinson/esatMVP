-- Human-friendly individual access codes reuse partner_invites.token_hash.
-- Cohort codes are reusable shared codes with a max-redemption cap.
-- Does not modify redeem_partner_invite(text) / auth.uid() enforcement.

-- ============================================================================
-- Entitlements: allow cohort-sourced rows
-- ============================================================================

ALTER TABLE partner_entitlements
  ALTER COLUMN invite_id DROP NOT NULL;

ALTER TABLE partner_entitlements
  ADD COLUMN IF NOT EXISTS cohort_code_id uuid;

-- ============================================================================
-- COHORT CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_cohort_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  -- Shared public code for admin display. Individual invites still hash-only.
  code_normalized text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  max_redemptions integer NOT NULL,
  redemption_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_cohort_codes_hash_hex CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT partner_cohort_codes_format CHECK (code_normalized ~ '^[A-Z0-9]{6,24}$'),
  CONSTRAINT partner_cohort_codes_status CHECK (status IN ('active', 'disabled')),
  CONSTRAINT partner_cohort_codes_max CHECK (max_redemptions > 0),
  CONSTRAINT partner_cohort_codes_count CHECK (redemption_count >= 0),
  CONSTRAINT partner_cohort_codes_cap CHECK (redemption_count <= max_redemptions)
);

CREATE INDEX IF NOT EXISTS idx_partner_cohort_codes_partner
  ON partner_cohort_codes(partner_id, status);

ALTER TABLE partner_entitlements
  DROP CONSTRAINT IF EXISTS partner_entitlements_cohort_code_id_fkey;

ALTER TABLE partner_entitlements
  ADD CONSTRAINT partner_entitlements_cohort_code_id_fkey
  FOREIGN KEY (cohort_code_id) REFERENCES partner_cohort_codes(id) ON DELETE RESTRICT;

ALTER TABLE partner_entitlements
  DROP CONSTRAINT IF EXISTS partner_entitlements_source_xor;

ALTER TABLE partner_entitlements
  ADD CONSTRAINT partner_entitlements_source_xor CHECK (
    (invite_id IS NOT NULL AND cohort_code_id IS NULL)
    OR (invite_id IS NULL AND cohort_code_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_partner_entitlements_cohort
  ON partner_entitlements(cohort_code_id)
  WHERE cohort_code_id IS NOT NULL;

ALTER TABLE partner_cohort_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Peek cohort (anon-safe display fields only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.peek_partner_cohort_code(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code partner_cohort_codes%ROWTYPE;
  v_partner partners%ROWTYPE;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_code
  FROM partner_cohort_codes
  WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_partner FROM partners WHERE id = v_code.partner_id;

  IF v_code.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unavailable');
  END IF;

  IF v_code.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_code.redemption_count >= v_code.max_redemptions THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  IF v_partner.status <> 'active'
     OR v_partner.access_starts_at > now()
     OR v_partner.access_ends_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partner_inactive');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'kind', 'cohort',
    'partner_slug', v_partner.slug,
    'partner_display_name', v_partner.display_name,
    'access_ends_at', v_partner.access_ends_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.peek_partner_cohort_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_partner_cohort_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.peek_partner_cohort_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.peek_partner_cohort_code(text) TO service_role;

-- ============================================================================
-- Redeem cohort: auth.uid() only. Atomic cap + one entitlement per user/partner.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_partner_cohort_code(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code partner_cohort_codes%ROWTYPE;
  v_partner partners%ROWTYPE;
  v_entitlement partner_entitlements%ROWTYPE;
  v_starts timestamptz;
  v_ends timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_code
  FROM partner_cohort_codes
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_partner
  FROM partners
  WHERE id = v_code.partner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  -- Idempotent: this user already redeemed this cohort code
  SELECT * INTO v_entitlement
  FROM partner_entitlements
  WHERE cohort_code_id = v_code.id
    AND user_id = v_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'kind', 'cohort',
      'partner_id', v_partner.id,
      'partner_slug', v_partner.slug,
      'partner_name', v_partner.name,
      'partner_display_name', v_partner.display_name,
      'access_level', COALESCE(v_entitlement.access_level, v_partner.access_level),
      'entitlement_id', v_entitlement.id,
      'starts_at', v_entitlement.starts_at,
      'ends_at', v_entitlement.ends_at,
      'batch_id', NULL,
      'batch_label', v_code.label
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM partner_entitlements
    WHERE partner_id = v_partner.id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_entitled');
  END IF;

  IF v_code.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unavailable');
  END IF;

  IF v_code.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_partner.status <> 'active'
     OR v_partner.access_starts_at > now()
     OR v_partner.access_ends_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'partner_inactive');
  END IF;

  UPDATE partner_cohort_codes
  SET redemption_count = redemption_count + 1
  WHERE id = v_code.id
    AND status = 'active'
    AND expires_at > now()
    AND redemption_count < max_redemptions;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  v_starts := GREATEST(now(), v_partner.access_starts_at);
  v_ends := v_partner.access_ends_at;

  INSERT INTO partner_entitlements (
    partner_id,
    user_id,
    invite_id,
    cohort_code_id,
    access_level,
    starts_at,
    ends_at
  ) VALUES (
    v_partner.id,
    v_user_id,
    NULL,
    v_code.id,
    v_partner.access_level,
    v_starts,
    v_ends
  )
  RETURNING * INTO v_entitlement;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'kind', 'cohort',
    'partner_id', v_partner.id,
    'partner_slug', v_partner.slug,
    'partner_name', v_partner.name,
    'partner_display_name', v_partner.display_name,
    'access_level', v_entitlement.access_level,
    'entitlement_id', v_entitlement.id,
    'starts_at', v_entitlement.starts_at,
    'ends_at', v_entitlement.ends_at,
    'batch_id', NULL,
    'batch_label', v_code.label
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_entitled');
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_partner_cohort_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_partner_cohort_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_partner_cohort_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_partner_cohort_code(text) TO service_role;
