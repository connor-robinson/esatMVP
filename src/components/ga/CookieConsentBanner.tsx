"use client";

import Link from "next/link";
import { useAnalyticsConsent } from "./AnalyticsConsentProvider";

/**
 * Concise UK-style cookie banner with equal Accept / Reject actions.
 * Shown on first visit and whenever the visitor reopens preferences.
 */
export function CookieConsentBanner() {
  const { preferencesOpen, status, accept, reject, closePreferences } =
    useAnalyticsConsent();

  if (!preferencesOpen) return null;

  const isFirstChoice = status === "pending";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] p-4 sm:p-6"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-organic-xl bg-surface-elevated p-5 shadow-bar-floating sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="cookie-consent-title"
              className="font-heading text-base font-semibold tracking-tight text-text sm:text-lg"
            >
              Analytics cookies
            </h2>
            <p
              id="cookie-consent-desc"
              className="mt-2 text-sm leading-relaxed text-text-muted"
            >
              We use Google Analytics only if you opt in, to understand which
              pages help with ESAT preparation. Necessary storage (login and
              preferences) always works. See our{" "}
              <Link
                href="/cookie-policy"
                className="font-medium text-text underline-offset-2 hover:underline"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </div>
          {!isFirstChoice ? (
            <button
              type="button"
              onClick={closePreferences}
              className="shrink-0 rounded-organic-md bg-surface-mid px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
              aria-label="Close cookie preferences"
            >
              Close
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={accept}
            className="rounded-organic-md bg-primary px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            Accept analytics
          </button>
          <button
            type="button"
            onClick={reject}
            className="rounded-organic-md bg-text/15 px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-text/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            Reject analytics
          </button>
        </div>
      </div>
    </div>
  );
}
