"use client";

import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";
import { openCookiePreferences } from "@/lib/ga";

/**
 * Site-wide legal strip: cookie policy + reopen analytics preferences.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface-elevated/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-center text-xs text-text-muted sm:flex-row sm:px-6 sm:text-left">
        <p>{BRAND_CONFIG.copyright}</p>
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          <Link
            href="/cookie-policy"
            className="text-text-muted transition-colors hover:text-text"
          >
            Cookie Policy
          </Link>
          <button
            type="button"
            onClick={() => openCookiePreferences()}
            className="text-text-muted transition-colors hover:text-text"
          >
            Cookie preferences
          </button>
          <Link
            href="/about"
            className="text-text-muted transition-colors hover:text-text"
          >
            About
          </Link>
          <Link
            href="/help"
            className="text-text-muted transition-colors hover:text-text"
          >
            Help
          </Link>
        </nav>
      </div>
    </footer>
  );
}
