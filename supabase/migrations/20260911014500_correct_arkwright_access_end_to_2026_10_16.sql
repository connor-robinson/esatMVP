-- Correct Arkwright access end from 2027-10-16 to 2026-10-16.
-- Data-only: keep existing entitlements active; no revokes, status, or re-claims.

DO $$
DECLARE
  v_partner_id uuid;
  v_new_ends timestamptz := TIMESTAMPTZ '2026-10-16 23:59:59+00';
BEGIN
  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE slug = 'arkwright-2026';

  IF v_partner_id IS NULL THEN
    RAISE NOTICE 'arkwright-2026 not found; skipping';
    RETURN;
  END IF;

  UPDATE public.partners
  SET
    access_ends_at = v_new_ends,
    default_invite_expiry = v_new_ends
  WHERE id = v_partner_id;

  -- Align live entitlements so partner window and entitlement ends_at stay in sync.
  UPDATE public.partner_entitlements
  SET ends_at = v_new_ends
  WHERE partner_id = v_partner_id
    AND revoked_at IS NULL;

  UPDATE public.partner_invites
  SET expires_at = v_new_ends
  WHERE partner_id = v_partner_id;

  UPDATE public.partner_cohort_codes
  SET expires_at = v_new_ends
  WHERE partner_id = v_partner_id;
END $$;
