"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { trackHomepageEvent } from "@/lib/homepage/analytics";

/** Primary CTA for SEO copy added around the in-app tool pages. */
export function AppSeoCta({
  href,
  children,
  placement,
  className,
}: {
  href: string;
  children: React.ReactNode;
  placement?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() =>
        void trackHomepageEvent("seo_cta_clicked", {
          destination: href,
          section: placement,
        })
      }
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
