"use client";

import { Suspense } from "react";
import Link from "next/link";
import { LoggedInHomepage } from "@/components/homepage/LoggedInHomepage";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { HomepageState } from "@/lib/homepage/types";

/**
 * Local preview of dashboard trial cards. No login required.
 * Open /dev/dashboard-trial
 */
const PREVIEW_STATE: HomepageState = {
  userState: "free",
  isLoggedIn: true,
  subscriptionTier: "free",
  hasFullAccess: false,
  tester: null,
  calibrationStatus: "completed",
  summary: null,
  primaryAction: {
    type: "continue_practice",
    title: "Keep practising Math 1",
    description: "Pick up where you left off with a short drill session.",
    buttonLabel: "Continue practice",
    href: "/mental-maths/drill",
    reason: "preview",
    priority: 2,
  },
  upgradePrompt: null,
  isLoading: false,
  isPartial: false,
  error: null,
  refresh: async () => undefined,
};

function PreviewBody() {
  return (
    <div className="min-h-[calc(100vh-58px)] bg-background">
      <div className="border-b border-white/10 bg-surface-elevated/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[62rem] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
              Dev preview - no login
            </p>
            <p className="mt-1 text-sm text-text">
              Dashboard trial cards as a free user would see them.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/onboarding?preview=1&step=trial"
              className="font-semibold text-primary hover:underline"
            >
              Onboarding trial step
            </Link>
            <Link
              href={CALIBRATION_ROUTES.hub}
              className="text-text-muted hover:text-text"
            >
              Calibration
            </Link>
          </div>
        </div>
      </div>
      <LoggedInHomepage state={PREVIEW_STATE} designPreview />
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
