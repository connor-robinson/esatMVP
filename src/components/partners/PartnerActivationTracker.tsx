"use client";

import { useEffect } from "react";
import { trackPartnerUserActivatedGa } from "@/lib/partners/analytics";

const FIRED_KEY = "nocalc:partnerActivatedGa";

/**
 * Fires partner_user_activated once per browser when the user has activated.
 */
export function PartnerActivationTracker() {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (sessionStorage.getItem(FIRED_KEY) === "1") return;
        const res = await fetch("/api/subscription/status", {
          cache: "no-store",
        });
        if (!res.ok || !mounted) return;
        const data = await res.json();
        if (!data.partnerActivated || !data.partnerSlug) return;
        trackPartnerUserActivatedGa({
          partnerSlug: data.partnerSlug,
          batchLabel: data.partnerBatchLabel ?? null,
        });
        sessionStorage.setItem(FIRED_KEY, "1");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
