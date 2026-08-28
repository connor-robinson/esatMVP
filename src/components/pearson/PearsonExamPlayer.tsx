/**
 * PearsonExamPlayer – Pearson VUE / ESAT-style module player.
 *
 * Flow (reviewed text-mode papers):
 * 1. Loading screen
 * 2. NDA / welcome (untimed)
 * 3. Instructions (untimed)
 * 4. Questions with Navigator, Flag, colour schemes
 */

"use client";

import { useMemo } from "react";
import type { Question } from "@/types/papers";
import type {
  ExamMode,
  ModuleTransitionConfig,
  PearsonAnswerMap,
  PearsonFlagMap,
  PearsonModuleResult,
} from "@/lib/pearson/types";
import { usePearsonExamController } from "@/lib/pearson/usePearsonExamController";
import { DesktopFidelityGate } from "./DesktopFidelityGate";
import { EndExamDialog } from "./EndExamDialog";
import { EndModuleDialog } from "./EndModuleDialog";
import { PearsonExamShell } from "./PearsonExamShell";
import { PearsonFooter } from "./PearsonFooter";
import { PearsonHeader } from "./PearsonHeader";
import { PearsonHotkeyManager } from "./PearsonHotkeyManager";
import { PearsonInstructionsScreen } from "./PearsonInstructionsScreen";
import { PearsonLoadingScreen } from "./PearsonLoadingScreen";
import { PearsonNavigator } from "./PearsonNavigator";
import { PearsonNdaScreen } from "./PearsonNdaScreen";
import { PearsonQuestionViewport } from "./PearsonQuestionViewport";
import { PearsonReviewScreen } from "./PearsonReviewScreen";
import { PearsonRichQuestion } from "./PearsonRichQuestion";
import { PearsonToolbar } from "./PearsonToolbar";
import { UnseenContentDialog } from "./UnseenContentDialog";
import { PearsonSessionEndingOverlay } from "./PearsonSessionEndingOverlay";

export interface PearsonExamPlayerProps {
  mode: ExamMode;
  examTitle: string;
  questions: Question[];
  initialAnswers?: PearsonAnswerMap;
  initialFlags?: PearsonFlagMap;
  timeLimitSeconds?: number;
  moduleTransition?: ModuleTransitionConfig;
  onModuleComplete: (result: PearsonModuleResult) => void;
  onAnswerChange?: (answers: PearsonAnswerMap) => void;
  onFlagsChange?: (flags: PearsonFlagMap) => void;
}

