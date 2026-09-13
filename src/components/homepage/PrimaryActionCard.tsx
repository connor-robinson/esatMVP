"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { PrimaryAction } from "@/lib/homepage/types";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";
import { useStartMonthlyTrialCheckout } from "@/hooks/useStartMonthlyTrialCheckout";
import { cn } from "@/lib/utils";

interface PrimaryActionCardProps {
  action: PrimaryAction;
  analyticsProps: HomepageAnalyticsProperties;
  /** Design preview: trial button does not call Stripe. */
  designPreview?: boolean;
}

function humanizeLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function PrimaryActionCard({
  action,
  analyticsProps,
  designPreview = false,
}: PrimaryActionCardProps) {
  const weaknessPrefix = "Your main weakness is ";
  const isWeaknessRecommendation =
    action.type === "recommended_session" &&
    action.title.startsWith(weaknessPrefix);
  const weakness = isWeaknessRecommendation
    ? humanizeLabel(action.title.slice(weaknessPrefix.length))
    : null;
  const isTrial = action.type === "trial_upgrade";
  const { startTrial, loading } = useStartMonthlyTrialCheckout();
  const [trialError, setTrialError] = useState<string | null>(null);

  const eyebrow = isTrial ? "Upgrade" : "Your next step";

  const onTrialClick = async () => {
    setTrialError(null);
    void trackHomepageEvent("upgrade_cta_clicked", {
      ...analyticsProps,
      primary_cta_type: action.type,
      destination: "monthly_trial_checkout",
    });
    if (designPreview) {
      setTrialError("Preview only. Sign in on /dashboard to start a real trial.");
      return;
    }
    const result = await startTrial();
    if (!result.ok) setTrialError(result.error);
  };

  return (
    <Card
      variant="elevated"
      className="relative overflow-hidden border-0 p-6 sm:p-8"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          isTrial
            ? "bg-[radial-gradient(circle_at_top_right,rgba(76,139,245,0.14),transparent_55%)]"
            : "bg-[radial-gradient(circle_at_top_right,rgb(var(--color-primary-rgb,34,197,94),0.08),transparent_55%)]",
        )}
      />
      <div className="relative z-10">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.12em]",
            isTrial ? "text-[#4C8BF5]" : "text-primary",
          )}
        >
          {eyebrow}
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
        <div className="mt-6 flex flex-col items-start gap-3">
          {isTrial ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void onTrialClick()}
              className="inline-flex items-center justify-center gap-2 rounded-organic-md bg-[#4C8BF5] px-6 py-3.5 text-lg font-semibold text-white transition-opacity duration-fast ease-signature hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-glow-focus"
            >
              {loading ? (
                "Starting…"
              ) : (
                <>
                  {humanizeLabel(action.buttonLabel)}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </>
              )}
            </button>
          ) : (
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
          )}
          {trialError ? (
            <p className="text-sm text-error">{trialError}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
