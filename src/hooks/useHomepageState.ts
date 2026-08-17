"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { useTesterProgrammeOptional } from "@/contexts/TesterProgrammeContext";
import type { CalibrationStatus } from "@/lib/calibration/types";
import {
  determinePrimaryAction,
  loggedOutPrimaryAction,
} from "@/lib/homepage/primaryAction";
import { resolveHomepageUserState } from "@/lib/homepage/userState";
import {
  buildLoggedOutPremiumOverview,
  buildTesterExpiredUpgrade,
  buildUpgradePrompt,
} from "@/lib/homepage/upgradePrompt";
import type { HomepageState, HomepageSummary } from "@/lib/homepage/types";
import type { TesterState } from "@/lib/tester/types";

export function useHomepageState(): HomepageState {
  const session = useSupabaseSession();
  const subscription = useSubscription();
  const testerCtx = useTesterProgrammeOptional();

  const [summary, setSummary] = useState<HomepageSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [testerFromApi, setTesterFromApi] = useState<TesterState | null>(null);

  const isLoggedIn = Boolean(session?.user);

  const loadSummary = useCallback(async () => {
    if (!isLoggedIn) {
      setSummary(null);
      setSummaryError(null);
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/homepage/summary", { cache: "no-store" });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary as HomepageSummary);
      }
      if (data.tester) {
        setTesterFromApi(data.tester as TesterState);
      }
      if (data.error) {
        setSummaryError(data.error);
      }
    } catch {
      setSummaryError("Some progress data could not be loaded.");
    } finally {
      setSummaryLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const tester = testerCtx?.state ?? testerFromApi;
  const hasFullAccess = subscription.hasFullAccess;
  const tier = subscription.tier;

  const userState = resolveHomepageUserState({
    isLoggedIn,
    hasFullAccess,
    tier,
    tester,
  });

  const calibrationStatus: CalibrationStatus =
    summary?.calibration.status ?? "none";

  const primaryAction = useMemo(() => {
    if (userState === "logged_out") {
      return loggedOutPrimaryAction();
    }
    return determinePrimaryAction({
      userState,
      tester,
      calibrationStatus,
      summary,
    });
  }, [userState, tester, calibrationStatus, summary]);

  const upgradePrompt = useMemo(() => {
    if (userState === "logged_out") {
      return buildLoggedOutPremiumOverview();
    }
    if (userState === "tester_expired") {
      return buildTesterExpiredUpgrade();
    }
    return buildUpgradePrompt({ userState, hasFullAccess, summary });
  }, [userState, hasFullAccess, summary]);

  // Subscription status is only needed for logged-in dashboard content.
  // Public visitors and crawlers must not wait on /api/subscription/status.
  const isLoading = Boolean(
    isLoggedIn &&
      (subscription.isLoading ||
        (summaryLoading && !summary) ||
        (testerCtx?.isLoading && !tester)),
  );

  const isPartial =
    Boolean(summary?.errors.length) || Boolean(summaryError);

  return {
    userState,
    isLoggedIn,
    subscriptionTier: tier,
    hasFullAccess,
    tester,
    calibrationStatus,
    summary,
    primaryAction,
    upgradePrompt,
    isLoading,
    isPartial,
    error: summaryError,
    refresh: loadSummary,
  };
}
