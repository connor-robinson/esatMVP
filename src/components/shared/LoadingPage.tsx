/**
 * Full-screen loading overlay - logo, spinner, status, and tip.
 */

"use client";

import { useMemo } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DISPLAY_NAME } from "@/config/brand";
import { pickRandomSessionLoadingHint } from "@/lib/questionBank/sessionLoadingHints";
import { cn } from "@/lib/utils";

export type LoadingPageVariant = "app" | "session";

interface LoadingPageProps {
  message?: string;
  /** @deprecated Progress bar removed - kept for API compatibility. */
  showProgress?: boolean;
  /** @deprecated Progress bar removed - kept for API compatibility. */
  progress?: number;
  /** Fixed hint; if omitted, a random tip is chosen once on mount. */
  hint?: string;
  variant?: LoadingPageVariant;
}

export function LoadingPage({
  message,
  hint: hintProp,
  variant = "app",
}: LoadingPageProps) {
  const hint = useMemo(
    () => hintProp ?? pickRandomSessionLoadingHint(),
    [hintProp],
  );

  const statusMessage =
    message ??
    (variant === "session" ? "Preparing your session" : "Initializing");

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo variant="mark" size="lg" />
          <p className="font-heading text-xl font-semibold tracking-tight text-text sm:text-2xl">
            {DISPLAY_NAME}
          </p>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div
            className="h-12 w-12 animate-spin rounded-full border-2 border-border-subtle border-t-primary"
            role="status"
            aria-label="Loading"
          />
          <p className="min-h-[1.25rem] text-sm text-text-muted">{statusMessage}</p>
        </div>

        <div
          className={cn(
            "w-full max-w-xs border-t border-border-subtle/60 pt-8 text-center",
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
            Tip
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-text-muted">{hint}</p>
        </div>
      </div>
    </div>
  );
}
