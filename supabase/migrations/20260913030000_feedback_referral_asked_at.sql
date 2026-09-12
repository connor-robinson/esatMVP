-- Track when a user was first shown the feedback-for-referral invite / survey.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feedback_referral_asked_at timestamptz;

COMMENT ON COLUMN public.profiles.feedback_referral_asked_at IS
  'First time the feedback-for-referral invite or survey was shown to this user.';

-- Backfill: anyone who already answered was asked at least by submission time.
UPDATE public.profiles p
SET feedback_referral_asked_at = s.created_at
FROM public.feedback_referral_submissions s
WHERE s.user_id = p.id
  AND p.feedback_referral_asked_at IS NULL;
