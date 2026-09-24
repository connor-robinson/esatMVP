-- Stop new Arkwright redemptions. Students who already claimed keep access
-- until the partner entitlement end date.

UPDATE public.partner_cohort_codes
SET expires_at = timestamptz '2026-09-24 20:30:00+00'
WHERE partner_id IN (
  SELECT id FROM public.partners WHERE slug = 'arkwright-2026'
)
AND expires_at > timestamptz '2026-09-24 20:30:00+00';

UPDATE public.partner_invites
SET
  status = 'expired',
  expires_at = timestamptz '2026-09-24 20:30:00+00'
WHERE partner_id IN (
  SELECT id FROM public.partners WHERE slug = 'arkwright-2026'
)
AND status = 'unused';
