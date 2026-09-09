"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { PearsonSolveBridge } from "@/components/pearson/PearsonSolveBridge";
import { PearsonPleaseWaitScreen } from "@/components/pearson/PearsonPleaseWaitScreen";
import { PearsonResultsLoadingScreen } from "@/components/pearson/PearsonResultsLoadingScreen";
import { usePaperSessionHydrated } from "@/hooks/usePaperSessionHydrated";
import { useSessionActivity } from "@/hooks/useSessionActivity";
import { formatPastPaperExamTitle } from "@/lib/pearson/examTitle";
import { formatPearsonSectionHeading } from "@/lib/pearson/splitPaperSections";
import type { PearsonIntroMode } from "@/lib/pearson/usePearsonExamController";
import { useShallow } from "zustand/react/shallow";
import { usePaperSessionStore } from "@/store/paperSessionStore";

export function PearsonPastPaperSession() {
  const router = useRouter();
  const paperStoreHydrated = usePaperSessionHydrated();
  const loadedPaperIdRef = useRef<number | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const {
    sessionId,
    paperId,
    paperName,
    paperVariant,
    questions,
    questionsLoading,
    questionsError,
    currentQuestionIndex,
    startedAt,
    isRestoring,
    loadQuestions,
    navigateToQuestion,
    incrementTime,
    setEndedAt,
    selectedSections,
    currentSectionIndex,
    sectionTimeLimits,
    allSectionsQuestions,
    getSectionRemainingTime,
    setSectionStartTime,
    setSectionInstructionTimer,
    saveSessionToIndexedDB,
    updateTimerState,
    currentPipelineState,
  } = usePaperSessionStore(
    useShallow((s) => ({
      sessionId: s.sessionId,
      paperId: s.paperId,
      paperName: s.paperName,
      paperVariant: s.paperVariant,
      questions: s.questions,
      questionsLoading: s.questionsLoading,
      questionsError: s.questionsError,
      currentQuestionIndex: s.currentQuestionIndex,
      startedAt: s.startedAt,
      isRestoring: s.isRestoring,
      loadQuestions: s.loadQuestions,
      navigateToQuestion: s.navigateToQuestion,
      incrementTime: s.incrementTime,
      setEndedAt: s.setEndedAt,
      selectedSections: s.selectedSections,
      currentSectionIndex: s.currentSectionIndex,
      sectionTimeLimits: s.sectionTimeLimits,
      allSectionsQuestions: s.allSectionsQuestions,
      getSectionRemainingTime: s.getSectionRemainingTime,
      setSectionStartTime: s.setSectionStartTime,
      setSectionInstructionTimer: s.setSectionInstructionTimer,
      saveSessionToIndexedDB: s.saveSessionToIndexedDB,
      updateTimerState: s.updateTimerState,
      currentPipelineState: s.currentPipelineState,
    })),
  );

  useSessionActivity();

  const sectionModules = useMemo(() => {
    if (allSectionsQuestions.length > 0) return allSectionsQuestions;
    return questions.length > 0 ? [questions] : [];
  }, [allSectionsQuestions, questions]);

  const currentSectionQuestions = sectionModules[currentSectionIndex] ?? [];
  const globalOffset = useMemo(
    () =>
      sectionModules
        .slice(0, currentSectionIndex)
        .reduce((sum, section) => sum + section.length, 0),
    [currentSectionIndex, sectionModules],
  );
  const isLastModule =
    sectionModules.length > 0 && currentSectionIndex >= sectionModules.length - 1;

  const examTitle = useMemo(
    () =>
      formatPastPaperExamTitle({
        paperName,
        paperVariant,
        questions,
      }),
    [paperName, paperVariant, questions],
  );

  const firstInSection = currentSectionQuestions[0];
  const sectionHeading = firstInSection
    ? formatPearsonSectionHeading(
        {
          partLetter: firstInSection.partLetter || "",
          partName: firstInSection.partName || selectedSections[currentSectionIndex] || "",
        },
        examTitle,
      )
    : undefined;

  const introMode: PearsonIntroMode =
    currentPipelineState === "section"
      ? "resume-questions"
      : currentSectionIndex === 0
        ? "full"
        : "section-only";

  const timeLimitSeconds =
    introMode === "resume-questions"
      ? Math.max(1, getSectionRemainingTime(currentSectionIndex))
      : Math.max(
          60,
          (sectionTimeLimits[currentSectionIndex] ||
            Math.ceil(currentSectionQuestions.length * 1.48)) * 60,
        );

  const sectionRelativeIndex = Math.max(0, currentQuestionIndex - globalOffset);

  useEffect(() => {
    const shouldLoad =
      sessionId &&
      paperId &&
      !questionsLoading &&
      questions.length === 0 &&
      loadedPaperIdRef.current !== paperId;

    if (!shouldLoad) return;

    loadQuestions(paperId)
      .then(() => {
        const state = usePaperSessionStore.getState();
        if (state.questionsError) {
          loadedPaperIdRef.current = null;
          return;
        }
        loadedPaperIdRef.current = paperId;

        let targetIndex = state.currentQuestionIndex;
        const hasProgress =
          state.currentSectionIndex > 0 ||
          state.currentQuestionIndex > 0 ||
          state.visitedQuestions.some(Boolean) ||
          state.answers.some((answer) => answer?.choice != null);
        const firstInFirstSection = state.allSectionsQuestions?.[0]?.[0];
        if (!hasProgress && firstInFirstSection && state.questions.length > 0) {
          const gi = state.questions.findIndex(
            (q) => q.id === firstInFirstSection.id,
          );
          if (gi >= 0) targetIndex = gi;
        }
        if (targetIndex >= 0 && targetIndex < state.questions.length) {
          navigateToQuestion(targetIndex);
        } else if (state.questions.length > 0) {
          navigateToQuestion(0);
        }
      })
      .catch(() => {
        loadedPaperIdRef.current = null;
      });
  }, [
    loadQuestions,
    navigateToQuestion,
    paperId,
    questions.length,
    questionsLoading,
    sessionId,
  ]);

  useEffect(() => {
    if (!paperStoreHydrated || isRestoring) return;
    if (!sessionId) {
      router.replace("/past-papers/library");
    }
  }, [isRestoring, paperStoreHydrated, router, sessionId]);

  useEffect(() => {
    if (!sessionId || questions.length === 0) return;
    const state = usePaperSessionStore.getState();
    const answered = state.answers.some((answer) => answer?.choice != null);
    if (
      !answered &&
      state.currentSectionIndex === 0 &&
      state.currentPipelineState === "section" &&
      !state.sectionStartTimes[0]
    ) {
      setSectionInstructionTimer(60);
    }
  }, [questions.length, sessionId, setSectionInstructionTimer]);

  useEffect(() => {
    if (!startedAt || loadingResults) return;
    const tick = window.setInterval(() => {
      const state = usePaperSessionStore.getState();
      if (state.isMarkingInfo) return;
      if (state.currentPipelineState !== "section") return;
      incrementTime(state.currentQuestionIndex);
      updateTimerState();
    }, 1000);
    return () => window.clearInterval(tick);
  }, [incrementTime, loadingResults, startedAt, updateTimerState]);

  const handleModuleAdvance = useCallback(() => {
    const nextIndex = currentSectionIndex + 1;
    const nextSection = sectionModules[nextIndex] || [];
    const first = nextSection[0];
    const nextQuestionIndex = first
      ? Math.max(
          0,
          usePaperSessionStore.getState().questions.findIndex((q) => q.id === first.id),
        )
      : 0;

    usePaperSessionStore.setState({
      currentSectionIndex: nextIndex,
      currentQuestionIndex: nextQuestionIndex,
    });
    setSectionInstructionTimer(60);
    saveSessionToIndexedDB().catch(() => {});
  }, [
    currentSectionIndex,
    saveSessionToIndexedDB,
    sectionModules,
    setSectionInstructionTimer,
  ]);

  const handleLastModuleComplete = useCallback(() => {
    setEndedAt(Date.now());
    usePaperSessionStore.setState({ isMarkingInfo: false });
    saveSessionToIndexedDB().catch(() => {});
    setLoadingResults(true);
  }, [saveSessionToIndexedDB, setEndedAt]);

  const handleResultsReady = useCallback(() => {
    router.push("/past-papers/mark");
  }, [router]);

  const handleQuestionsStarted = useCallback(() => {
    setSectionStartTime(currentSectionIndex, Date.now());
    setSectionInstructionTimer(0);
  }, [currentSectionIndex, setSectionInstructionTimer, setSectionStartTime]);

  if (!paperStoreHydrated || isRestoring) {
    return <PearsonPleaseWaitScreen />;
  }

  if (!sessionId) {
    return (
      <Container size="lg">
        <div className="py-12 text-center">
          <div className="text-neutral-400">
            No active session found. Please start a new session.
          </div>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push("/past-papers/library")}
          >
            Start New Session
          </Button>
        </div>
      </Container>
    );
  }

  if (loadingResults) {
    return <PearsonResultsLoadingScreen onComplete={handleResultsReady} />;
  }

  if (questionsLoading && questions.length === 0) {
    return <PearsonPleaseWaitScreen />;
  }

  // Early Start now navigation can arrive before questionsLoading flips true.
  if (
    sessionId &&
    paperId &&
    questions.length === 0 &&
    !questionsError &&
    currentSectionQuestions.length === 0
  ) {
    return <PearsonPleaseWaitScreen />;
  }

  if (questionsError) {
    return (
      <Container size="lg">
        <div className="py-16 text-center">
          <p className="text-sm text-red-400">{questionsError}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => paperId && loadQuestions(paperId)}
          >
            Retry
          </Button>
        </div>
      </Container>
    );
  }

  if (currentSectionQuestions.length === 0) {
    return (
      <Container size="lg">
        <div className="py-12 text-center text-neutral-400">
          No questions in this section.
        </div>
      </Container>
    );
  }

  return (
    <PearsonSolveBridge
      key={`${sessionId}-${currentSectionIndex}`}
      examTitle={examTitle || "Past paper"}
      questions={currentSectionQuestions}
      globalOffset={globalOffset}
      timeLimitSeconds={timeLimitSeconds}
      isLastModule={isLastModule}
      introMode={introMode}
      sectionHeading={sectionHeading}
      initialQuestionIndex={sectionRelativeIndex}
      onModuleAdvance={handleModuleAdvance}
      onLastModuleComplete={handleLastModuleComplete}
      onQuestionsStarted={handleQuestionsStarted}
    />
  );
}
