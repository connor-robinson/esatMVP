"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import { trackEvent } from "@/lib/ga";

type SeoCtaProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  /** Where on the page the CTA sits - recorded with the click event. */
  placement?: string;
  className?: string;
};

const VARIANTS = {
  primary:
    "bg-[#3B82F6] text-white hover:bg-[#2563EB]",
  secondary: "bg-white text-[#0A0F1D] hover:bg-slate-200",
  quiet: "bg-white/10 text-white hover:bg-white/15",
} as const;

/**
 * Primary link-style CTA for the SEO guide pages. Always routes into a real
 * in-app destination and reports the click through the existing analytics
 * endpoint.
 */
export function SeoCta({
  href,
  children,
  variant = "primary",
  placement,
  className,
}: SeoCtaProps) {
  return (
    <Link
      href={href}
      onClick={() => {
        trackEvent("cta_clicked", {
          destination: href,
          placement: placement ?? "seo",
          surface: "seo_guide",
        });
        void trackHomepageEvent("seo_cta_clicked", {
          destination: href,
          section: placement,
        });
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold transition-colors",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
      <span aria-hidden className="text-lg leading-none">
        →
      </span>
    </Link>
  );
}

export function SeoCtaRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap", className)}>
      {children}
    </div>
  );
}
