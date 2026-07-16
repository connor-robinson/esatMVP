"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { PrimaryAction } from "@/lib/homepage/types";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";

interface PrimaryActionCardProps {
  action: PrimaryAction;
  analyticsProps: HomepageAnalyticsProperties;
}

function humanizeLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function PrimaryActionCard({
  action,
  analyticsProps,
}: PrimaryActionCardProps) {
  const weaknessPrefix = "Your main weakness is ";
  const isWeaknessRecommendation =
    action.type === "recommended_session" &&
    action.title.startsWith(weaknessPrefix);
  const weakness = isWeaknessRecommendation
    ? humanizeLabel(action.title.slice(weaknessPrefix.length))
    : null;

  return (
    <Card variant="elevated" className="relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--color-primary-rgb,34,197,94),0.08),transparent_55%)]"
      />
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Your next step
        </p>
        <h2 className="mt-2 text-2xl font-bold text-text sm:text-3xl">
          {weakness ? (
            <>
              {weaknessPrefix}
              <span className="text-primary">{weakness}</span>
            </>
          ) : (
            humanizeLabel(action.title)
          )}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-text-muted sm:text-base">
          {humanizeLabel(action.description)}
        </p>
        {action.metric ? (
          <p className="mt-3 text-sm font-medium text-text">{action.metric}</p>
        ) : null}
        <div className="mt-6">
          <Link
            href={action.href}
            onClick={() =>
              void trackHomepageEvent("homepage_primary_cta_clicked", {
                ...analyticsProps,
                primary_cta_type: action.type,
                destination: action.href,
              })
            }
            className="inline-flex items-center justify-center rounded-organic-md bg-white/10 px-6 py-3.5 text-lg font-semibold text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition-all duration-fast ease-signature hover:bg-white/15 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_28px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:shadow-glow-focus"
          >
            {humanizeLabel(action.buttonLabel)}
          </Link>
        </div>
      </div>
    </Card>
  );
}
