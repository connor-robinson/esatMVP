/**
 * Preserve selected pricing plan through signup / login.
 */

import type { PlanId } from "@/lib/stripe/best-value";

export type PaidPlanId = Exclude<PlanId, "free">;

const PAID_PLANS = new Set<string>(["weekly", "monthly", "season_pass"]);

export function isPaidPlanId(value: string | null | undefined): value is PaidPlanId {
  return Boolean(value && PAID_PLANS.has(value));
}

function normalizeReferralCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

/** Return destination after auth: pricing with checkout=plan for auto-continue. */
export function pricingCheckoutRedirectPath(
  plan: PaidPlanId,
  referralCode?: string | null,
): string {
  const params = new URLSearchParams({ checkout: plan });
  const code = normalizeReferralCode(referralCode);
  if (code) params.set("code", code);
  return `/pricing?${params.toString()}`;
}

/**
 * Logged-out visitors starting a paid plan go to signup (not sign-in)
 * with plan + return destination preserved in the URL.
 */
export function buildCheckoutSignupUrl(
  plan: PaidPlanId,
  referralCode?: string | null,
): string {
  const redirectTo = pricingCheckoutRedirectPath(plan, referralCode);
  const params = new URLSearchParams({
    mode: "signup",
    redirectTo,
    plan,
  });
  return `/login?${params.toString()}`;
}

export function buildCheckoutSignInUrl(
  plan: PaidPlanId,
  referralCode?: string | null,
): string {
  const redirectTo = pricingCheckoutRedirectPath(plan, referralCode);
  const params = new URLSearchParams({
    mode: "signin",
    redirectTo,
    plan,
  });
  return `/login?${params.toString()}`;
}