export function PearsonExamPlayer({
  mode,
  examTitle,
  questions,
  initialAnswers,
  initialFlags,
  timeLimitSeconds,
  moduleTransition,
  onModuleComplete,
  onAnswerChange,
  onFlagsChange,
}: PearsonExamPlayerProps) {
  const c = usePearsonExamController({
    mode,
    questions,
    initialAnswers,
    initialFlags,
    timeLimitSeconds,
    moduleTransition: moduleTransition ?? { enabled: false },
    onModuleComplete,
    onAnswerChange,
    onFlagsChange,
  });

  const hotkeyApi = useMemo(
    () => ({
      handleVerifiedHotkey: c.handleVerifiedHotkey,
      completed: c.completed,
    }),
    [c.handleVerifiedHotkey, c.completed],
  );

  const showChrome =
    c.screen !== "loading" &&
    c.screen !== "complete" &&
    c.screen !== "module-transition";

  const showToolbar =
    showChrome &&
    (c.screen === "nda" ||
      c.screen === "instructions" ||
      c.screen === "question" ||
      c.screen === "review" ||
      c.screen === "unseen-content-warning" ||
      c.screen === "end-exam-confirmation" ||
      c.screen === "end-module-confirmation");

  const jumpFromReview = (index: number) => {
    if (index < 0) return;
    c.goToQuestionIndex(index);
  };

  const firstIncompleteIndex = () => {
    const row = c.navigatorRows.find((r) => r.status !== "complete");
    return row?.questionIndex ?? 0;
  };

  const firstFlaggedIndex = () => {
    const row = c.navigatorRows.find((r) => r.flagged);
    return row?.questionIndex ?? 0;
  };

  return (
    <PearsonExamShell colourScheme={c.colourScheme} zoomLevel={c.zoomLevel}>
      <PearsonHotkeyManager controller={hotkeyApi} />
      <DesktopFidelityGate />

      {c.screen === "loading" ? (
        <PearsonLoadingScreen onComplete={c.completeLoading} />
      ) : (
        <>
          {showChrome ? (
            <>
              <PearsonHeader
                examTitle={examTitle}
                showQuestionCounter={c.showQuestionCounter}
                questionIndex={c.currentQuestionIndex}
                totalQuestions={c.totalQuestions}
                counterHidden={c.questionCounterHidden}
                onToggleCounter={c.toggleQuestionCounterHidden}
              />
              {showToolbar ? (
                <PearsonToolbar
                  showFlag={c.showFlagToolbar}
                  flagged={c.currentFlagged}
                  onToggleFlag={c.toggleCurrentFlag}
                  colourScheme={c.colourScheme}
                  onColourSchemeChange={c.changeColourScheme}
                  disabled={c.moduleLocked}
                />
              ) : null}
            </>
          ) : null}

          <div className="pearson-main">
            {c.screen === "nda" ? <PearsonNdaScreen /> : null}

            {c.screen === "instructions" ? (
              <PearsonInstructionsScreen questionCount={c.totalQuestions} />
            ) : null}

            {(c.screen === "question" ||
              c.screen === "unseen-content-warning" ||
              (c.screen === "end-exam-confirmation" && c.moduleDeadline != null)) &&
            c.currentQuestion ? (
              <PearsonQuestionViewport
                questionKey={c.currentQuestion.id}
                zoomLevel={c.zoomLevel}
                onViewedToEnd={c.onViewportViewedToEnd}
              >
                <PearsonRichQuestion
                  question={c.currentQuestion}
                  selected={c.currentAnswer}
                  onSelect={c.selectAnswer}
                  disabled={c.moduleLocked}
                />
              </PearsonQuestionViewport>
            ) : null}

            {(c.screen === "review" || c.screen === "end-module-confirmation") ? (
              <PearsonReviewScreen
                flagged={c.reviewLists.flagged}
                unanswered={c.reviewLists.unanswered}
                allQuestions={c.questions}
                onReviewQuestion={(index) => jumpFromReview(index)}
                onReviewAll={() => jumpFromReview(0)}
                onReviewIncomplete={() => jumpFromReview(firstIncompleteIndex())}
                onReviewFlagged={() => jumpFromReview(firstFlaggedIndex())}
                onEndReview={c.requestEndReview}
              />
            ) : null}

            {c.screen === "module-transition" ? (
              <div className="pearson-review-overlay">
                <p>Module complete. Preparing the next module…</p>
              </div>
            ) : null}

            {c.screen === "complete" ? (
              <div className="pearson-review-overlay">
                <h1 style={{ fontSize: 16, margin: "0 0 8px" }}>Module ended</h1>
                <p style={{ margin: 0, fontSize: 13 }}>
                  This module is complete. Unused time does not carry over.
                </p>
              </div>
            ) : null}

            {c.navigatorOpen ? (
              <PearsonNavigator
                rows={c.navigatorRows}
                unseenIncompleteCount={c.unseenIncompleteCount}
                onJump={(index) => c.tryNavigateTo(index)}
                onClose={c.closeNavigator}
              />
            ) : null}

            {c.screen === "unseen-content-warning" ? (
              <UnseenContentDialog onOk={c.dismissUnseenContent} />
            ) : null}

            {c.screen === "end-exam-confirmation" ? (
              <EndExamDialog onYes={c.confirmEndExam} onNo={c.cancelEndExam} />
            ) : null}

            {c.screen === "end-module-confirmation" ? (
              <EndModuleDialog
                onYes={c.confirmEndModule}
                onNo={c.cancelEndModule}
              />
            ) : null}
          </div>

          {c.showPrequestionFooter ? (
            <PearsonFooter
              variant="prequestion"
              onEndExam={c.requestEndExam}
              onNext={c.goNext}
            />
          ) : null}

          {c.showQuestionFooter ? (
            <PearsonFooter
              variant="question"
              onEndExam={c.requestEndExam}
              onNext={c.goNext}
              onNavigator={c.openNavigator}
              nextDisabled={c.moduleLocked}
              navigatorDisabled={c.moduleLocked}
            />
          ) : null}

          {c.screen === "session-ending" ? (
            <PearsonSessionEndingOverlay />
          ) : null}
        </>
      )}
    </PearsonExamShell>
  );
}
