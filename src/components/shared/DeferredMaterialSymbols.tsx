"use client";

import { useEffect } from "react";

const MATERIAL_SYMBOLS_HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";

/** Loads Material Symbols after first paint so they are off the critical path. */
export function DeferredMaterialSymbols() {
  useEffect(() => {
    const existing = document.querySelector(
      `link[href="${MATERIAL_SYMBOLS_HREF}"]`,
    );
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = MATERIAL_SYMBOLS_HREF;
    document.head.appendChild(link);
  }, []);

  return null;
}
