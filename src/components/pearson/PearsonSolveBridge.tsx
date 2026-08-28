/**
 * Bridges paperSessionStore ↔ PearsonExamPlayer for Conversion Studio–reviewed papers.
 */

"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import type { Letter, Question } from "@/types/papers";
import type {
  PearsonAnswerMap,
  PearsonFlagMap,
  PearsonModuleResult,
} from "@/lib/pearson/types";

function buildInitialAnswers(
  questions: Question[],
  answers: Array<{ choice: Letter | null }>,
  globalOffset: number,
): PearsonAnswerMap {
  const map: PearsonAnswerMap = {};
  questions.forEach((q, i) => {
    map[q.id] = answers[globalOffset + i]?.choice ?? null;
  });
  return map;
}

function buildInitialFlags(
  questions: Question[],
  reviewFlags: boolean[],
  globalOffset: number,
): PearsonFlagMap {
  const map: PearsonFlagMap = {};
  questions.forEach((q, i) => {
    map[q.id] = Boolean(reviewFlags[globalOffset + i]);
  });
  return map;
}

export interface PearsonSolveBridgeProps {
  examTitle: string;
  questions: Question[];
  /** Index of the first question of this module within the full session answers array. */
  globalOffset: number;
  timeLimitSeconds: number;
  isLastModule: boolean;
  onModuleAdvance: () => void;
}

export function PearsonSolveBridge({
  examTitle,
  questions,
  globalOffset,
  timeLimitSeconds,
  isLastModule,
  onModuleAdvance,
}: PearsonSolveBridgeProps) {
  const router = useRouter();
  const {
    answers,
    reviewFlags,
    setAnswer,
    setReviewFlag,
    setIsMarkingInfo,
    setEndedAt,
    setPaperFullscreenShowMainNavbar,
  } = usePaperSessionStore();

  useEffect(() => {
    setPaperFullscreenShowMainNavbar(false);
    document.documentElement.style.overflow = "hidden";
    return () => {
      setPaperFullscreenShowMainNavbar(true);
      document.documentElement.style.overflow = "";
    };
  }, [setPaperFullscreenShowMainNavbar]);

  const initialAnswers = useMemo(
    () => buildInitialAnswers(questions, answers, globalOffset),
    // Only seed once per module mount; store updates flow via onAnswerChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, globalOffset],
  );

  const initialFlags = useMemo(
    () => buildInitialFlags(questions, reviewFlags, globalOffset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, globalOffset],
  );

  const syncAnswersToStore = useCallback(
    (map: PearsonAnswerMap) => {
      questions.forEach((q, i) => {
        const choice = map[q.id];
        if (!choice) return;
        const globalIndex = globalOffset + i;
        setAnswer(globalIndex, choice);
      });
    },
    [globalOffset, questions, setAnswer],
  );

  const syncFlagsToStore = useCallback(
    (map: PearsonFlagMap) => {
      questions.forEach((q, i) => {
        const flagged = Boolean(map[q.id]);
        const globalIndex = globalOffset + i;
        const current = usePaperSessionStore.getState().reviewFlags[globalIndex];
        if (current !== flagged) {
          setReviewFlag(globalIndex, flagged);
        }
      });
    },
    [globalOffset, questions, setReviewFlag],
  );

  const handleComplete = useCallback(
    (result: PearsonModuleResult) => {
      questions.forEach((q, i) => {
        const globalIndex = globalOffset + i;
        const choice = result.answers[q.id];
        if (choice) {
          setAnswer(globalIndex, choice);
        }
        const flagged = Boolean(result.flagged[q.id]);
        const current = usePaperSessionStore.getState().reviewFlags[globalIndex];
        if (current !== flagged) {
          setReviewFlag(globalIndex, flagged);
        }
      });

      if (isLastModule) {
        setEndedAt(Date.now());
        setIsMarkingInfo(true);
        return;
      }
      onModuleAdvance();
    },
    [
      globalOffset,
      isLastModule,
      onModuleAdvance,
      questions,
      setAnswer,
      setEndedAt,
      setIsMarkingInfo,
      setReviewFlag,
    ],
  );

  if (questions.length === 0) {
    return (
      <div style={{ padding: 24, fontFamily: "Tahoma, sans-serif" }}>
        No questions in this module.
        <button type="button" onClick={() => router.push("/past-papers/library")}>
          Back to library
        </button>
      </div>
    );
  }

  return (
    <PearsonExamPlayer
      mode="strict-simulation"
      examTitle={examTitle}
      questions={questions}
      initialAnswers={initialAnswers}
      initialFlags={initialFlags}
      timeLimitSeconds={timeLimitSeconds}
      moduleTransition={{ enabled: false }}
      onAnswerChange={syncAnswersToStore}
      onFlagsChange={syncFlagsToStore}
      onModuleComplete={handleComplete}
    />
  );
}
