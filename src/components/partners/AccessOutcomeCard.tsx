"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** High-contrast action colour for first-touch access screens. */
export const ACCESS_CTA =
  "inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50";

export const ACCESS_CTA_SECONDARY =
  "inline-flex items-center justify-center rounded-xl bg-white/10 px-6 py-3 text-base font-semibold text-text transition-colors hover:bg-white/15";

export const ACCESS_CTA_GHOST =
  "text-base font-medium text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline";

type Tone = "success" | "error" | "info" | "neutral";

const TONE_EYEBROW: Record<Tone, string> = {
  success: "text-[#4ADE80]",
  error: "text-[#F87171]",
  info: "text-[#60A5FA]",
  neutral: "text-primary",
};

interface AccessOutcomeCardProps {
  eyebrow?: string;
  title: string;
  tone?: Tone;
  children: ReactNode;
  actions?: ReactNode;
  testId?: string;
  loading?: boolean;
  loadingLabel?: string;
  /** Extra classes on the card shell (e.g. min-height for the entry page). */
  cardClassName?: string;
}

/**
 * Shared first-impression shell for /access flows.
 * Mirrors the dashboard primary-action banner: elevated card, soft glow, clear hierarchy.
 */
export function AccessOutcomeCard({
  eyebrow,
  title,
  tone = "neutral",
  children,
  actions,
  testId,
  loading = false,
  loadingLabel = "Loading…",
  cardClassName,
}: AccessOutcomeCardProps) {
  return (
    <main
      className="flex min-h-[calc(100vh-3.5rem)] items-center py-10 sm:py-14"
      data-testid={testId}
    >
      <Container size="md" className="w-full">
        <Card
          variant="elevated"
          className={cn(
            "relative mx-auto w-full max-w-[60rem] overflow-hidden border-0 p-8 sm:p-10",
            cardClassName,
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_55%)]"
          />
          <Link
            href="/"
            className="absolute right-6 top-6 z-20 sm:right-8 sm:top-8"
            aria-label="ESAT Camp home"
          >
            <BrandLogo variant="mark" size="md" />
          </Link>
          <div className="relative z-10 pr-14 sm:pr-16">
            {loading ? (
              <p className="text-base text-text-muted">{loadingLabel}</p>
            ) : (
              <>
                {eyebrow ? (
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.14em]",
                      TONE_EYEBROW[tone],
                    )}
                  >
                    {eyebrow}
                  </p>
                ) : null}
                <h1
                  className={cn(
                    "text-[1.875rem] font-bold tracking-tight text-text sm:text-[2.1875rem]",
                    eyebrow ? "mt-2" : null,
                  )}
                >
                  {title}
                </h1>
                <div className="mt-4 max-w-3xl space-y-2.5 text-base leading-relaxed">
                  {children}
                </div>
                {actions ? (
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    {actions}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </Card>
      </Container>
    </main>
  );
}

export function AccessTextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={ACCESS_CTA_GHOST}>
      {children}
    </Link>
  );
}
