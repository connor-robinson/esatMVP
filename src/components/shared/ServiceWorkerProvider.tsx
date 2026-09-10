"use client";

import { useEffect } from "react";
import { cleanupLegacyEsatServiceWorkers } from "@/lib/sw/legacyCleanup";

/**
 * Emergency legacy cleanup only. Do not register a service worker.
 * Offline / PWA caching is not required for this product.
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await cleanupLegacyEsatServiceWorkers();
      } catch {
        /* Safari promise failures must not break the app */
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
