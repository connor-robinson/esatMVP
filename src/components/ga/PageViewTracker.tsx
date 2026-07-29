"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_ENABLED, trackEvent, trackPageView } from "@/lib/ga";

/**
 * Sends a GA4 page_view whenever the App Router path or query string changes.
 * Initial page_view is also fired here because send_page_view is disabled in
 * the global config (so we own SPA navigations).
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ENABLED || !pathname) return;

    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    trackPageView(url);
    trackEvent("page_view", { page_path: url });
  }, [pathname, searchParams]);

  return null;
}
