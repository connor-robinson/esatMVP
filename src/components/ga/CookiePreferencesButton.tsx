"use client";

import { openCookiePreferences } from "@/lib/ga";

/** Visible control to reopen the analytics cookie banner. */
export function CookiePreferencesButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={
        className ??
        "rounded-organic-md bg-surface-mid px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      }
    >
      Cookie preferences
    </button>
  );
}
