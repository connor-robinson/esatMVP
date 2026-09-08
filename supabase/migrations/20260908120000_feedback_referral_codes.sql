-- Feedback-for-referral: one 50% Stripe promo code per user after a detailed survey.

CREATE TABLE IF NOT EXISTS public.feedback_referral_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.feedback_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  stripe_coupon_id text NOT NULL,
  stripe_promotion_code_id text NOT NULL,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checkout_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (code),
  UNIQUE (stripe_promotion_code_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_referral_codes_code
  ON public.feedback_referral_codes (code);

ALTER TABLE public.feedback_referral_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback referral submission"
  ON public.feedback_referral_submissions;
CREATE POLICY "Users can view own feedback referral submission"
  ON public.feedback_referral_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feedback referral code"
  ON public.feedback_referral_codes;
CREATE POLICY "Users can view own feedback referral code"
  ON public.feedback_referral_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.feedback_referral_submissions IS
  'Detailed product-feedback survey that unlocks a one-friend 50% referral code.';
COMMENT ON TABLE public.feedback_referral_codes IS
  'One-use Stripe promotion codes earned after feedback. Redeemable by a different user.';
