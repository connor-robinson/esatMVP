"use client";

import { MarketingHomepage } from "@/components/home/MarketingHomepage";
import type { HomepageSocialProofStats } from "@/lib/homepage/socialProofTypes";

/**
 * Public marketing homepage for `/`.
 * Auth state never swaps this for the dashboard; that lives at `/dashboard`.
 */
export function HomePageContent({
  socialProof,
}: {
  socialProof: HomepageSocialProofStats | null;
}) {
  return <MarketingHomepage socialProof={socialProof} />;
}
