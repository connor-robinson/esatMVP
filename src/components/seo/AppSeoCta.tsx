"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import {
  currentGaPath,
  hasSeenConverterResult,
  readLastConverterExam,
  rememberGaSourcePage,
  trackEvent,
} from "@/lib/ga";

/** Primary CTA for SEO copy added around the in-app tool pages. */
export function AppSeoCta({
  href,
  children,
  placement,
  className,
  ctaName,
}: {
  href: string;
  children: React.ReactNode;
  placement?: string;
  className?: string;
  /** Stable funnel name when this is a post-result converter CTA. */
  ctaName?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        const converterPage = currentGaPath();
        const fromConverterResult =
          placement === "score_converter_outro" && hasSeenConverterResult();

        if (fromConverterResult) {
          rememberGaSourcePage(converterPage);
          trackEvent("converter_cta_click", {
            cta_name: ctaName ?? "start_free_calibration",
            destination: href,
            exam: readLastConverterExam(),
            converter_page: converterPage ?? "/tools/score-converter",
          });
        } else {
          trackEvent("cta_clicked", {
            destination: href,
            placement: placement ?? "app_seo",
            surface: "app_seo",
          });
        }

        void trackHomepageEvent("seo_cta_clicked", {
          destination: href,
          section: placement,
        });
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-organic-lg bg-primary px-5 py-3 text-sm font-bold text-background transition-all hover:bg-primary-hover",
        className,
      )}
    >
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}
