"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { LoggedInHomepage } from "@/components/homepage/LoggedInHomepage";
import {
  buildQuestionBankPrimaryAction,
  buildTrialUpgradePrimaryAction,
  determineMentalMathsPrimaryAction,
  type DashboardPrimaryVariant,
} from "@/lib/homepage/primaryAction";
import type { HomepageState } from "@/lib/homepage/types";
import { cn } from "@/lib/utils";

/**
 * Local preview of dashboard next-step variants. No login required.
 * Open /dev/dashboard-trial
 */
const VARIANTS: { id: DashboardPrimaryVariant; label: string }[] = [
  { id: "mental_maths", label: "Mental maths" },
  { id: "question_bank", label: "Question bank" },
  { id: "trial", label: "4-day free upgrade" },
];

function buildPreviewState(variant: DashboardPrimaryVariant): HomepageState {
  const subjects = ["Math 1", "Biology", "Chemistry"];

  let primaryAction = determineMentalMathsPrimaryAction({
    userState: "free",
    tester: null,
    calibrationStatus: "completed",
    summary: {
      calibration: {
        status: "completed",
        progress: null,
        result: null,
        latestAttemptId: null,
      },
      progress: {
        strongestSkill: null,
        weakestSkill: "Algebra",
        accuracy: null,
        avgResponseMs: null,
        sessionsCompleted: 4,
        metrics: [],
      },
      weekly: null,
      recentSessions: [],
      recentMode: null,
      recommendedTopic: {
        id: "algebra",
        name: "Algebra",
        href: "/mental-maths/drill",
      },
      hasPracticeData: true,
      errors: [],
    },
  });

  if (variant === "question_bank") {
    primaryAction = buildQuestionBankPrimaryAction(subjects);
  } else if (variant === "trial") {
    primaryAction = buildTrialUpgradePrimaryAction();
  }

  return {
    userState: "free",
    isLoggedIn: true,
    subscriptionTier: "free",
    hasFullAccess: false,
    tester: null,
    calibrationStatus: "completed",
    summary: null,
    primaryAction,
    upgradePrompt: null,
    isLoading: false,
    isPartial: false,
    error: null,
    refresh: async () => undefined,
  };
}

function PreviewBody() {
  const [variant, setVariant] = useState<DashboardPrimaryVariant>("trial");
  const state = useMemo(() => buildPreviewState(variant), [variant]);

  return (
    <div className="min-h-[calc(100vh-58px)] bg-background">
      <div className="border-b border-white/10 bg-surface-elevated/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[62rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
              Dev preview - no login
            </p>
            <p className="mt-1 text-sm text-text">
              Swap next-step variants (mental maths / question bank / trial).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {VARIANTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setVariant(item.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  variant === item.id
                    ? "bg-primary text-background"
                    : "bg-surface-mid text-text hover:bg-surface-neutral",
                )}
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/onboarding?preview=1&step=trial"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text"
            >
              Onboarding trial
            </Link>
          </div>
        </div>
      </div>
      <LoggedInHomepage state={state} designPreview />
    </div>
  );
}

export default function DevDashboardTrialPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-background text-sm text-text-muted">
          Loading preview…
        </div>
      }
    >
      <PreviewBody />
    </Suspense>
  );
}
