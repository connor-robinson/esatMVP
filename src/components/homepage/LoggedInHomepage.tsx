"use client";

import { useEffect, useMemo } from "react";
import { Container } from "@/components/layout/Container";
import { PrimaryActionCard } from "@/components/homepage/PrimaryActionCard";
import { ProgressSummary } from "@/components/homepage/ProgressSummary";
import { CalibrationStatusCard } from "@/components/homepage/CalibrationStatus";
import { RecommendedPractice } from "@/components/homepage/RecommendedPractice";
import { MainSectionGrid } from "@/components/homepage/MainSectionGrid";
import {
  TesterAccessStatus,
  TesterProgrammeLink,
  UpgradePrompt,
} from "@/components/homepage/TesterAccessStatus";
import { RecentActivity } from "@/components/homepage/RecentActivity";
import { WeeklyProgress } from "@/components/homepage/WeeklyProgress";
import { ErrorState } from "@/components/homepage/ErrorState";
import { HOMEPAGE_SECTIONS } from "@/lib/homepage/sections";
import { trackHomepageEvent } from "@/lib/homepage/analytics";
import type { HomepageAnalyticsProperties } from "@/lib/homepage/analytics";
import type { HomepageState } from "@/lib/homepage/types";
import { getCheckpointModalContent } from "@/lib/tester/checkpoint";

interface LoggedInHomepageProps {
  state: HomepageState;
}

export function LoggedInHomepage({ state }: LoggedInHomepageProps) {
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

  const showUpgrade =
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

  const showRecommended =
    state.summary?.recommendedTopic &&
    state.primaryAction.type !== "recommended_session" &&
    state.calibrationStatus === "completed";

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-text sm:text-3xl">
            {state.userState === "premium"
              ? "Your training dashboard"
              : state.userState === "tester_active"
                ? "Founding Tester dashboard"
                : state.userState === "tester_expired"
                  ? "Continue the tester programme"
                  : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {state.primaryAction.reason.includes("calibration")
              ? "Complete your calibration to unlock personalised recommendations."
              : "Pick up where you left off or start today's recommended session."}
          </p>
        </header>

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

        <PrimaryActionCard
          action={state.primaryAction}
          analyticsProps={analyticsProps}
        />

        {showTesterStatus && state.tester ? (
          <div className="space-y-3">
            <TesterAccessStatus state={state.tester} />
            <TesterProgrammeLink />
          </div>
        ) : null}

        {state.summary?.progress.metrics.length ? (
          <ProgressSummary metrics={state.summary.progress.metrics} />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {state.summary?.weekly ? (
            <WeeklyProgress weekly={state.summary.weekly} />
          ) : null}

          {state.summary?.calibration ? (
            <CalibrationStatusCard
              calibration={state.summary.calibration}
              compact={state.calibrationStatus === "completed"}
            />
          ) : null}

          {showRecommended && state.summary?.recommendedTopic ? (
            <RecommendedPractice
              topicName={state.summary.recommendedTopic.name}
              href={state.summary.recommendedTopic.href}
              weaknessLabel={state.summary.progress.weakestSkill}
              analyticsProps={analyticsProps}
            />
          ) : null}

          {state.summary?.recentSessions.length ? (
            <RecentActivity sessions={state.summary.recentSessions} />
          ) : null}
        </div>

        <MainSectionGrid
          sections={HOMEPAGE_SECTIONS}
          analyticsProps={analyticsProps}
        />

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
