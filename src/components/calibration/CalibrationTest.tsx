"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { StemContent } from "@/components/shared/StemContent";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { cn } from "@/lib/utils";
import { CALIBRATION_QUESTIONS } from "@/lib/calibration/config";
import {
  createAttempt,
  getActiveAttempt,
  saveAttempt,
  clearActiveAttemptPointer,
} from "@/lib/calibration/attempt";
import { computeResults } from "@/lib/calibration/scoring";
import {
  trackCalibrationEvent,
  type CalibrationUserState,
} from "@/lib/calibration/analytics";
import { calibrationResultsRoute, CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import { QuestionNavigator } from "./QuestionNavigator";
import {
  ArrowRight,
  Grid3X3,
  HelpCircle,
  LogOut,
  X,
} from "lucide-react";

const PANEL_SHELL = "rounded-organic-xl bg-surface-elevated";

const SESSION_BAR_BTN =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-organic-md px-4 text-sm font-medium transition-all duration-fast ease-signature focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const SESSION_BAR_BTN_SECONDARY = cn(
  SESSION_BAR_BTN,
  "bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
  "dark:bg-surface dark:hover:bg-surface-elevated",
);

const SESSION_BAR_BTN_PRIMARY = cn(
  SESSION_BAR_BTN,
  "font-semibold bg-secondary text-background shadow-glow hover:brightness-110",
);

function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function CalibrationTest() {
  const router = useRouter();
  const session = useSupabaseSession();
  const userState: CalibrationUserState = session?.user ? "free" : "signed_out";

  const attemptRef = useRef<CalibrationAttempt | null>(null);
  const currentIndexRef = useRef(0);
  const activeSince = useRef<number>(Date.now());
  const submittingRef = useRef(false);
  const [, bump] = useReducer((c) => c + 1, 0);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"test" | "review">("test");
  const [remaining, setRemaining] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [guessHintDismissed, setGuessHintDismissed] = useState(false);

  const total = CALIBRATION_QUESTIONS.length;

  const mutate = useCallback((fn: (a: CalibrationAttempt) => void) => {
    const a = attemptRef.current;
    if (!a) return;
    fn(a);
    a.updatedAt = Date.now();
    saveAttempt(a);
    bump();
  }, []);

  const commitTime = useCallback(() => {
    const a = attemptRef.current;
    if (!a) return;
    const qid = a.order[currentIndexRef.current];
    const q = a.questions[qid];
    if (q) q.timeSpentMs += Date.now() - activeSince.current;
    activeSince.current = Date.now();
  }, []);

  const markPresented = useCallback((a: CalibrationAttempt, qid: string) => {
    const q = a.questions[qid];
    if (!q) return;
    if (q.presentedAt == null) q.presentedAt = Date.now();
    else q.returnedLater = true;
  }, []);

  const persistAndFinish = useCallback(
    async (a: CalibrationAttempt) => {
      const results = computeResults(a);
      if (session?.user) {
        try {
          await fetch("/api/calibration/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attempt: a, result: results }),
          });
        } catch {
          /* results are recomputed client-side; DB save is best-effort */
        }
      }
      void trackCalibrationEvent("calibration_completed", {
        user_state: userState,
        attempt_id: a.attemptId,
        readiness_band: results.readinessBand,
        primary_weakness: results.weaknesses[0]?.label,
      });
      router.push(calibrationResultsRoute(a.attemptId));
    },
    [router, session?.user, userState],
  );

  const handleSubmit = useCallback(
    (auto: boolean) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      commitTime();
      const a = attemptRef.current;
      if (!a) return;
      for (const qid of a.order) {
        if (a.questions[qid].finalSelectedOption == null) {
          a.questions[qid].skipped = true;
        }
      }
      a.submittedAt = Date.now();
      a.status = "completed";
      a.totalTimeSeconds = Math.max(
        0,
        a.timeLimitSeconds - Math.max(0, a.remainingSeconds),
      );
      saveAttempt(a);
      clearActiveAttemptPointer();
      if (auto) {
        void trackCalibrationEvent("calibration_abandoned", {
          user_state: userState,
          attempt_id: a.attemptId,
          cta_placement: "time_expired",
        });
      }
      void persistAndFinish(a);
    },
    [commitTime, persistAndFinish, userState],
  );

  useEffect(() => {
    let a = getActiveAttempt();
    const resumed = !!a;
    if (!a) a = createAttempt();
    attemptRef.current = a;

    let idx = a.order.findIndex(
      (qid) => a!.questions[qid].finalSelectedOption == null,
    );
    if (idx < 0) idx = 0;
    currentIndexRef.current = idx;
    markPresented(a, a.order[idx]);
    activeSince.current = Date.now();
    setRemaining(a.remainingSeconds);
    saveAttempt(a);
    setReady(true);

    void trackCalibrationEvent(
      resumed ? "calibration_resumed" : "calibration_started",
      {
        user_state: session?.user ? "free" : "signed_out",
        attempt_id: a.attemptId,
      },
    );
    void trackCalibrationEvent("calibration_question_viewed", {
      attempt_id: a.attemptId,
      question_number: idx + 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        const a = attemptRef.current;
        if (a) a.remainingSeconds = Math.max(0, next);
        if (next <= 0) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        if (a && next % 5 === 0) saveAttempt(a);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ready, handleSubmit]);

  useEffect(() => {
    const save = () => {
      const a = attemptRef.current;
      if (a && a.status !== "completed") {
        commitTime();
        saveAttempt(a);
      }
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("visibilitychange", save);
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("visibilitychange", save);
    };
  }, [commitTime]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= total) return;
      commitTime();
      currentIndexRef.current = index;
      const a = attemptRef.current;
      if (a) {
        markPresented(a, a.order[index]);
        activeSince.current = Date.now();
        saveAttempt(a);
      }
      setPhase("test");
      setShowNavigator(false);
      bump();
      void trackCalibrationEvent("calibration_question_viewed", {
        attempt_id: a?.attemptId,
        question_number: index + 1,
      });
    },
    [commitTime, markPresented, total],
  );

  if (!ready || !attemptRef.current) {
    return (
      <Container className="flex min-h-[50vh] items-center justify-center py-16">
        <p className="text-sm text-text-muted">Preparing your calibration…</p>
      </Container>
    );
  }

  const attempt = attemptRef.current;
  const currentIndex = currentIndexRef.current;
  const question = CALIBRATION_QUESTIONS[currentIndex];
  const qAttempt = attempt.questions[question.id];

  const answeredCount = attempt.order.filter(
    (qid) => attempt.questions[qid].finalSelectedOption != null,
  ).length;
  const guessedCount = attempt.order.filter(
    (qid) => attempt.questions[qid].markedAsGuess,
  ).length;

  const selectOption = (label: string) => {
    const before = qAttempt.finalSelectedOption;
    mutate((a) => {
      const q = a.questions[question.id];
      const now = Date.now();
      if (q.firstInteractionAt == null) q.firstInteractionAt = now;
      if (q.finalSelectedOption == null) {
        q.firstSelectedOption = label;
      } else if (q.finalSelectedOption !== label) {
        q.answerChangeCount += 1;
        q.answerChangeEvents.push({
          from: q.finalSelectedOption,
          to: label,
          at: now,
        });
      }
      q.finalSelectedOption = label;
      q.skipped = false;
    });
    void trackCalibrationEvent(
      before && before !== label
        ? "calibration_answer_changed"
        : "calibration_answer_selected",
      { attempt_id: attempt.attemptId, question_number: currentIndex + 1 },
    );
  };

  const toggleGuess = () => {
    setGuessHintDismissed(true);
    const willMark = !qAttempt.markedAsGuess;
    mutate((a) => {
      const q = a.questions[question.id];
      q.markedAsGuess = willMark;
      if (willMark && q.guessMarkedAt == null) {
        q.guessMarkedAt = new Date().toISOString();
      }
      if (q.guessChangeCount > 0 || q.guessMarkedAt != null) {
        q.guessChanged = true;
      }
      q.guessChangeCount += 1;
    });
    void trackCalibrationEvent("calibration_marked_for_review", {
      attempt_id: attempt.attemptId,
      question_number: currentIndex + 1,
      cta_placement: willMark ? "marked_guess" : "unmarked_guess",
    });
  };

  const skipForward = () => {
    if (qAttempt.finalSelectedOption == null) {
      void trackCalibrationEvent("calibration_question_skipped", {
        attempt_id: attempt.attemptId,
        question_number: currentIndex + 1,
      });
    }
    if (currentIndex === total - 1) {
      commitTime();
      setPhase("review");
      bump();
    } else {
      goTo(currentIndex + 1);
    }
  };

  const progressPct = ((currentIndex + 1) / total) * 100;
  const timePct = remaining / attempt.timeLimitSeconds;
  const timerColor =
    timePct <= 0.1
      ? "text-error"
      : timePct <= 0.5
        ? "text-warning"
        : "text-text";

  const leaveAndSave = () => {
    commitTime();
    const a = attemptRef.current;
    if (a) saveAttempt(a);
    void trackCalibrationEvent("calibration_abandoned", {
      user_state: userState,
      attempt_id: a?.attemptId,
      cta_placement: "leave_save",
      question_number: currentIndex + 1,
    });
    router.push(CALIBRATION_ROUTES.math1);
  };

  /* ----------------------------- Review screen ----------------------------- */
  if (phase === "review") {
    const reviewRows = attempt.order.map((qid, index) => {
      const q = attempt.questions[qid];
      const answered = q.finalSelectedOption != null;
      const visited = q.presentedAt != null;
      const status: "Complete" | "Incomplete" | "Unseen" = answered
        ? "Complete"
        : visited
          ? "Incomplete"
          : "Unseen";
      return { index, questionNumber: index + 1, status, guessed: q.markedAsGuess };
    });

    return (
      <div className="min-h-[calc(100vh-3.5rem)] py-8 pb-28 sm:py-10 sm:pb-32">
        <Container size="md">
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                Almost done
              </p>
              <h1 className="mt-1 font-heading text-2xl font-bold text-text">
                Review your answers
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Go back to anything unfinished or marked as a guess, then submit
                to see your diagnosis.
              </p>
            </div>

            <div className={cn(PANEL_SHELL, "p-5")}>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs uppercase text-text-muted">Answered</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-text">
                    {answeredCount}/{total}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-text-muted">
                    Unanswered
                  </dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-text">
                    {total - answeredCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-text-muted">Guessed</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-text">
                    {guessedCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-text-muted">Time left</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-text">
                    {formatClock(remaining)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className={cn(PANEL_SHELL, "overflow-hidden")}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Question
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Guessed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
                    <tr
                      key={row.index}
                      onClick={() => goTo(row.index)}
                      className="cursor-pointer transition-colors hover:bg-surface-mid/60"
                    >
                      <td className="px-4 py-3 text-sm text-text">
                        Question {row.questionNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-organic-sm px-2 py-1 text-xs font-semibold",
                            row.status === "Complete"
                              ? "bg-success/15 text-success"
                              : "bg-error/10 text-error",
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {row.guessed ? (
                            <HelpCircle
                              className="h-5 w-5 text-warning"
                              aria-label="Marked as guess"
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Container>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/98 shadow-bar-floating backdrop-blur-md">
          <Container size="lg" className="py-2 sm:py-2.5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => goTo(currentIndex)}
                className={SESSION_BAR_BTN_SECONDARY}
              >
                Back to questions
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className={SESSION_BAR_BTN_PRIMARY}
              >
                <span>Submit and see my diagnosis</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>
            </div>
          </Container>
        </div>
      </div>
    );
  }

  /* ------------------------------ Test screen ------------------------------ */
  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-6 pb-28 sm:py-8 sm:pb-32">
      <Container size="lg">
        <div className="space-y-6">
          {/* Stem panel — QuestionCard style */}
          <div className={cn(PANEL_SHELL, "px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-6")}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-semibold tabular-nums text-text sm:text-2xl">
                  {currentIndex + 1}.
                </span>
                <span className="rounded-organic-md bg-surface-mid px-3.5 py-1.5 text-xs font-semibold tracking-wide text-maths sm:px-4 sm:py-2 sm:text-sm">
                  Math 1
                </span>
                <span className="rounded-organic-md bg-surface-mid px-3.5 py-1.5 text-xs font-semibold tracking-wide text-text-muted sm:px-4 sm:py-2 sm:text-sm">
                  Calibration
                </span>
              </div>
              <div
                className={cn(
                  "rounded-organic-lg bg-surface-mid px-3 py-2 sm:px-4",
                  "tabular-nums text-lg font-semibold tracking-tight",
                  timerColor,
                )}
                aria-live="polite"
                aria-label={`Time remaining ${formatClock(remaining)}`}
              >
                {formatClock(remaining)}
              </div>
            </div>

            <div className="text-[1.05rem] font-sans leading-relaxed tracking-tight text-text sm:text-[1.125rem]">
              <StemContent
                content={question.question_text_markdown}
                className="text-inherit"
              />
              {question.diagram_svg ? (
                <StemContent content={question.diagram_svg} className="mt-4" />
              ) : null}
            </div>
          </div>

          {/* Options panel */}
          <div className={cn(PANEL_SHELL, "p-4 sm:p-5")}>
            <div
              className="flex flex-col gap-2.5"
              role="radiogroup"
              aria-label="Answer options"
            >
              {question.options.map((option) => {
                const selected = qAttempt.finalSelectedOption === option.label;
                return (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectOption(option.label)}
                    className={cn(
                      "relative flex w-full items-center gap-3 overflow-hidden rounded-organic-md px-3.5 py-2.5 text-left sm:px-4 sm:py-3",
                      "transition-[background-color] duration-fast ease-signature",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                      selected
                        ? "bg-surface-mid dark:bg-folder-card-selected"
                        : "bg-surface-subtle hover:bg-surface-mid/70 dark:bg-surface-mid dark:hover:bg-surface-neutral",
                    )}
                  >
                    <span
                      className={cn(
                        "flex w-6 shrink-0 items-center text-sm font-semibold tabular-nums leading-none",
                        selected ? "text-text" : "text-text-muted",
                      )}
                    >
                      {option.label}
                    </span>
                    <div className="min-w-0 flex-1 text-[0.98rem] font-sans leading-relaxed tracking-tight text-text sm:text-[1.02rem]">
                      <StemContent
                        content={option.text_markdown}
                        className="text-inherit inline"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom session bar — QuestionBankSessionBar style */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/98 shadow-bar-floating backdrop-blur-md">
        <div
          className="h-2.5 w-full overflow-hidden bg-surface-elevated sm:h-3"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Session progress"
        >
          <div
            className="h-full bg-secondary transition-[width] duration-300 ease-signature"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <Container size="lg" className="py-1.5 sm:py-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <p className="min-w-0 shrink-0 text-xs text-text-muted sm:text-sm">
              Questions done{" "}
              <span className="font-semibold tabular-nums text-text">
                {answeredCount}
              </span>
              <span className="text-text-subtle"> / </span>
              <span className="tabular-nums text-text-muted">{total}</span>
            </p>

            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                className={SESSION_BAR_BTN_SECONDARY}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Leave</span>
              </button>

              <div className="relative">
                {currentIndex === 0 && !guessHintDismissed && !qAttempt.markedAsGuess ? (
                  <div className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-organic-lg bg-secondary px-3 py-2 text-xs font-medium leading-snug text-background shadow-glow">
                    Choosing mainly by elimination? Mark it as a guess.
                    <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-secondary" />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={toggleGuess}
                  className={cn(
                    SESSION_BAR_BTN_SECONDARY,
                    qAttempt.markedAsGuess && "text-warning hover:text-warning",
                  )}
                  aria-pressed={qAttempt.markedAsGuess}
                >
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">
                    {qAttempt.markedAsGuess ? "Marked As Guess" : "Mark As Guess"}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowNavigator(true)}
                className={SESSION_BAR_BTN_SECONDARY}
              >
                <Grid3X3 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Navigator</span>
              </button>

              <button
                type="button"
                onClick={skipForward}
                className={SESSION_BAR_BTN_PRIMARY}
              >
                <span>
                  {currentIndex === total - 1
                    ? "Review & submit"
                    : "Next question"}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* Navigator modal */}
      <AnimatePresence>
        {showNavigator ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-background/75 p-4 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigator-title"
            onClick={() => setShowNavigator(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowNavigator(false)}
                className="absolute right-4 top-4 rounded-organic-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <h2
                id="navigator-title"
                className="pr-8 font-heading text-xl font-bold text-text"
              >
                Question navigator
              </h2>
              <div className="mt-4">
                <QuestionNavigator
                  items={attempt.order.map((qid, index) => ({
                    index,
                    answered:
                      attempt.questions[qid].finalSelectedOption != null,
                    guessed: attempt.questions[qid].markedAsGuess,
                    current: index === currentIndex,
                  }))}
                  onJump={goTo}
                />
              </div>
              <button
                type="button"
                className={cn(SESSION_BAR_BTN_PRIMARY, "mt-5 w-full")}
                onClick={() => {
                  commitTime();
                  setShowNavigator(false);
                  setPhase("review");
                  bump();
                }}
              >
                Review &amp; submit
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Leave confirm */}
      <AnimatePresence>
        {showLeaveConfirm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-calibration-title"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="absolute right-4 top-4 rounded-organic-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
              <h2
                id="leave-calibration-title"
                className="pr-8 font-heading text-xl font-bold text-text"
              >
                Leave calibration?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Your progress is saved on this device. You can resume from the
                calibration intro page.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="rounded-organic-lg px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                >
                  Keep going
                </button>
                <button
                  type="button"
                  onClick={leaveAndSave}
                  className="rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-background shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  Leave &amp; save
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
