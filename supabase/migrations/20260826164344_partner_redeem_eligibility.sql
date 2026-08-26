-- Partner redeem eligibility: block paid users and same-partner active
-- entitlements BEFORE consuming invites / incrementing cohort caps.
-- Does not revoke legacy redeem_partner_invite(text, uuid).

CREATE OR REPLACE FUNCTION public._user_has_active_paid_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Stripe subscription (active / trialing, period not ended)
  IF EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status IN ('active', 'trialing')
      AND s.current_period_end > now()
  ) THEN
    RETURN true;
  END IF;

  -- Season pass / one-time purchase (access_until is inclusive date, UTC day)
  IF EXISTS (
    SELECT 1
    FROM one_time_purchases p
    WHERE p.user_id = p_user_id
      AND p.access_until >= (timezone('utc', now()))::date
  ) THEN
    RETURN true;
  END IF;

  -- Founding tester is NOT treated as paid for partner redeem blocking.
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public._user_has_active_paid_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._user_has_active_paid_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public._user_has_active_paid_access(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._user_has_active_paid_access(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public._redeem_partner_invite_for_user(
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
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

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

  -- Paid users must not consume partner codes (tester is not paid).
  IF public._user_has_active_paid_access(p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_paid');
  END IF;

  -- Existing entitlement for this partner: do not consume the invite.
  SELECT * INTO v_entitlement
  FROM partner_entitlements
  WHERE partner_id = v_partner.id
    AND user_id = p_user_id;

  IF FOUND THEN
    IF v_entitlement.revoked_at IS NULL
       AND v_entitlement.starts_at <= now()
       AND v_entitlement.ends_at > now() THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'already_partner_entitled',
        'partner_id', v_partner.id,
        'partner_slug', v_partner.slug,
        'partner_name', v_partner.name,
        'partner_display_name', v_partner.display_name,
        'ends_at', v_entitlement.ends_at
      );
    END IF;
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

  -- Paid users must not increment cohort caps (tester is not paid).
  IF public._user_has_active_paid_access(v_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_paid');
  END IF;

  -- Existing entitlement for this partner: do not increment redemption_count.
  SELECT * INTO v_entitlement
  FROM partner_entitlements
  WHERE partner_id = v_partner.id
    AND user_id = v_user_id;

  IF FOUND THEN
    IF v_entitlement.revoked_at IS NULL
       AND v_entitlement.starts_at <= now()
       AND v_entitlement.ends_at > now() THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'already_partner_entitled',
        'partner_id', v_partner.id,
        'partner_slug', v_partner.slug,
        'partner_name', v_partner.name,
        'partner_display_name', v_partner.display_name,
        'ends_at', v_entitlement.ends_at
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'already_entitled');
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
