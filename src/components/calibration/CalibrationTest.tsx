"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MathContent } from "@/components/shared/MathContent";
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
import { trackCalibrationEvent, type CalibrationUserState } from "@/lib/calibration/analytics";
import { calibrationResultsRoute } from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import { ConfidenceSelector } from "./ConfidenceSelector";
import { QuestionNavigator } from "./QuestionNavigator";

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
        if (a.questions[qid].finalSelectedOption == null) a.questions[qid].skipped = true;
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

  // Initialise / resume attempt.
  useEffect(() => {
    let a = getActiveAttempt();
    const resumed = !!a;
    if (!a) a = createAttempt();
    attemptRef.current = a;

    // Resume at the first unanswered question, else the first question.
    let idx = a.order.findIndex((qid) => a!.questions[qid].finalSelectedOption == null);
    if (idx < 0) idx = 0;
    currentIndexRef.current = idx;
    markPresented(a, a.order[idx]);
    activeSince.current = Date.now();
    setRemaining(a.remainingSeconds);
    saveAttempt(a);
    setReady(true);

    void trackCalibrationEvent(resumed ? "calibration_resumed" : "calibration_started", {
      user_state: session?.user ? "free" : "signed_out",
      attempt_id: a.attemptId,
    });
    void trackCalibrationEvent("calibration_question_viewed", {
      attempt_id: a.attemptId,
      question_number: idx + 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global countdown timer.
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

  // Autosave on tab hide / navigation away.
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
  const markedCount = attempt.order.filter(
    (qid) => attempt.questions[qid].markedForReview,
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
        q.answerChangeEvents.push({ from: q.finalSelectedOption, to: label, at: now });
      }
      q.finalSelectedOption = label;
      q.skipped = false;
    });
    void trackCalibrationEvent(
      before && before !== label ? "calibration_answer_changed" : "calibration_answer_selected",
      { attempt_id: attempt.attemptId, question_number: currentIndex + 1 },
    );
  };

  const setConfidence = (value: number) => {
    mutate((a) => {
      const q = a.questions[question.id];
      q.confidenceEvents.push({ value, at: Date.now() });
      if (q.initialConfidence == null) q.initialConfidence = value;
      q.finalConfidence = value;
    });
    void trackCalibrationEvent("calibration_confidence_submitted", {
      attempt_id: attempt.attemptId,
      question_number: currentIndex + 1,
    });
  };

  const toggleReview = () => {
    const willMark = !qAttempt.markedForReview;
    mutate((a) => {
      a.questions[question.id].markedForReview = willMark;
    });
    if (willMark) {
      void trackCalibrationEvent("calibration_marked_for_review", {
        attempt_id: attempt.attemptId,
        question_number: currentIndex + 1,
      });
    }
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

  const elapsed = attempt.timeLimitSeconds - remaining;
  const lowTime = remaining <= 120;

  /* ----------------------------- Review screen ----------------------------- */
  if (phase === "review") {
    return (
      <Container size="md" className="py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Almost done
            </p>
            <h1 className="mt-1 text-2xl font-bold text-text">Review your answers</h1>
            <p className="mt-2 text-sm text-text-muted">
              Check anything you marked for review, then submit to see your diagnosis.
            </p>
          </div>

          <Card variant="subtle" className="p-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-text-muted">Answered</dt>
                <dd className="mt-1 text-xl font-bold text-text">
                  {answeredCount}/{total}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-text-muted">Unanswered</dt>
                <dd className="mt-1 text-xl font-bold text-text">{total - answeredCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-text-muted">For review</dt>
                <dd className="mt-1 text-xl font-bold text-text">{markedCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-text-muted">Time left</dt>
                <dd className="mt-1 text-xl font-bold text-text">{formatClock(remaining)}</dd>
              </div>
            </dl>
          </Card>

          <QuestionNavigator
            items={attempt.order.map((qid, index) => ({
              index,
              answered: attempt.questions[qid].finalSelectedOption != null,
              markedForReview: attempt.questions[qid].markedForReview,
              current: false,
            }))}
            onJump={goTo}
          />

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={() => handleSubmit(false)}>
              Submit and see my diagnosis
            </Button>
            <Button variant="ghost" onClick={() => goTo(currentIndex)}>
              Back to questions
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  /* ------------------------------ Test screen ------------------------------ */
  return (
    <Container size="lg" className="py-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          {/* Header: progress + timer */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                Question {currentIndex + 1} of {total}
              </p>
              <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-fast"
                  style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
              </div>
            </div>
            <div
              className={cn(
                "text-right text-sm font-semibold tabular-nums",
                lowTime ? "text-warning" : "text-text-muted",
              )}
              aria-live="polite"
              aria-label={`Time remaining ${formatClock(remaining)}`}
            >
              {formatClock(remaining)}
            </div>
          </div>

          <Card variant="elevated" className="p-6">
            <StemContent content={question.question_text_markdown} className="text-base text-text" />
            {question.diagram_svg ? (
              <StemContent content={question.diagram_svg} className="mt-4" />
            ) : null}

            <div
              className="mt-6 space-y-2.5"
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
                      "flex w-full items-center gap-3 rounded-organic-md px-4 py-3 text-left transition-colors duration-fast ease-signature",
                      "focus-visible:outline-none focus-visible:shadow-glow-focus",
                      selected
                        ? "bg-primary/15 text-text ring-2 ring-primary"
                        : "bg-surface-subtle text-text hover:bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        selected ? "bg-primary text-background" : "bg-surface text-text-muted",
                      )}
                      aria-hidden
                    >
                      {option.label}
                    </span>
                    <MathContent content={option.text_markdown} className="text-sm" />
                  </button>
                );
              })}
            </div>

            {qAttempt.finalSelectedOption != null ? (
              <ConfidenceSelector value={qAttempt.finalConfidence} onChange={setConfidence} />
            ) : null}
          </Card>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleReview}
                className={cn(
                  "rounded-organic-md px-3 py-2 text-sm font-medium transition-colors duration-fast",
                  qAttempt.markedForReview
                    ? "bg-warning/15 text-warning"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text",
                )}
                aria-pressed={qAttempt.markedForReview}
              >
                {qAttempt.markedForReview ? "Marked for review" : "Mark for review"}
              </button>
              <Button variant="primary" onClick={skipForward}>
                {currentIndex === total - 1 ? "Review & submit" : "Next"}
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-text-muted">
            Your progress is saved on this device. You can resume later.
          </p>
        </div>

        {/* Navigator sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card variant="subtle" className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
              Question navigator
            </h2>
            <div className="mt-3">
              <QuestionNavigator
                items={attempt.order.map((qid, index) => ({
                  index,
                  answered: attempt.questions[qid].finalSelectedOption != null,
                  markedForReview: attempt.questions[qid].markedForReview,
                  current: index === currentIndex,
                }))}
                onJump={goTo}
              />
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => {
                commitTime();
                setPhase("review");
                bump();
              }}
            >
              Review &amp; submit
            </Button>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
