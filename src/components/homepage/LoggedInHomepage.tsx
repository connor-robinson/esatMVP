"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PrimaryActionCard } from "@/components/homepage/PrimaryActionCard";
import { TopicHub } from "@/components/homepage/TopicHub";
import { DashboardTrialCards } from "@/components/homepage/DashboardTrialCards";
import {
  TesterAccessStatus,
  TesterProgrammeLink,
  UpgradePrompt,
} from "@/components/homepage/TesterAccessStatus";
import { ErrorState } from "@/components/homepage/ErrorState";
import { DASHBOARD_TOPICS } from "@/lib/homepage/sections";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";
import type { HomepageState } from "@/lib/homepage/types";
import { getCheckpointModalContent } from "@/lib/tester/checkpoint";

interface LoggedInHomepageProps {
  state: HomepageState;
}

export function LoggedInHomepage({ state }: LoggedInHomepageProps) {
  const searchParams = useSearchParams();
  const forceTrialPreview = searchParams.get("preview_trial") === "1";

  const analyticsProps: HomepageAnalyticsProperties = useMemo(
    () => ({
      user_state: state.userState,
      subscription_status: state.subscriptionTier,
      tester_stage: state.tester?.status,
      calibration_status: state.calibrationStatus,
    }),
    [
      state.userState,
      state.subscriptionTier,
      state.tester?.status,
      state.calibrationStatus,
    ],
  );

  useEffect(() => {
    void trackHomepageEvent("homepage_viewed", analyticsProps);
  }, [analyticsProps]);

  const showTrialCards =
    forceTrialPreview ||
    (state.userState === "free" && !state.hasFullAccess);

  const showUpgrade =
    !showTrialCards &&
    state.upgradePrompt &&
    state.userState !== "premium" &&
    state.userState !== "tester_active";

  const showTesterStatus =
    state.tester?.isMember &&
    (state.userState === "tester_active" || state.userState === "tester_expired");

  const expiredTesterBanner =
    state.userState === "tester_expired" && state.tester
      ? getCheckpointModalContent(state.tester)
      : null;

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-[62rem] space-y-5">
        {forceTrialPreview ? (
          <div className="rounded-organic-md bg-primary/15 px-3.5 py-2.5 text-xs text-text">
            <span className="font-semibold">Trial cards preview</span>
            <span className="text-text-muted"> (`?preview_trial=1`)</span>
          </div>
        ) : null}

        {state.isPartial && state.error ? (
          <ErrorState message={state.error} onRetry={() => void state.refresh()} />
        ) : null}

        {expiredTesterBanner ? (
          <div className="rounded-organic-xl bg-warning/10 p-5">
            <p className="font-semibold text-text">{expiredTesterBanner.title}</p>
            <p className="mt-2 text-sm text-text-muted">{expiredTesterBanner.body}</p>
            {expiredTesterBanner.bullets.length > 0 ? (
              <ul className="mt-3 list-inside list-disc text-sm text-text-muted">
                {expiredTesterBanner.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4 rounded-organic-xl bg-surface-subtle/70 p-3 sm:p-4">
          <PrimaryActionCard
            action={state.primaryAction}
            analyticsProps={analyticsProps}
            secondaryHref={
              state.primaryAction.type === "tester_action"
                ? undefined
                : "/questions"
            }
            secondaryLabel={
              state.primaryAction.type === "tester_action"
                ? undefined
                : "Or try the new Question Bank"
            }
          />

          {showTesterStatus && state.tester ? (
            <div className="space-y-3 px-1">
              <TesterAccessStatus state={state.tester} />
              <TesterProgrammeLink />
            </div>
          ) : null}

          {showTrialCards ? (
            <div className="px-1 pt-1">
              <DashboardTrialCards analyticsProps={analyticsProps} />
            </div>
          ) : null}

          <div className="space-y-3 px-1 pb-1 pt-1">
            <h2 className="text-xl font-bold tracking-tight text-text sm:text-2xl">
              Dashboard
            </h2>
            <TopicHub
              topics={DASHBOARD_TOPICS}
              analyticsProps={analyticsProps}
              className="gap-3 sm:gap-3.5"
            />
          </div>
        </div>

        {showUpgrade && state.upgradePrompt ? (
          <UpgradePrompt
            prompt={state.upgradePrompt}
            analyticsProps={analyticsProps}
            variant={state.userState === "tester_expired" ? "tester" : "free"}
          />
        ) : null}
      </div>
    </Container>
  );
}
