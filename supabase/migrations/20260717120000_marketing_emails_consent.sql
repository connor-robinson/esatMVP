-- Store whether the user opted in to product/marketing emails (null = not yet asked).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_emails_consent boolean;

COMMENT ON COLUMN public.profiles.marketing_emails_consent IS
  'User opted in to product/marketing emails (null = not yet asked)';
