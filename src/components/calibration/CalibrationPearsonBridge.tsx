/**
 * Runs the Math 1 calibration attempt inside PearsonExamPlayer (ESAT UI),
 * while keeping calibration attempt persistence, scoring, and results routing.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  CALIBRATION_QUESTIONS,
} from "@/lib/calibration/config";
import {
  clearActiveAttemptPointer,
  createAttempt,
  getActiveAttempt,
  saveAttempt,
} from "@/lib/calibration/attempt";
import { computeResults } from "@/lib/calibration/scoring";
import {
  trackCalibrationEvent,
  type CalibrationUserState,
} from "@/lib/calibration/analytics";
import {
  CALIBRATION_TIME_LIMIT_SECONDS,
  calibrationResultsRoute,
} from "@/lib/calibration/constants";
import {
  calibrationQuestionsToPearson,
  pearsonIdToCalibrationId,
} from "@/lib/calibration/toPearsonQuestion";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import type {
  PearsonAnswerMap,
  PearsonFlagMap,
  PearsonModuleResult,
} from "@/lib/pearson/types";
import type { Letter } from "@/types/papers";

export function CalibrationPearsonBridge() {
  const router = useRouter();
  const session = useSupabaseSession();
  const userState: CalibrationUserState = session?.user ? "free" : "signed_out";

  const attemptRef = useRef<CalibrationAttempt | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const activeSinceRef = useRef<number>(Date.now());
  const currentIndexRef = useRef(0);
  const submittingRef = useRef(false);
  const [ready, setReady] = useState(false);

  const pearsonQuestions = useMemo(
    () => calibrationQuestionsToPearson(CALIBRATION_QUESTIONS),
    [],
  );

  const commitTime = useCallback(() => {
    const a = attemptRef.current;
    if (!a) return;
    const qid = a.order[currentIndexRef.current];
    const q = a.questions[qid];
    if (q) q.timeSpentMs += Date.now() - activeSinceRef.current;
    activeSinceRef.current = Date.now();
  }, []);

  const syncRemainingFromDeadline = useCallback(() => {
    const a = attemptRef.current;
    if (!a || deadlineRef.current == null) return;
    a.remainingSeconds = Math.max(
      0,
      Math.round((deadlineRef.current - Date.now()) / 1000),
    );
  }, []);

  const persistAttempt = useCallback(() => {
    const a = attemptRef.current;
    if (!a || a.status === "completed") return;
    commitTime();
    syncRemainingFromDeadline();
    a.updatedAt = Date.now();
    saveAttempt(a);
  }, [commitTime, syncRemainingFromDeadline]);

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

  useEffect(() => {
    let a = getActiveAttempt();
    const wasResumed = !!a;
    if (!a) a = createAttempt();
    attemptRef.current = a;

    let idx = a.order.findIndex(
      (qid) => a!.questions[qid].finalSelectedOption == null,
    );
    if (idx < 0) idx = 0;
    currentIndexRef.current = idx;
    activeSinceRef.current = Date.now();
    saveAttempt(a);
    setReady(true);

    void trackCalibrationEvent(
      wasResumed ? "calibration_resumed" : "calibration_started",
      {
        user_state: session?.user ? "free" : "signed_out",
        attempt_id: a.attemptId,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onLeave = () => persistAttempt();
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("visibilitychange", onLeave);
    const id = window.setInterval(persistAttempt, 5000);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("visibilitychange", onLeave);
      window.clearInterval(id);
    };
  }, [persistAttempt]);

  const initialAnswers = useMemo((): PearsonAnswerMap => {
    const a = attemptRef.current;
    const map: PearsonAnswerMap = {};
    if (!a) return map;
    pearsonQuestions.forEach((pq, index) => {
      const qid = CALIBRATION_QUESTIONS[index]?.id;
      const selected = qid ? a.questions[qid]?.finalSelectedOption : null;
      map[pq.id] = (selected as Letter | null) ?? null;
    });
    return map;
    // Seed once when ready; subsequent edits flow through onAnswerChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pearsonQuestions]);

  const initialFlags = useMemo((): PearsonFlagMap => {
    const a = attemptRef.current;
    const map: PearsonFlagMap = {};
    if (!a) return map;
    pearsonQuestions.forEach((pq, index) => {
      const qid = CALIBRATION_QUESTIONS[index]?.id;
      const q = qid ? a.questions[qid] : null;
      map[pq.id] = Boolean(q?.markedAsGuess || q?.markedForReview);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pearsonQuestions]);

  const hasProgress = useMemo(() => {
    const a = attemptRef.current;
    if (!a || !ready) return false;
    const answered = a.order.some(
      (qid) => a.questions[qid].finalSelectedOption != null,
    );
    const clockMoved = a.remainingSeconds < a.timeLimitSeconds;
    return answered || clockMoved;
  }, [ready]);

  useEffect(() => {
    if (!ready || !hasProgress) return;
    const a = attemptRef.current;
    if (!a || deadlineRef.current != null) return;
    deadlineRef.current =
      Date.now() + Math.max(1, a.remainingSeconds) * 1000;
  }, [ready, hasProgress]);

  const introMode = hasProgress ? "resume-questions" : "full";
  const timeLimitSeconds = hasProgress
    ? Math.max(1, attemptRef.current?.remainingSeconds ?? CALIBRATION_TIME_LIMIT_SECONDS)
    : CALIBRATION_TIME_LIMIT_SECONDS;
  const initialQuestionIndex = ready ? currentIndexRef.current : 0;

  const syncAnswers = useCallback(
    (map: PearsonAnswerMap) => {
      const a = attemptRef.current;
      if (!a) return;
      const now = Date.now();
      pearsonQuestions.forEach((pq) => {
        const calId = pearsonIdToCalibrationId(CALIBRATION_QUESTIONS, pq.id);
        if (!calId) return;
        const q = a.questions[calId];
        if (!q) return;
        const next = map[pq.id];
        if (next == null) return;
        if (q.firstInteractionAt == null) q.firstInteractionAt = now;
        if (q.finalSelectedOption == null) {
          q.firstSelectedOption = next;
        } else if (q.finalSelectedOption !== next) {
          q.answerChangeCount += 1;
          q.answerChangeEvents.push({
            from: q.finalSelectedOption,
            to: next,
            at: now,
          });
        }
        q.finalSelectedOption = next;
        q.skipped = false;
      });
      persistAttempt();
    },
    [pearsonQuestions, persistAttempt],
  );

  const syncFlags = useCallback(
    (map: PearsonFlagMap) => {
      const a = attemptRef.current;
      if (!a) return;
      pearsonQuestions.forEach((pq) => {
        const calId = pearsonIdToCalibrationId(CALIBRATION_QUESTIONS, pq.id);
        if (!calId) return;
        const q = a.questions[calId];
        if (!q) return;
        const flagged = Boolean(map[pq.id]);
        const was = q.markedAsGuess || q.markedForReview;
        if (was === flagged) return;
        q.markedForReview = flagged;
        q.markedAsGuess = flagged;
        if (flagged && q.guessMarkedAt == null) {
          q.guessMarkedAt = new Date().toISOString();
        }
        if (q.guessChangeCount > 0 || q.guessMarkedAt != null) {
          q.guessChanged = true;
        }
        q.guessChangeCount += 1;
      });
      persistAttempt();
    },
    [pearsonQuestions, persistAttempt],
  );

  const handleQuestionsStarted = useCallback(() => {
    const a = attemptRef.current;
    if (!a) return;
    const seconds = Math.max(1, a.remainingSeconds || CALIBRATION_TIME_LIMIT_SECONDS);
    deadlineRef.current = Date.now() + seconds * 1000;
    activeSinceRef.current = Date.now();
    const qid = a.order[currentIndexRef.current];
    const q = a.questions[qid];
    if (q && q.presentedAt == null) q.presentedAt = Date.now();
    saveAttempt(a);
    void trackCalibrationEvent("calibration_question_viewed", {
      attempt_id: a.attemptId,
      question_number: currentIndexRef.current + 1,
    });
  }, []);

  const handleQuestionIndexChange = useCallback(
    (index: number) => {
      commitTime();
      currentIndexRef.current = index;
      const a = attemptRef.current;
      if (!a) return;
      const qid = a.order[index];
      const q = a.questions[qid];
      if (q) {
        if (q.presentedAt == null) q.presentedAt = Date.now();
        else q.returnedLater = true;
      }
      activeSinceRef.current = Date.now();
      persistAttempt();
      void trackCalibrationEvent("calibration_question_viewed", {
        attempt_id: a.attemptId,
        question_number: index + 1,
      });
    },
    [commitTime, persistAttempt],
  );

  const handleModuleComplete = useCallback(
    (result: PearsonModuleResult) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      commitTime();
      const a = attemptRef.current;
      if (!a) return;

      pearsonQuestions.forEach((pq) => {
        const calId = pearsonIdToCalibrationId(CALIBRATION_QUESTIONS, pq.id);
        if (!calId) return;
        const q = a.questions[calId];
        if (!q) return;
        const choice = result.answers[pq.id];
        if (choice) {
          if (q.finalSelectedOption == null) q.firstSelectedOption = choice;
          q.finalSelectedOption = choice;
          q.skipped = false;
        } else if (q.finalSelectedOption == null) {
          q.skipped = true;
        }
        const flagged = Boolean(result.flagged[pq.id]);
        q.markedForReview = flagged;
        q.markedAsGuess = flagged;
      });

      a.remainingSeconds = Math.max(0, Math.round(result.remainingMsAtEnd / 1000));
      a.submittedAt = result.completedAt;
      a.status = "completed";
      a.totalTimeSeconds = Math.max(
        0,
        a.timeLimitSeconds - Math.max(0, a.remainingSeconds),
      );
      a.updatedAt = Date.now();
      saveAttempt(a);
      clearActiveAttemptPointer();

      if (result.remainingMsAtEnd <= 0) {
        void trackCalibrationEvent("calibration_abandoned", {
          user_state: userState,
          attempt_id: a.attemptId,
          cta_placement: "time_expired",
        });
      }

      void persistAndFinish(a);
    },
    [commitTime, pearsonQuestions, persistAndFinish, userState],
  );

  if (!ready || !attemptRef.current) {
    return (
      <Container className="flex min-h-[50vh] items-center justify-center py-16">
        <p className="text-sm text-text-muted">Preparing your calibration…</p>
      </Container>
    );
  }

  return (
    <PearsonExamPlayer
      key={attemptRef.current.attemptId}
      mode="strict-simulation"
      examTitle="ESAT Mathematics 1 Calibration"
      questions={pearsonQuestions}
      initialAnswers={initialAnswers}
      initialFlags={initialFlags}
      timeLimitSeconds={timeLimitSeconds}
      introMode={introMode}
      sectionHeading="Mathematics 1"
      initialQuestionIndex={initialQuestionIndex}
      suppressCompleteScreen
      moduleTransition={{ enabled: false }}
      onAnswerChange={syncAnswers}
      onFlagsChange={syncFlags}
      onModuleComplete={handleModuleComplete}
      onQuestionsStarted={handleQuestionsStarted}
      onQuestionIndexChange={handleQuestionIndexChange}
      isLastModule
      showQuestionReport={false}
    />
  );
}
