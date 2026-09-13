"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { FeedbackReferralInviteCard } from "@/components/feedbackReferral/FeedbackReferralInviteCard";
import { isPaperImmersiveRoute } from "@/lib/papers/activePaperSessionClient";
import {
  FEEDBACK_REFERRAL_ENGAGEMENT_CLEARED_EVENT,
  FEEDBACK_REFERRAL_ENGAGEMENT_EVENT,
  clearFeedbackReferralEngagement,
  getFeedbackReferralEngagementAgeMs,
  hasFeedbackReferralDontShowAgain,
  hasFeedbackReferralEngagement,
  hasFeedbackReferralSessionDismiss,
  recordFeedbackReferralPromptDismiss,
  setFeedbackReferralDontShowAgain,
  setFeedbackReferralReturnTo,
} from "@/lib/feedbackReferral/promptStorage";
import { markFeedbackReferralAsked } from "@/lib/feedbackReferral/markAsked";

const SETTLE_DELAY_MS = 3200;

const HIDDEN_PATH_PREFIXES = [
  "/feedback",
  "/login",
  "/signup",
  "/onboarding",
  "/auth",
  "/dev/feedback-referral",
  "/pricing/success",
  "/pearson",
  "/profile",
  // Pre-session / mid-session surfaces: never interrupt these.
  "/past-papers/solve/start",
  "/mental-maths/drill/session",
];

function isBlockedPromptPath(pathname: string): boolean {
  if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (isPaperImmersiveRoute(pathname)) return true;
  return false;
}

/**
 * Soft invite for the feedback-for-referral survey.
 * Only appears after a meaningful practice action finishes, not before or during.
 * Backdrop clicks do nothing.
 */
export function FeedbackReferralPrompt() {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const tryOpen = useCallback(() => {
    if (!session?.user) {
      setOpen(false);
      return;
    }
    if (isBlockedPromptPath(pathname)) {
      setOpen(false);
      return;
    }
    if (hasFeedbackReferralDontShowAgain()) {
      setOpen(false);
      return;
    }
    if (hasFeedbackReferralSessionDismiss()) {
      setOpen(false);
      return;
    }
    if (!hasFeedbackReferralEngagement()) {
      setOpen(false);
      return;
    }

    void fetch("/api/feedback-referral/status")
      .then(async (res) => {
        if (res.status === 403 || !res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data?.enabled || data.completed) {
          setOpen(false);
          return;
        }
        if (
          isBlockedPromptPath(pathname) ||
          hasFeedbackReferralDontShowAgain() ||
          hasFeedbackReferralSessionDismiss() ||
          !hasFeedbackReferralEngagement()
        ) {
          setOpen(false);
          return;
        }
        markFeedbackReferralAsked();
        setOpen(true);
      })
      .catch(() => setOpen(false));
  }, [session?.user, pathname]);

  useEffect(() => {
    // Path changes must never reopen from a stale flag. Only close if blocked.
    if (isBlockedPromptPath(pathname)) {
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    let settleTimer: number | undefined;

    const scheduleOpen = () => {
      window.clearTimeout(settleTimer);
      const age = getFeedbackReferralEngagementAgeMs();
      if (age == null) return;
      const remaining = Math.max(0, SETTLE_DELAY_MS - age);
      settleTimer = window.setTimeout(() => tryOpen(), remaining);
    };

    // Refresh on a results page shortly after finishing can still show once.
    scheduleOpen();

    const onEngagement = () => scheduleOpen();
    const onCleared = () => {
      window.clearTimeout(settleTimer);
      setOpen(false);
    };

    window.addEventListener(
      FEEDBACK_REFERRAL_ENGAGEMENT_EVENT,
      onEngagement as EventListener,
    );
    window.addEventListener(
      FEEDBACK_REFERRAL_ENGAGEMENT_CLEARED_EVENT,
      onCleared as EventListener,
    );
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener(
        FEEDBACK_REFERRAL_ENGAGEMENT_EVENT,
        onEngagement as EventListener,
      );
      window.removeEventListener(
        FEEDBACK_REFERRAL_ENGAGEMENT_CLEARED_EVENT,
        onCleared as EventListener,
      );
    };
  }, [tryOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative w-full max-w-2xl">
        <FeedbackReferralInviteCard
          onStart={() => {
            clearFeedbackReferralEngagement();
            setOpen(false);
            setFeedbackReferralReturnTo(
              `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`,
            );
            router.push("/feedback");
          }}
          onNotNow={() => {
            recordFeedbackReferralPromptDismiss();
            setOpen(false);
          }}
          onDontShowAgain={() => {
            setFeedbackReferralDontShowAgain();
            clearFeedbackReferralEngagement();
            setOpen(false);
          }}
        />
      </div>
    </div>
  );
}
