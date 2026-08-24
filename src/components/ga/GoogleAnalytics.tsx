"use client";

import { useEffect } from "react";
import { useAnalyticsConsent } from "./AnalyticsConsentProvider";
import { GA_MEASUREMENT_ID } from "@/lib/ga";
import { loadGoogleAnalytics } from "@/lib/ga/loadGa";

/**
 * Boots GA4 only after analytics consent is accepted.
 * Uses imperative DOM script injection — next/script inline init is unreliable
 * when the component mounts after the first paint (consent gate).
 */
export function GoogleAnalytics() {
  const { status } = useAnalyticsConsent();

  useEffect(() => {
    if (status !== "accepted" || !GA_MEASUREMENT_ID) return;

    let cancelled = false;
    void loadGoogleAnalytics(GA_MEASUREMENT_ID).catch((error) => {
      if (!cancelled && process.env.NODE_ENV !== "production") {
        console.warn("[ga] failed to load", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
