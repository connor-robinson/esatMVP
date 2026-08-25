"use client";

import { useEffect } from "react";
import {
  getOrCreateAttributionAnonId,
  hasPostedFirstTouch,
  markFirstTouchPosted,
  readAttributionAnonId,
} from "@/lib/attribution/anonId";
import { captureFirstTouchFromBrowser } from "@/lib/attribution/capture";
import { hasAnalyticsConsent } from "@/lib/ga";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";

/**
 * Captures first-touch attribution once per browser and merges to the
 * authenticated user after signup/sign-in.
 */
export function AttributionBootstrap() {
  const session = useSupabaseSession();

  useEffect(() => {
    const anonId = getOrCreateAttributionAnonId();
    if (!anonId || hasPostedFirstTouch()) return;

    const payload = captureFirstTouchFromBrowser({
      anonId,
      includeGaClientId: hasAnalyticsConsent(),
    });
    if (!payload) return;

    void fetch("/api/attribution/first-touch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) markFirstTouchPosted();
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const anonId = readAttributionAnonId();
    if (!anonId) return;

    void fetch("/api/attribution/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anon_id: anonId,
        ga_client_id: hasAnalyticsConsent()
          ? captureFirstTouchFromBrowser({
              anonId,
              includeGaClientId: true,
            })?.ga_client_id ?? null
          : null,
      }),
      keepalive: true,
    }).catch(() => {
      /* non-critical */
    });
  }, [session?.user?.id]);

  return null;
}
