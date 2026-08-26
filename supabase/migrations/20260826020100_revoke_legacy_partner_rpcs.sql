-- Revoke legacy partner RPC signatures after the app uses auth.uid()-based RPCs.
-- Apply ONLY after 20260826020000_secure_partner_rpcs.sql and after the app
-- deploy that calls redeem_partner_invite(text) and
-- service_user_has_active_partner_entitlement / user_has_active_partner_entitlement().

DROP FUNCTION IF EXISTS public.redeem_partner_invite(text, uuid);
DROP FUNCTION IF EXISTS public.user_has_active_partner_entitlement(uuid);

-- Internal helper stays for the one-arg wrapper; keep service_role only.
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._redeem_partner_invite_for_user(text, uuid) TO service_role;
