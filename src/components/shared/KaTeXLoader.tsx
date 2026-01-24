"use client";

import { useEffect } from "react";

/**
 * KaTeX Loader Component
 * Ensures KaTeX CSS is loaded for math rendering
 * KaTeX doesn't need complex initialization like MathJax
 */
export function KaTeXLoader() {
  useEffect(() => {
    // KaTeX CSS is imported via useKaTeX.ts
    // This component exists for consistency with the previous MathJaxLoader
    // and can be used for any future KaTeX-specific initialization
    if (typeof window !== "undefined") {
      // KaTeX is ready immediately - no async loading needed
      console.log("[KaTeX] KaTeX is ready");
    }
  }, []);

  return null;
}






























