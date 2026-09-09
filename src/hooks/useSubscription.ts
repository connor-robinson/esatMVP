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
    return {
      tier: "free",
      hasFullAccess: cachedAccess ?? false,
      isLoading: cachedAccess === undefined,
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
          setState({ tier: "free", hasFullAccess: false, isLoading: false });
          writeCachedHasFullAccess(false);
        }
      }
    }

    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
