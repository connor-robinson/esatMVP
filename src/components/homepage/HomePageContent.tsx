"use client";

import { MarketingHomepage } from "@/components/home/MarketingHomepage";

/**
 * Public marketing homepage for `/`.
 * Auth state never swaps this for the dashboard; that lives at `/dashboard`.
 */
export function HomePageContent() {
  return <MarketingHomepage />;
}
