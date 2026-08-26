-- Secure partner RPCs: derive identity from auth.uid(), never trust client UUIDs.
-- Safe rollout:
--   1) Apply this migration (adds secure RPCs + hardens legacy)
--   2) Deploy the app that calls the new one-arg / no-arg signatures
--   3) Apply 20260826020100_revoke_legacy_partner_rpcs.sql

-- ============================================================================
-- SERVICE-ONLY: arbitrary-user entitlement lookup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.service_user_has_active_partner_entitlement(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_user_id IS NULL THEN false
    ELSE EXISTS (
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
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.service_user_has_active_partner_entitlement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.service_user_has_active_partner_entitlement(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.service_user_has_active_partner_entitlement(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.service_user_has_active_partner_entitlement(uuid) TO service_role;

-- ============================================================================
-- USER-FACING: no-arg entitlement check (auth.uid() only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_active_partner_entitlement()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.service_user_has_active_partner_entitlement(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.user_has_active_partner_entitlement() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_active_partner_entitlement() FROM anon;
GRANT EXECUTE ON FUNCTION public.user_has_active_partner_entitlement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_partner_entitlement() TO service_role;

-- Harden legacy uuid overload: authenticated callers may only query themselves.
-- Prefer service_user_has_active_partner_entitlement for service-role arbitrary lookup.
CREATE OR REPLACE FUNCTION public.user_has_active_partner_entitlement(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (no JWT): allow arbitrary lookup during transition.
  IF auth.uid() IS NULL THEN
    RETURN public.service_user_has_active_partner_entitlement(p_user_id);
  END IF;

  -- Authenticated: never allow querying another user.
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  RETURN public.service_user_has_active_partner_entitlement(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.user_has_active_partner_entitlement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_active_partner_entitlement(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.user_has_active_partner_entitlement(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_partner_entitlement(uuid) TO service_role;

-- ============================================================================
-- Core redeem implementation (single source of truth)
-- Not granted to anon/authenticated. Called only by SECURITY DEFINER wrappers.
-- ============================================================================

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

REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) TO service_role;

-- ============================================================================
-- Preferred redeem: auth.uid() only (no client-supplied user id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_partner_invite(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;
  RETURN public._redeem_partner_invite_for_user(p_token_hash, v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_partner_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_partner_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_partner_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_partner_invite(text) TO service_role;

-- ============================================================================
-- Legacy (text, uuid): harden so a user JWT cannot redeem for another UUID.
-- Temporary compatibility for service-role callers until revoke migration.
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
  v_caller uuid := auth.uid();
BEGIN
  -- Authenticated JWT: never trust a mismatched client-supplied UUID.
  IF v_caller IS NOT NULL THEN
    IF p_user_id IS DISTINCT FROM v_caller THEN
      RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
    END IF;
    RETURN public._redeem_partner_invite_for_user(p_token_hash, v_caller);
  END IF;

  -- No JWT (service_role path during transition).
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  RETURN public._redeem_partner_invite_for_user(p_token_hash, p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_partner_invite(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_partner_invite(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_partner_invite(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_partner_invite(text, uuid) TO service_role;

-- ============================================================================
-- Peek: keep anonymously callable; safe display fields only
-- ============================================================================

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

  -- Safe display fields only: no token_hash, user ids, or entitlement details.
  RETURN jsonb_build_object(
    'ok', true,
    'partner_slug', v_partner.slug,
    'partner_display_name', v_partner.display_name,
    'access_ends_at', v_partner.access_ends_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.peek_partner_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_partner_invite(text) TO anon;
GRANT EXECUTE ON FUNCTION public.peek_partner_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.peek_partner_invite(text) TO service_role;
