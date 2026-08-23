"use client";

import { useEffect } from "react";
import { markSiteVisited } from "@/lib/siteVisit";

/** Marks the device as a returning visitor after the first page load. */
export function SiteVisitMarker() {
  useEffect(() => {
    markSiteVisited();
  }, []);

  return null;
}
