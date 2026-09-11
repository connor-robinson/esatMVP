"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shouldHideSiteChromeForPaper } from "@/lib/papers/activePaperSessionClient";
import { cn } from "@/lib/utils";
import { useAnalyticsConsent } from "./AnalyticsConsentProvider";

/**
 * Compact side cookie notice for normal site pages.
 * Hidden during immersive exam / calibration test chrome.
 * First-choice timing is owned by AnalyticsConsentProvider (never on first paint).
 */
export function CookieConsentBanner() {
  const pathname = usePathname();
  const { preferencesOpen, status, accept, reject, closePreferences } =
    useAnalyticsConsent();
  const [entered, setEntered] = useState(false);

  const immersive = shouldHideSiteChromeForPaper(pathname);
  const onHomepage = pathname === "/";
  const isFirstChoice = status === "pending";
  const visible = preferencesOpen && !immersive;

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      id="esat-cookie-consent"
      data-cookie-banner
      data-testid="cookie-banner"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-start p-3 sm:p-5 sm:pr-0"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-[22rem] origin-bottom-left rounded-2xl border-0 outline-none",
          "text-sky-50 backdrop-blur-xl backdrop-saturate-150",
          "transition-[opacity,transform] duration-500 ease-out",
          "sm:ml-1",
          onHomepage
            ? "bg-blue-600/45 shadow-[0_18px_50px_-20px_rgba(37,99,235,0.55)]"
            : "bg-sky-950/55 shadow-[0_18px_50px_-24px_rgba(8,47,73,0.85)]",
          entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200/80">
                Privacy
              </p>
              <h2
                id="cookie-consent-title"
                className="mt-1 font-heading text-[0.95rem] font-semibold tracking-tight text-white"
              >
                Optional cookies
              </h2>
            </div>
            {!isFirstChoice ? (
              <button
                type="button"
                onClick={closePreferences}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-sky-100/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close cookie preferences"
              >
                Close
              </button>
            ) : null}
          </div>

          <p
            id="cookie-consent-desc"
            className="mt-2.5 text-[13px] leading-relaxed text-sky-100/80"
          >
            We use optional cookies for analytics and ad conversion measurement.
            Necessary login storage always works. No remarketing.{" "}
            <Link
              href="/cookie-policy"
              className="font-medium text-sky-50 underline decoration-sky-300/40 underline-offset-2 transition-colors hover:decoration-sky-100"
            >
              Cookie Policy
            </Link>
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              data-testid="accept"
              onClick={accept}
              className="rounded-xl bg-sky-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
            >
              Accept optional cookies
            </button>
            <button
              type="button"
              data-testid="reject"
              onClick={reject}
              className="rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-sky-50 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40"
            >
              Reject optional cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
