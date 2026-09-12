"use client";

import { useCallback, useState } from "react";
import {
  captureGaCheckoutAttribution,
  currentGaPath,
  rememberGaSourcePage,
  trackEvent,
} from "@/lib/ga";

type StartTrialResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Lowest-friction monthly trial start: create Stripe Checkout and redirect.
 * Monthly is the only plan that receives `trial_period_days`.
 */
export function useStartMonthlyTrialCheckout() {
  const [loading, setLoading] = useState(false);

  const startTrial = useCallback(async (): Promise<StartTrialResult> => {
    if (loading) return { ok: false, error: "Already starting…" };
    setLoading(true);
    try {
      const sourcePage = currentGaPath() ?? "/";
      rememberGaSourcePage(sourcePage);
      const ga = await captureGaCheckoutAttribution();
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: "monthly",
          ...ga,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (data.url) {
        trackEvent("begin_checkout", {
          plan_type: "monthly",
          currency: "GBP",
        });
        window.location.href = data.url;
        return { ok: true };
      }
      throw new Error(
        typeof data.error === "string" ? data.error : "Could not start checkout",
      );
    } catch (err) {
      setLoading(false);
      return {
        ok: false,
        error:
          err instanceof Error ? err.message : "Could not start checkout. Try again.",
      };
    }
  }, [loading]);

  return { startTrial, loading };
}
