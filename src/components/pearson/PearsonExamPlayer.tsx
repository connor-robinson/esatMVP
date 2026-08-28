/**
 * PearsonExamPlayer – Pearson VUE / ESAT-style module player.
 *
 * INTEGRATION (parent):
 * Gate the past-paper solve page with isStudioReviewedPaper(paperId) from
 * `@/lib/pearson/studioReviewedPapers`. When true, render PearsonExamPlayer
 * instead of the current solve UI. Pass the paper's Question[] and handle
 * onModuleComplete to persist answers / advance to the next module.
 *
 * Strict mode defaults: no invented inter-module countdown; only verified
 * shortcuts (Alt+N, Ctrl+/Ctrl-); clock click toggles timer numerals.
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
import { EndModuleDialog } from "./EndModuleDialog";
import { PearsonExamShell } from "./PearsonExamShell";
import { PearsonFooter } from "./PearsonFooter";
import { PearsonHeader } from "./PearsonHeader";
import { PearsonHotkeyManager } from "./PearsonHotkeyManager";
import { PearsonNavigator } from "./PearsonNavigator";
import { PearsonQuestionViewport } from "./PearsonQuestionViewport";
import { PearsonReviewScreen } from "./PearsonReviewScreen";
import { PearsonRichQuestion } from "./PearsonRichQuestion";
import { PearsonToolbar } from "./PearsonToolbar";
import { UnseenContentDialog } from "./UnseenContentDialog";

export interface PearsonExamPlayerProps {
  mode: ExamMode;
  examTitle: string;
  questions: Question[];
  initialAnswers?: PearsonAnswerMap;
  initialFlags?: PearsonFlagMap;
  /** Default 40*60 (VERIFIED_ESAT module length). */
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
      completed: c.moduleLocked,
    }),
    [c.handleVerifiedHotkey, c.moduleLocked],
  );

  const showChrome =
    c.screen === "question" ||
    c.screen === "unseen-content-warning" ||
    c.screen === "end-module-confirmation";

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

      {showChrome ? (
        <>
          <PearsonHeader
            examTitle={examTitle}
            remainingLabel={c.remainingLabel}
            timerHidden={c.timerHidden}
            onToggleTimer={c.toggleTimerHidden}
            questionIndex={c.currentQuestionIndex}
            totalQuestions={c.totalQuestions}
          />
          <PearsonToolbar
            flagged={c.currentFlagged}
            onToggleFlag={c.toggleCurrentFlag}
            colourScheme={c.colourScheme}
            onColourSchemeChange={c.changeColourScheme}
            disabled={c.moduleLocked}
          />
        </>
      ) : (
        <PearsonHeader
          examTitle={examTitle}
          remainingLabel={c.remainingLabel}
          timerHidden={c.timerHidden}
          onToggleTimer={c.toggleTimerHidden}
          questionIndex={c.currentQuestionIndex}
          totalQuestions={c.totalQuestions}
        />
      )}

      <div className="pearson-main">
        {c.screen === "question" ||
        c.screen === "unseen-content-warning" ||
        c.screen === "end-module-confirmation" ? (
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
          ) : null
        ) : null}

        {c.screen === "navigator" ? (
          <PearsonNavigator
            rows={c.navigatorRows}
            onJump={(index) => c.tryNavigateTo(index)}
            onClose={c.closeNavigator}
          />
        ) : null}

        {c.screen === "review" ? (
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
            {/* UNVERIFIED break UI: only reachable when moduleTransition.enabled
                and mode is not strict-simulation. */}
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

        {c.screen === "unseen-content-warning" ? (
          <UnseenContentDialog onOk={c.dismissUnseenContent} />
        ) : null}

        {c.screen === "end-module-confirmation" ? (
          <EndModuleDialog
            onYes={c.confirmEndModule}
            onNo={c.cancelEndModule}
          />
        ) : null}
      </div>

      {c.screen === "question" ||
      c.screen === "unseen-content-warning" ||
      c.screen === "end-module-confirmation" ? (
        <PearsonFooter
          onPrevious={c.goPrevious}
          onNext={c.goNext}
          onNavigator={c.openNavigator}
          previousDisabled={c.currentQuestionIndex <= 0 || c.moduleLocked}
          nextDisabled={c.moduleLocked}
          navigatorDisabled={c.moduleLocked}
        />
      ) : null}
    </PearsonExamShell>
  );
}
