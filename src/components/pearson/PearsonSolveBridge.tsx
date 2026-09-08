/**
 * Bridges paperSessionStore ↔ PearsonExamPlayer for live past-paper sittings.
 */

"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { PearsonExamPlayer } from "@/components/pearson/PearsonExamPlayer";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import type { Letter, Question } from "@/types/papers";
import type { PearsonIntroMode } from "@/lib/pearson/usePearsonExamController";
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
  introMode?: PearsonIntroMode;
  sectionHeading?: string;
  initialQuestionIndex?: number;
  onModuleAdvance: () => void;
  onLastModuleComplete?: () => void;
  onQuestionsStarted?: () => void;
}

export function PearsonSolveBridge({
  examTitle,
  questions,
  globalOffset,
  timeLimitSeconds,
  isLastModule,
  introMode = "full",
  sectionHeading,
  initialQuestionIndex = 0,
  onModuleAdvance,
  onLastModuleComplete,
  onQuestionsStarted,
}: PearsonSolveBridgeProps) {
  const router = useRouter();
  const {
    setAnswer,
    setReviewFlag,
    setPaperFullscreenShowMainNavbar,
    setSectionStartTime,
    currentSectionIndex,
    navigateToQuestion,
  } = usePaperSessionStore(
    useShallow((s) => ({
      setAnswer: s.setAnswer,
      setReviewFlag: s.setReviewFlag,
      setPaperFullscreenShowMainNavbar: s.setPaperFullscreenShowMainNavbar,
      setSectionStartTime: s.setSectionStartTime,
      currentSectionIndex: s.currentSectionIndex,
      navigateToQuestion: s.navigateToQuestion,
    })),
  );

  useEffect(() => {
    setPaperFullscreenShowMainNavbar(false);
    document.documentElement.style.overflow = "hidden";
    return () => {
      setPaperFullscreenShowMainNavbar(true);
      document.documentElement.style.overflow = "";
    };
  }, [setPaperFullscreenShowMainNavbar]);

  useEffect(() => {
    if (introMode === "resume-questions") {
      const state = usePaperSessionStore.getState();
      if (!state.sectionStartTimes[currentSectionIndex]) {
        setSectionStartTime(currentSectionIndex, Date.now());
      }
    }
  }, [currentSectionIndex, introMode, setSectionStartTime]);

  const initialAnswers = useMemo(
    () =>
      buildInitialAnswers(
        questions,
        usePaperSessionStore.getState().answers,
        globalOffset,
      ),
    // Only seed once per module mount; store updates flow via onAnswerChange.
    [globalOffset, questions],
  );

  const initialFlags = useMemo(
    () =>
      buildInitialFlags(
        questions,
        usePaperSessionStore.getState().reviewFlags,
        globalOffset,
      ),
    // Only seed once per module mount; store updates flow via onFlagsChange.
    [globalOffset, questions],
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

  const handleQuestionIndexChange = useCallback(
    (index: number) => {
      navigateToQuestion(globalOffset + index);
    },
    [globalOffset, navigateToQuestion],
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
        onLastModuleComplete?.();
        return;
      }
      onModuleAdvance();
    },
    [
      globalOffset,
      isLastModule,
      onLastModuleComplete,
      onModuleAdvance,
      questions,
      setAnswer,
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
      introMode={introMode}
      sectionHeading={sectionHeading}
      initialQuestionIndex={initialQuestionIndex}
      suppressCompleteScreen
      moduleTransition={{ enabled: false }}
      onAnswerChange={syncAnswersToStore}
      onFlagsChange={syncFlagsToStore}
      onModuleComplete={handleComplete}
      onQuestionsStarted={onQuestionsStarted}
      onQuestionIndexChange={handleQuestionIndexChange}
    />
  );
}
