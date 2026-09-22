/**
 * Extend useSubscription with partner access fields from /api/subscription/status.
 */

"use client";

import { useState, useEffect } from "react";

export type SubscriptionTier =
  | "free"
  | "weekly"
  | "monthly"
  | "season_pass"
  | "tester"
  | "partner";

export interface TesterAccessSummary {
  isMember: boolean;
  status: string;
  premiumActive: boolean;
  accessExpiresAt: string | null;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  hasFullAccess: boolean;
  isLoading: boolean;
  source?: string;
  partnerId?: string | null;
  partnerSlug?: string | null;
  partnerDisplayName?: string | null;
  partnerBatchLabel?: string | null;
  partnerActivated?: boolean;
  partnerEndsAt?: string | null;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  accessUntil?: string;
  cancelAtPeriodEnd?: boolean;
  pendingPlan?: "weekly" | "monthly" | "season_pass" | null;
  tester?: TesterAccessSummary;
}

const SUBSCRIPTION_ACCESS_CACHE_KEY = "nocalc:subscriptionHasFullAccess";

function readStorageFlag(storage: Storage): boolean | undefined {
  try {
    const raw = storage.getItem(SUBSCRIPTION_ACCESS_CACHE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* private mode / quota */
  }
  return undefined;
}

export function readCachedHasFullAccess(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  const fromLocal = readStorageFlag(localStorage);
  if (fromLocal !== undefined) return fromLocal;
  return readStorageFlag(sessionStorage);
}

export function writeCachedHasFullAccess(value: boolean) {
  const raw = String(value);
  try {
    localStorage.setItem(SUBSCRIPTION_ACCESS_CACHE_KEY, raw);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(SUBSCRIPTION_ACCESS_CACHE_KEY, raw);
  } catch {
    /* ignore */
  }
}

export function useSubscription(): SubscriptionStatus {
  const [state, setState] = useState<SubscriptionStatus>(() => {
    const cachedAccess = readCachedHasFullAccess();
    // Only trust a positive cache for instant paid paint. A stale `false`
    // (e.g. before partner redeem) must not unlock free-tier shortcuts until
    // /api/subscription/status confirms access.
    const trustedPaid = cachedAccess === true;
    return {
      tier: "free",
      hasFullAccess: trustedPaid,
      isLoading: !trustedPaid,
    };
  });

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        if (!mounted) return;
        const hasFullAccess = data.hasFullAccess ?? false;
        writeCachedHasFullAccess(hasFullAccess);
        setState({
          tier: data.tier ?? "free",
          hasFullAccess,
          isLoading: false,
          source: data.source,
          partnerId: data.partnerId ?? null,
          partnerSlug: data.partnerSlug ?? null,
          partnerDisplayName: data.partnerDisplayName ?? null,
          partnerBatchLabel: data.partnerBatchLabel ?? null,
          partnerActivated: data.partnerActivated === true,
          partnerEndsAt: data.partnerEndsAt ?? null,
          subscriptionStatus: data.subscriptionStatus,
          currentPeriodEnd: data.currentPeriodEnd,
          accessUntil: data.accessUntil,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
          pendingPlan: data.pendingPlan ?? null,
          tester: data.tester,
        });
      } catch {
        if (mounted) {
          // Keep any trusted paid cache; never persist a false negative.
          setState((prev) => ({
            ...prev,
            isLoading: false,
            hasFullAccess: prev.hasFullAccess,
            tier: prev.hasFullAccess ? prev.tier : "free",
          }));
        }
      }
    }

    // Avoid indefinite accessPending when the status request hangs.
    const hangTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setState((prev) =>
        prev.isLoading ? { ...prev, isLoading: false } : prev,
      );
    }, 8_000);

    fetchStatus();
    return () => {
      mounted = false;
      window.clearTimeout(hangTimeout);
    };
  }, []);

  return state;
}
