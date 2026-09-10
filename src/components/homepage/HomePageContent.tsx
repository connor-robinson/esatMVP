"use client";

import type { ReactNode } from "react";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";

/**
 * Public marketing homepage for `/`.
 * Auth state never swaps this for the dashboard; that lives at `/dashboard`.
 */
export function HomePageContent({
  socialProofSlot,
}: {
  socialProofSlot?: ReactNode;
}) {
  return <MarketingHomepage socialProofSlot={socialProofSlot} />;
}
