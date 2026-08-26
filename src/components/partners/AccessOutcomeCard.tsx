"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** High-contrast action colour for first-touch access screens. */
export const ACCESS_CTA =
  "inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50";

export const ACCESS_CTA_SECONDARY =
  "inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-white/15";

export const ACCESS_CTA_GHOST =
  "text-sm font-medium text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline";

type Tone = "success" | "error" | "info" | "neutral";

const TONE_EYEBROW: Record<Tone, string> = {
  success: "text-[#4ADE80]",
  error: "text-[#F87171]",
  info: "text-[#60A5FA]",
  neutral: "text-primary",
};

interface AccessOutcomeCardProps {
  eyebrow: string;
  title: string;
  tone?: Tone;
  children: ReactNode;
  actions?: ReactNode;
  testId?: string;
  loading?: boolean;
  loadingLabel?: string;
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
}: AccessOutcomeCardProps) {
  return (
    <main
      className="flex min-h-[calc(100vh-3.5rem)] items-center py-10 sm:py-14"
      data-testid={testId}
    >
      <Container size="md" className="w-full">
        <Card
          variant="elevated"
          className="relative mx-auto w-full max-w-3xl overflow-hidden border-0 p-6 sm:p-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_55%)]"
          />
          <div className="relative z-10">
            {loading ? (
              <p className="text-sm text-text-muted">{loadingLabel}</p>
            ) : (
              <>
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.14em]",
                    TONE_EYEBROW[tone],
                  )}
                >
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">
                  {title}
                </h1>
                <div className="mt-3 max-w-2xl space-y-2 text-sm leading-relaxed">
                  {children}
                </div>
                {actions ? (
                  <div className="mt-7 flex flex-wrap items-center gap-3">
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
