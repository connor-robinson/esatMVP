"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { FeedbackReferralInviteCard } from "@/components/feedbackReferral/FeedbackReferralInviteCard";
import { FeedbackSurveyForm } from "@/components/feedbackReferral/FeedbackSurveyForm";
import { resetFeedbackReferralPromptPrefs } from "@/lib/feedbackReferral/promptStorage";

type Stage = "invite" | "survey" | "done" | "dismissed";

/**
 * Local preview of the first-time feedback-referral popup → questionnaire.
 * Open /dev/feedback-referral (no login required for the UI rehearsal).
 */
export default function DevFeedbackReferralPage() {
  const [stage, setStage] = useState<Stage>("invite");
  const [code, setCode] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  const subtitle = useMemo(() => {
    if (stage === "invite") return "First thing the user sees";
    if (stage === "survey") return "After they tap Start";
    if (stage === "dismissed") return "After Not now / Don't show again";
    return "After they finish";
  }, [stage]);

  const resetInvite = () => {
    resetFeedbackReferralPromptPrefs();
    setCode(null);
    setStage("invite");
    setReplayKey((k) => k + 1);
  };

  return (
    <div className="relative min-h-[calc(100vh-58px)] bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(76, 139, 245, 0.35) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <Container className="relative py-8 sm:py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
            Dev preview
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text">
            Feedback referral popup
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {subtitle}. Rehearses the invite → questionnaire motion. Live codes
            still come from a signed-in allowlisted account on{" "}
            <Link href="/feedback" className="font-medium text-[#4C8BF5]">
              /feedback
            </Link>
            .
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetInvite}
              className="rounded-xl bg-surface-elevated px-3.5 py-2 text-xs font-semibold text-text ring-1 ring-text/[0.06]"
            >
              Replay first popup
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("survey");
                setReplayKey((k) => k + 1);
              }}
              className="rounded-xl bg-surface-mid px-3.5 py-2 text-xs font-semibold text-text"
            >
              Jump to questionnaire
            </button>
          </div>
        </div>
      </Container>

      <AnimatePresence mode="wait">
        {stage === "invite" ? (
          <motion.div
            key={`invite-${replayKey}`}
            className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden />
            <motion.div
              className="relative w-full max-w-md"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <FeedbackReferralInviteCard
                onStart={() => setStage("survey")}
                onNotNow={() => setStage("dismissed")}
                onDontShowAgain={() => setStage("dismissed")}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {stage === "survey" ? (
          <motion.div
            key={`survey-${replayKey}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <FeedbackSurveyForm
              preview
              onComplete={(result) => {
                setCode(result.code);
                setStage("done");
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {stage === "done" ? (
        <Container className="relative pb-16">
          <div className="mx-auto max-w-md rounded-[1.5rem] bg-surface-elevated p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text">Code ready</h2>
            <p className="mt-2 text-sm text-text-muted">
              Friend applies it in Stripe Checkout. Find it again in Settings →
              Account. It locks after one use.
            </p>
            {code ? (
              <p className="mt-5 rounded-xl bg-surface-mid px-4 py-3 font-mono text-lg font-bold tracking-wide text-text">
                {code}
              </p>
            ) : null}
            <button
              type="button"
              onClick={resetInvite}
              className="mt-6 inline-flex rounded-xl bg-[#4C8BF5] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#3B7AE0]"
            >
              Replay from the start
            </button>
          </div>
        </Container>
      ) : null}

      {stage === "dismissed" ? (
        <Container className="relative pb-16">
          <div className="mx-auto max-w-md rounded-[1.5rem] bg-surface-elevated p-6 text-center sm:p-8">
            <p className="text-sm text-text-muted">
              Popup closed. In production, <span className="font-medium text-text">Not now</span>{" "}
              only hides it for this session.{" "}
              <span className="font-medium text-text">Don&apos;t show again</span>{" "}
              hides it until prefs are cleared.
            </p>
            <button
              type="button"
              onClick={resetInvite}
              className="mt-6 inline-flex rounded-xl bg-[#4C8BF5] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#3B7AE0]"
            >
              Show popup again
            </button>
          </div>
        </Container>
      ) : null}
    </div>
  );
}
