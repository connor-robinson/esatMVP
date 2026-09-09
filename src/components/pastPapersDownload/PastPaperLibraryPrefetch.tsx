"use client";

import { useEffect } from "react";
import { fetchPastPaperLibraryOutline } from "@/lib/papers/pastPaperLibraryData";

/** Warm the shared past-paper outline cache while the hub tables are on screen. */
export function PastPaperLibraryPrefetch() {
  useEffect(() => {
    void fetchPastPaperLibraryOutline();
  }, []);

  return null;
}
