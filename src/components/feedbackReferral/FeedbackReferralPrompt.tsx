"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { FeedbackReferralInviteCard } from "@/components/feedbackReferral/FeedbackReferralInviteCard";
import {
  hasFeedbackReferralDontShowAgain,
  hasFeedbackReferralSessionDismiss,
  setFeedbackReferralDontShowAgain,
  setFeedbackReferralSessionDismiss,
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
];

/**
 * Soft invite for the feedback-for-referral survey.
 * Keeps showing until the user finishes, or taps Don't show again.
 * "Not now" only hides for the current browser session.
 */
export function FeedbackReferralPrompt() {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setOpen(false);
      return;
    }
    if (HIDDEN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
      setOpen(false);
      return;
    }
    if (hasFeedbackReferralDontShowAgain() || hasFeedbackReferralSessionDismiss()) {
      setOpen(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch("/api/feedback-referral/status")
        .then(async (res) => {
          if (res.status === 403 || !res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (cancelled || !data?.enabled || data.completed) {
            setOpen(false);
            return;
          }
          if (
            hasFeedbackReferralDontShowAgain() ||
            hasFeedbackReferralSessionDismiss()
          ) {
            setOpen(false);
            return;
          }
          setOpen(true);
        })
        .catch(() => {
          if (!cancelled) setOpen(false);
        });
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session?.user, pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label="Dismiss for now"
        onClick={() => {
          setFeedbackReferralSessionDismiss();
          setOpen(false);
        }}
      />
      <div className="relative w-full max-w-md">
        <FeedbackReferralInviteCard
          onStart={() => {
            setFeedbackReferralSessionDismiss();
            setOpen(false);
            router.push("/feedback");
          }}
          onNotNow={() => {
            setFeedbackReferralSessionDismiss();
            setOpen(false);
          }}
          onDontShowAgain={() => {
            setFeedbackReferralDontShowAgain();
            setOpen(false);
          }}
        />
      </div>
    </div>
  );
}
