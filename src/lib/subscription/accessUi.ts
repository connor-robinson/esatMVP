/**
 * Shared client/server helpers for paywall and tester chrome decisions.
 * Authoritative access still comes from getUserAccess() / useSubscription().
 */

import type { AccessSource } from "@/lib/partners/types";
import type { SubscriptionTier } from "@/hooks/useSubscription";

export type AccessUiSnapshot = {
  hasFullAccess: boolean;
  source?: AccessSource | string | null;
  tier?: SubscriptionTier | string | null;
};

/** Hide upgrade / locked-feature / checkout CTAs. */
export function shouldShowPaywallUi(access: AccessUiSnapshot): boolean {
  return !access.hasFullAccess;
}

/**
 * Hide founding-tester join/continue chrome while partner entitlement is active.
 * Stripe-paid users keep existing tester-programme continue behaviour.
 */
export function shouldSuppressTesterChrome(access: AccessUiSnapshot): boolean {
  return access.source === "partner" || access.tier === "partner";
}

/** Product unlocked the same way for subscription, season pass, partner, tester. */
export function hasUnlockedProductAccess(access: AccessUiSnapshot): boolean {
  return access.hasFullAccess === true;
}
