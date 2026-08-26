-- Final legacy cleanup for partner RPCs.
-- Apply ONLY after 20260826160000_secure_partner_rpcs_reconcile.sql is recorded
-- in production schema_migrations, and after the app uses:
--   redeem_partner_invite(text)
--   service_user_has_active_partner_entitlement / user_has_active_partner_entitlement()
-- Do NOT apply until reconciliation migration history is confirmed.

DROP FUNCTION IF EXISTS public.redeem_partner_invite(text, uuid);
DROP FUNCTION IF EXISTS public.user_has_active_partner_entitlement(uuid);

-- Internal helper stays for the one-arg wrapper; keep service_role only.
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) TO service_role;
