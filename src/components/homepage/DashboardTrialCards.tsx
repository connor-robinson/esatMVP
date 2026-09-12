"use client";

import { useStartMonthlyTrialCheckout } from "@/hooks/useStartMonthlyTrialCheckout";
import {
  FREE_PLAN_ITEMS,
  TRIAL_CHECKOUT_NOTE,
  TRIAL_DAYS,
  TRIAL_PLAN_ITEMS,
} from "@/lib/pricing/trialCopy";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, X } from "lucide-react";
import { useState } from "react";

const TRIAL_NUDGES = [
  {
    id: "question-bank",
    title: "Unlimited Question Bank",
    body: "Skip the 10-question free limit on every subject.",
  },
  {
    id: "past-papers",
    title: "Full past papers + mocks",
    body: "Whole roadmap, mock papers, solutions, and mark schemes.",
  },
  {
    id: "mental-maths",
    title: "All mental maths modules",
    body: "Every training module unlocked for focused no-calc practice.",
  },
] as const;

interface DashboardTrialCardsProps {
  analyticsProps: HomepageAnalyticsProperties;
  className?: string;
}

/**
 * Trial suggestion cards for free users, styled to sit with TopicHub panels.
 */
export function DashboardTrialCards({
  analyticsProps,
  className,
}: DashboardTrialCardsProps) {
  const { startTrial, loading } = useStartMonthlyTrialCheckout();
  const [error, setError] = useState<string | null>(null);

  const onStart = async (source: string) => {
    setError(null);
    void trackHomepageEvent("upgrade_cta_clicked", {
      ...analyticsProps,
      destination: "monthly_trial_checkout",
      section: source,
    });
    const result = await startTrial();
    if (!result.ok) setError(result.error);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
            Try {TRIAL_DAYS} days free
          </h2>
          <p className="mt-1 text-sm text-text-muted">{TRIAL_CHECKOUT_NOTE}</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void onStart("trial_header")}
          className="inline-flex items-center justify-center gap-2 rounded-organic-md bg-text px-4 py-2.5 text-sm font-semibold text-background transition-opacity duration-fast ease-signature hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            "Starting…"
          ) : (
            <>
              Start free trial
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3.5">
        {TRIAL_NUDGES.map((nudge) => (
          <button
            key={nudge.id}
            type="button"
            disabled={loading}
            onClick={() => void onStart(nudge.id)}
            className="rounded-organic-xl bg-primary/12 p-5 text-left transition-colors duration-fast ease-signature hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-70 sm:p-5"
          >
            <p className="text-base font-bold tracking-tight text-primary">
              {nudge.title}
            </p>
            <p className="mt-1.5 text-sm leading-snug text-text-muted">
              {nudge.body}
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-text">
              {loading ? (
                "Starting…"
              ) : (
                <>
                  Start free trial
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-organic-xl bg-surface-elevated/80 px-4 py-4 sm:grid-cols-2 sm:gap-6 sm:px-5 sm:py-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-primary">
            Free trial
          </p>
          <ul className="mt-3 space-y-3">
            {TRIAL_PLAN_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-snug text-text sm:text-[0.95rem]"
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  strokeWidth={3}
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            Free
          </p>
          <ul className="mt-3 space-y-3">
            {FREE_PLAN_ITEMS.map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-start gap-3 text-sm leading-snug sm:text-[0.95rem]",
                  item.included ? "text-text" : "text-text-muted",
                )}
              >
                {item.included ? (
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-text-muted"
                    strokeWidth={3}
                    aria-hidden
                  />
                ) : (
                  <X
                    className="mt-0.5 h-4 w-4 shrink-0 text-error/80"
                    strokeWidth={3}
                    aria-hidden
                  />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
