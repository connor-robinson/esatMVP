"use client";

import type { ReactNode } from "react";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";

/**
 * Public marketing homepage for `/`.
 * Auth state never swaps this for the dashboard; that lives at `/dashboard`.
 */
export function HomePageContent({
  socialProofSlot,
  reviewsStatsSlot,
}: {
  socialProofSlot?: ReactNode;
  reviewsStatsSlot?: ReactNode;
}) {
  return (
    <MarketingHomepage
      socialProofSlot={socialProofSlot}
      reviewsStatsSlot={reviewsStatsSlot}
    />
  );
}
