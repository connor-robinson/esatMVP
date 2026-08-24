"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { cn } from "@/lib/utils";
import { useAnalyticsConsent } from "./AnalyticsConsentProvider";

/**
 * Concise UK-style cookie banner with equal Accept / Reject actions.
 * Shown on first visit and whenever the visitor reopens preferences.
 */
export function CookieConsentBanner() {
  const pathname = usePathname();
  const session = useSupabaseSession();
  const { preferencesOpen, status, accept, reject, closePreferences } =
    useAnalyticsConsent();

  if (!preferencesOpen) return null;

  const isFirstChoice = status === "pending";
  const onHomepage = pathname === "/" && !session;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] p-4 sm:p-6"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-2xl p-5 sm:p-6",
          onHomepage
            ? "rounded-xl bg-[#161D2F]/80 shadow-xl backdrop-blur-md"
            : "rounded-organic-xl bg-surface-elevated shadow-bar-floating",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="cookie-consent-title"
              className={cn(
                "font-heading text-base font-semibold tracking-tight sm:text-lg",
                onHomepage ? "text-white" : "text-text",
              )}
            >
              Optional cookies
            </h2>
            <p
              id="cookie-consent-desc"
              className={cn(
                "mt-2 text-sm leading-relaxed",
                onHomepage ? "text-[#94A3B8]" : "text-text-muted",
              )}
            >
              We use optional cookies for website analytics and Google Ads
              conversion measurement, so we can understand which pages help with
              ESAT preparation and whether our ads lead people here. Necessary
              storage (login and preferences) always works. We do not use these
              cookies for remarketing or personalised advertising. See our{" "}
              <Link
                href="/cookie-policy"
                className={cn(
                  "font-medium underline-offset-2 hover:underline",
                  onHomepage ? "text-white" : "text-text",
                )}
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
              className={cn(
                "shrink-0 px-2.5 py-1.5 text-sm transition-colors",
                onHomepage
                  ? "rounded-xl bg-white/10 text-[#94A3B8] hover:bg-white/15 hover:text-white"
                  : "rounded-organic-md bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
              )}
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
            className={cn(
              "px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
              onHomepage
                ? "rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] focus-visible:ring-[#3B82F6]/50"
                : "rounded-organic-md bg-primary text-background hover:bg-primary/90 focus-visible:ring-primary/35",
            )}
          >
            Accept optional cookies
          </button>
          <button
            type="button"
            onClick={reject}
            className={cn(
              "px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
              onHomepage
                ? "rounded-xl bg-white/10 text-white hover:bg-white/15 focus-visible:ring-[#3B82F6]/50"
                : "rounded-organic-md bg-text/15 text-text hover:bg-text/20 focus-visible:ring-primary/35",
            )}
          >
            Reject optional cookies
          </button>
        </div>
      </div>
    </div>
  );
}
