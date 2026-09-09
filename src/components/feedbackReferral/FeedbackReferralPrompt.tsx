"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { FeedbackReferralInviteCard } from "@/components/feedbackReferral/FeedbackReferralInviteCard";
import {
  FEEDBACK_REFERRAL_ENGAGEMENT_EVENT,
  clearFeedbackReferralEngagement,
  hasFeedbackReferralDontShowAgain,
  hasFeedbackReferralEngagement,
  hasFeedbackReferralSessionDismiss,
  recordFeedbackReferralPromptDismiss,
  setFeedbackReferralDontShowAgain,
} from "@/lib/feedbackReferral/promptStorage";

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
];

/**
 * Soft invite for the feedback-for-referral survey.
 * Only appears after a meaningful practice action (paper / session), not on login.
 * Soft-dismiss at most twice; then it stays available from Settings.
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
    if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
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
          hasFeedbackReferralDontShowAgain() ||
          hasFeedbackReferralSessionDismiss() ||
          !hasFeedbackReferralEngagement()
        ) {
          setOpen(false);
          return;
        }
        setOpen(true);
      })
      .catch(() => setOpen(false));
  }, [session?.user, pathname]);

  useEffect(() => {
    tryOpen();

    const onEngagement = () => {
      // Let results UI settle before the invite appears.
      window.setTimeout(() => tryOpen(), 1200);
    };
    window.addEventListener(
      FEEDBACK_REFERRAL_ENGAGEMENT_EVENT,
      onEngagement as EventListener,
    );
    return () => {
      window.removeEventListener(
        FEEDBACK_REFERRAL_ENGAGEMENT_EVENT,
        onEngagement as EventListener,
      );
    };
  }, [tryOpen]);

  if (!open) return null;

  const dismissSoft = () => {
    recordFeedbackReferralPromptDismiss();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Dismiss for now"
        onClick={dismissSoft}
      />
      <div className="relative w-full max-w-md">
        <FeedbackReferralInviteCard
          onStart={() => {
            clearFeedbackReferralEngagement();
            setOpen(false);
            router.push("/feedback");
          }}
          onNotNow={dismissSoft}
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
