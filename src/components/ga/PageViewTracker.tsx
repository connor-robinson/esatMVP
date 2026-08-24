"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_ENABLED, trackPageView } from "@/lib/ga";
import { useAnalyticsConsent } from "./AnalyticsConsentProvider";

/**
 * Sends one GA4 page_view per App Router path/query change after consent.
 * Relies on send_page_view: false in the global config to avoid duplicates.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useAnalyticsConsent();
  const lastSentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_ENABLED || !pathname) return;

    if (status !== "accepted") {
      lastSentKeyRef.current = null;
      return;
    }

    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    const key = url;

    // Avoid duplicate sends for the same consented URL (e.g. Strict Mode).
    if (lastSentKeyRef.current === key) return;
    lastSentKeyRef.current = key;

    trackPageView(url);
  }, [pathname, searchParams, status]);

  return null;
}
