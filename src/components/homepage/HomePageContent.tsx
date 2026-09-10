"use client";

import type { ReactNode } from "react";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";
import type { HomepageHeroVariant } from "@/lib/homepage/heroAbTest";

/**
 * Public marketing homepage for `/`.
 * Auth state never swaps this for the dashboard; that lives at `/dashboard`.
 */
export function HomePageContent({
  socialProofSlot,
  heroVariant = "control",
}: {
  socialProofSlot?: ReactNode;
  heroVariant?: HomepageHeroVariant;
}) {
  return (
    <MarketingHomepage
      socialProofSlot={socialProofSlot}
      heroVariant={heroVariant}
    />
  );
}
