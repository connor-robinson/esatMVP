/**
 * Preserve selected pricing plan through signup / login.
 */

import type { PlanId } from "@/lib/stripe/best-value";

export type PaidPlanId = Exclude<PlanId, "free">;

const PAID_PLANS = new Set<string>(["weekly", "monthly", "season_pass"]);

export function isPaidPlanId(value: string | null | undefined): value is PaidPlanId {
  return Boolean(value && PAID_PLANS.has(value));
}

/** Return destination after auth: pricing with checkout=plan for auto-continue. */
export function pricingCheckoutRedirectPath(plan: PaidPlanId): string {
  return `/pricing?checkout=${encodeURIComponent(plan)}`;
}

/**
 * Logged-out visitors starting a paid plan go to signup (not sign-in)
 * with plan + return destination preserved in the URL.
 */
export function buildCheckoutSignupUrl(plan: PaidPlanId): string {
  const redirectTo = pricingCheckoutRedirectPath(plan);
  const params = new URLSearchParams({
    mode: "signup",
    redirectTo,
    plan,
  });
  return `/login?${params.toString()}`;
}

export function buildCheckoutSignInUrl(plan: PaidPlanId): string {
  const redirectTo = pricingCheckoutRedirectPath(plan);
  const params = new URLSearchParams({
    mode: "signin",
    redirectTo,
    plan,
  });
  return `/login?${params.toString()}`;
}
