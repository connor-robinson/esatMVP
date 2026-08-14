"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";

type QuestionBankTimeUpModalProps = {
  open: boolean;
  remainingQuestions: number;
  extendMinutes: number;
  onContinueToReview: () => void;
  onExtendTime: () => void;
};

export function QuestionBankTimeUpModal({
  open,
  remainingQuestions,
  extendMinutes,
  onContinueToReview,
  onExtendTime,
}: QuestionBankTimeUpModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="time-up-title"
          aria-describedby="time-up-description"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
              <Clock className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </div>

            <h2
              id="time-up-title"
              className="mt-4 font-heading text-xl font-bold text-text"
            >
              Time&apos;s up
            </h2>
            <p
              id="time-up-description"
              className="mt-3 text-sm leading-relaxed text-text-muted"
            >
              {remainingQuestions > 0 ? (
                <>
                  You still have{" "}
                  <span className="font-semibold text-text">
                    {remainingQuestions} question
                    {remainingQuestions === 1 ? "" : "s"}
                  </span>{" "}
                  left. Continue to review what you&apos;ve done, or extend your
                  time to finish the session.
                </>
              ) : (
                <>
                  Continue to review your session, or extend your time if you
                  still want to finish this question.
                </>
              )}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onContinueToReview}
                className="rounded-organic-lg px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
              >
                Continue to review
              </button>
              <button
                type="button"
                onClick={onExtendTime}
                className="rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-background shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Extend time (+{extendMinutes} min)
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export const QUESTION_BANK_TIME_EXTENSION_MINUTES = 5;
