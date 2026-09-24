"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Grid3X3,
  Hash,
  LogOut,
} from "lucide-react";
import { StemContent } from "@/components/shared/StemContent";
import { StatementItemsList } from "@/components/shared/StatementItemsList";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import { EupOptionTable } from "@/components/questionBank/esatUiPreview/EupOptionTable";
import { getQuestionStatementItems } from "@/lib/questionBank/statementItems";
import { extractLetterLabeledTable } from "@/lib/papers/tableBackedOptions";
import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
} from "@/types/questionBank";
import { cn } from "@/lib/utils";
import { QuestionSupportControl } from "@/components/support/QuestionSupportControl";
import { RestBreakOverlay } from "@/components/exam/RestBreakOverlay";
import "@/components/exam/restBreakOverlay.css";
import "@/components/questionBank/esatUiPreview/esatUiPreview.css";

type NavStatus = "unseen" | "incomplete" | "correct" | "incorrect";

function navStatusLabel(status: NavStatus): string {
  if (status === "correct") return "Correct";
  if (status === "incorrect") return "Incorrect";
  if (status === "incomplete") return "Incomplete";
  return "Unseen";
}

function difficultyPillClass(d: string): string {
  if (d === "Easy") return "eup-pill--easy";
  if (d === "Hard") return "eup-pill--hard";
  return "eup-pill--medium";
}

function resolveNavStatus(
  questionId: string,
  index: number,
  currentIndex: number,
  attempt: QuestionBankSessionAttempt | undefined,
  currentLocked: boolean,
  currentIsCorrect: boolean | null,
  currentRevealed: boolean,
): NavStatus {
  if (attempt) {
    if (attempt.wasRevealed && !attempt.isCorrect) return "incorrect";
    if (attempt.isCorrect) return "correct";
    return attempt.isCorrect ? "correct" : "incorrect";
  }
  if (index === currentIndex) {
    if (currentLocked && currentRevealed && currentIsCorrect !== true) {
      return "incorrect";
    }
    if (currentLocked && currentIsCorrect === true) return "correct";
    return "incomplete";
  }
  if (index < currentIndex) return "incomplete";
  return "unseen";
}

export interface QuestionBankEsatSessionShellProps {
  question: QuestionBankQuestion;
  questions: QuestionBankQuestion[];
  currentIndex: number;
  attemptLog: QuestionBankSessionAttempt[];
  remainingTimeMs: number | null;
  timerLabel: string;
  reviewMode?: boolean;
  /** Practice: feedback as you go. Exam: no feedback until finish. */
  examMode?: boolean;
  /**
   * Legacy: selecting an option immediately checks it.
   * Prefer false so Practice requires Check answer / Next.
   */
  instantReveal?: boolean;
  currentSelection: string | null;
  incorrectAnswers: Set<string>;
  isAnswered: boolean;
  isCorrect: boolean | null;
  answerRevealed: boolean;
  showLeaveConfirm: boolean;
  flaggedIds: Set<string>;
  onToggleFlag: (questionId: string) => void;
  onSelectionChange: (letter: string | null) => void;
  /** Instant mode: check/reveal using this letter immediately. */
  onInstantSelect?: (letter: string) => void;
  onSubmitAnswer: () => void;
  onRevealAnswer: () => void;
  onShowExplanation: () => void;
  onShowHint: () => void;
  hasHint: boolean;
  showHint: boolean;
  hintContent: string | null;
  onCloseHint: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onJumpTo: (index: number) => void;
  onOpenLeaveConfirm: () => void;
  onCloseLeaveConfirm: () => void;
  onSaveAndLeave: () => void;
  onDiscardSession: () => void;
  onUseClassicUi: () => void;
  showExplanation: boolean;
  explanationContent: string | null;
  onCloseExplanation: () => void;
  sessionId?: string | null;
  /** Optional block rendered under the stem + options (e.g. support review meta). */
  belowQuestion?: ReactNode;
  /** Extra controls in the bottom footer (admin review actions). */
  footerExtra?: ReactNode;
  /** Hide the in-session report control (e.g. admin reviewing reports). */
  hideSupportControl?: boolean;
  /** Override the header product label (default: Question bank). */
  sessionTitle?: string;
  /**
   * Hide the Classic UI toggle (e.g. Mistakes always uses the new exam shell).
   */
  hideClassicUiToggle?: boolean;
  restBreaksEnabled?: boolean;
  restBreakActive?: boolean;
  restBreaksLeft?: number;
  canTakeRestBreak?: boolean;
  onStartRestBreak?: () => void;
  onEndRestBreak?: () => void;
}

export function QuestionBankEsatSessionShell({
  question,
  questions,
  currentIndex,
  attemptLog,
  remainingTimeMs,
  timerLabel,
  reviewMode = false,
  examMode = false,
  instantReveal = false,
  currentSelection,
  incorrectAnswers,
  isAnswered,
  isCorrect,
  answerRevealed,
  showLeaveConfirm,
  flaggedIds,
  onToggleFlag,
  onSelectionChange,
  onInstantSelect,
  onSubmitAnswer,
  onRevealAnswer,
  onShowExplanation,
  onShowHint,
  hasHint,
  showHint,
  hintContent,
  onCloseHint,
  onNext,
  onPrevious,
  onJumpTo,
  onOpenLeaveConfirm,
  onCloseLeaveConfirm,
  onSaveAndLeave,
  onDiscardSession,
  onUseClassicUi,
  showExplanation,
  explanationContent,
  onCloseExplanation,
  sessionId,
  belowQuestion,
  footerExtra,
  hideSupportControl = false,
  sessionTitle,
  hideClassicUiToggle = false,
  restBreaksEnabled = false,
  restBreakActive = false,
  restBreaksLeft = 0,
  canTakeRestBreak = false,
  onStartRestBreak,
  onEndRestBreak,
}: QuestionBankEsatSessionShellProps) {
  const [timerHidden, setTimerHidden] = useState(false);
  const [counterHidden, setCounterHidden] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [resultFlash, setResultFlash] = useState<{
    letter: string;
    kind: "correct" | "wrong";
  } | null>(null);

  const total = questions.length;
  const progressPct = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  const hideLiveFeedback = examMode && !reviewMode;
  const locked = hideLiveFeedback
    ? false
    : reviewMode || answerRevealed || (isAnswered && isCorrect === true);
  const canProceed = hideLiveFeedback ? true : locked;
  const canSubmit =
    !hideLiveFeedback &&
    !instantReveal &&
    !!currentSelection &&
    !incorrectAnswers.has(currentSelection) &&
    !canProceed;
  const isLast = currentIndex >= total - 1;
  const optionLetters = Object.keys(question.options).sort();
  const statementItems = getQuestionStatementItems(question) ?? [];
  const optionTableExtracted = extractLetterLabeledTable(question.question_stem);
  const useInlineOptionTable = optionTableExtracted.table != null;
  const subjectLabel = question.subjects?.trim() || "Question bank";
  const flagged = flaggedIds.has(question.id);

  const attemptsById = useMemo(() => {
    const map = new Map<string, QuestionBankSessionAttempt>();
    for (const a of attemptLog) map.set(a.questionId, a);
    return map;
  }, [attemptLog]);

  const unfinishedCount = useMemo(() => {
    let n = 0;
    questions.forEach((q, i) => {
      if (hideLiveFeedback) {
        const attempt = attemptsById.get(q.id);
        const answeredHere =
          i === currentIndex
            ? !!currentSelection
            : Boolean(attempt?.userAnswer);
        if (!answeredHere) n += 1;
        return;
      }
      const status = resolveNavStatus(
        q.id,
        i,
        currentIndex,
        attemptsById.get(q.id),
        locked,
        isCorrect,
        answerRevealed,
      );
      if (status === "unseen" || status === "incomplete") n += 1;
    });
    return n;
  }, [
    questions,
    currentIndex,
    attemptsById,
    locked,
    isCorrect,
    answerRevealed,
    hideLiveFeedback,
    currentSelection,
  ]);

  useEffect(() => {
    document.documentElement.classList.add("esat-ui-preview-active");
    return () => {
      document.documentElement.classList.remove("esat-ui-preview-active");
    };
  }, []);

  useEffect(() => {
    setNavigatorOpen(false);
    setResultFlash(null);
  }, [question.id]);

  const selectOption = (letter: string) => {
    if (locked || (!hideLiveFeedback && incorrectAnswers.has(letter))) return;
    if (hideLiveFeedback) {
      onSelectionChange(letter);
      return;
    }
    if (instantReveal && onInstantSelect) {
      onSelectionChange(letter);
      const correct = letter === question.correct_option;
      setResultFlash({
        letter,
        kind: correct ? "correct" : "wrong",
      });
      window.setTimeout(() => setResultFlash(null), 550);
      onInstantSelect(letter);
      return;
    }
    onSelectionChange(letter);
  };

  const handleCheck = () => {
    if (!canSubmit || !currentSelection) return;
    const correct = currentSelection === question.correct_option;
    setResultFlash({
      letter: currentSelection,
      kind: correct ? "correct" : "wrong",
    });
    window.setTimeout(() => setResultFlash(null), 550);
    onSubmitAnswer();
  };

  const handleReveal = () => {
    if (locked || hideLiveFeedback) return;
    setResultFlash({
      letter: question.correct_option,
      kind: "correct",
    });
    window.setTimeout(() => setResultFlash(null), 550);
    onRevealAnswer();
  };

  const jump = (index: number) => {
    onJumpTo(index);
    setNavigatorOpen(false);
  };

  return (
    <div
      className="esat-ui-preview-root"
      data-theme="light"
      data-session-mode={examMode ? "exam" : "instant"}
      role="application"
      aria-label={examMode ? "Question bank exam session" : "Question bank session"}
    >
      {restBreakActive && onEndRestBreak ? (
        <RestBreakOverlay
          breaksRemainingAfterResume={Math.max(0, restBreaksLeft - 1)}
          onResume={onEndRestBreak}
          tone="esat"
        />
      ) : null}
      <header className="eup-header">
        <div className="eup-header-left">
          <div className="eup-header-title">
            {reviewMode
              ? "Review"
              : examMode
                ? "Exam mode"
                : sessionTitle ?? "Question bank"}{" "}
            · {subjectLabel}
          </div>
          {!examMode || reviewMode ? (
            hideClassicUiToggle ? null : (
              <button
                type="button"
                className="eup-theme-toggle"
                onClick={onUseClassicUi}
                title="Switch back to the previous question bank layout"
              >
                Classic UI
              </button>
            )
          ) : (
            <span className="eup-theme-toggle" style={{ cursor: "default", opacity: 0.85 }}>
              Exam conditions
            </span>
          )}
        </div>
        <div className="eup-header-right">
          {!reviewMode ? (
            <button
              type="button"
              className="eup-header-leave"
              onClick={onOpenLeaveConfirm}
            >
              <LogOut size={16} strokeWidth={2} aria-hidden />
              Leave
            </button>
          ) : null}
          {!reviewMode && restBreaksEnabled && remainingTimeMs != null ? (
            <button
              type="button"
              className="eup-header-meta"
              onClick={onStartRestBreak}
              disabled={!canTakeRestBreak || restBreakActive}
              aria-label={
                canTakeRestBreak
                  ? `Start rest break (${restBreaksLeft} remaining)`
                  : "No rest breaks remaining"
              }
              title={
                canTakeRestBreak
                  ? `Pause the clock (${restBreaksLeft} left)`
                  : "No rest breaks left for this session"
              }
            >
              <span>Pause</span>
              <span aria-hidden>{restBreaksLeft}</span>
            </button>
          ) : null}
          {!reviewMode && remainingTimeMs != null ? (
            <button
              type="button"
              className={cn(
                "eup-header-meta",
                timerHidden && "eup-header-meta--icon-only",
              )}
              onClick={() => setTimerHidden((v) => !v)}
              aria-label={timerHidden ? "Show timer" : "Hide timer"}
            >
              <Clock size={16} strokeWidth={2} aria-hidden />
              {!timerHidden ? <span>{timerLabel}</span> : null}
            </button>
          ) : (
            <span className="eup-header-meta" style={{ cursor: "default" }}>
              {reviewMode ? "No timer" : null}
            </span>
          )}
          <button
            type="button"
            className={cn(
              "eup-header-meta",
              counterHidden && "eup-header-meta--icon-only",
            )}
            onClick={() => setCounterHidden((v) => !v)}
            aria-label={counterHidden ? "Show question counter" : "Hide counter"}
          >
            <Hash size={16} strokeWidth={2} aria-hidden />
            {!counterHidden ? (
              <span>
                {currentIndex + 1} of {total}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="eup-toolbar">
        <div className="eup-toolbar-pills">
          <span
            className={cn("eup-pill", difficultyPillClass(question.difficulty))}
          >
            {question.difficulty}
          </span>
          <span className="eup-pill eup-pill--subject">{subjectLabel}</span>
        </div>
        <div className="eup-toolbar-actions">
          <button
            type="button"
            className="eup-toolbar-btn"
            aria-pressed={flagged}
            onClick={() => onToggleFlag(question.id)}
          >
            <Flag
              size={17}
              strokeWidth={2}
              fill={flagged ? "currentColor" : "none"}
              aria-hidden
            />
            <span>Flag for Review</span>
          </button>
          {!hideLiveFeedback ? (
            <>
              <span className="eup-toolbar-divider" aria-hidden />
              {!reviewMode ? (
                <>
                  <button
                    type="button"
                    className="eup-toolbar-btn"
                    onClick={handleReveal}
                    disabled={locked}
                  >
                    <Eye size={17} strokeWidth={2} aria-hidden />
                    <span>Reveal answer</span>
                  </button>
                  <span className="eup-toolbar-divider" aria-hidden />
                </>
              ) : null}
              {hasHint ? (
                <>
                  <button
                    type="button"
                    className="eup-toolbar-btn"
                    onClick={onShowHint}
                  >
                    <span>Hint</span>
                  </button>
                  <span className="eup-toolbar-divider" aria-hidden />
                </>
              ) : null}
              <button
                type="button"
                className="eup-toolbar-btn"
                onClick={onShowExplanation}
                disabled={!locked || !explanationContent}
                title={
                  locked
                    ? "View explanation"
                    : "Solve or reveal the answer first"
                }
              >
                <span>Explanation</span>
              </button>
            </>
          ) : (
            <span className="eup-toolbar-btn" style={{ cursor: "default", opacity: 0.9 }}>
              Answers hidden until finish
            </span>
          )}
        </div>
      </div>

      <div
        className="eup-progress"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Session progress"
      >
        <div
          className="eup-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="eup-main">
        <div className="eup-viewport">
          <div className="eup-question-row">
            <span
              className="eup-qnum"
              aria-label={`Question ${currentIndex + 1}`}
            >
              {currentIndex + 1}.
            </span>
            <div className="eup-stem">
              {question.graph_specs ? (
                <QuestionWithGraph
                  questionText={
                    useInlineOptionTable
                      ? optionTableExtracted.before
                      : question.question_stem
                  }
                  graphSpecs={question.graph_specs}
                  className="text-inherit"
                />
              ) : useInlineOptionTable ? (
                <>
                  {optionTableExtracted.before.trim() ? (
                    <StemContent
                      content={optionTableExtracted.before}
                      className="text-inherit"
                    />
                  ) : null}
                  {optionTableExtracted.table ? (
                    <EupOptionTable
                      name={`qb-esat-${question.id}`}
                      table={optionTableExtracted.table}
                      value={currentSelection}
                      onChange={selectOption}
                      locked={locked}
                      rowState={(letter) => {
                        const isCorrectOption =
                          letter === question.correct_option;
                        const wasWrong =
                          !hideLiveFeedback && incorrectAnswers.has(letter);
                        const showCorrect =
                          !hideLiveFeedback &&
                          ((locked &&
                            isCorrectOption &&
                            isCorrect === true) ||
                            (answerRevealed && isCorrectOption));
                        const isFlashing =
                          !hideLiveFeedback &&
                          resultFlash?.letter === letter;
                        return {
                          wrong: wasWrong,
                          showCorrect,
                          flashCorrect:
                            isFlashing && resultFlash?.kind === "correct",
                          flashWrong:
                            isFlashing && resultFlash?.kind === "wrong",
                        };
                      }}
                    />
                  ) : null}
                  {optionTableExtracted.after.trim() ? (
                    <StemContent
                      content={optionTableExtracted.after}
                      className="text-inherit"
                    />
                  ) : null}
                </>
              ) : (
                <StemContent
                  content={question.question_stem}
                  className="text-inherit"
                />
              )}
              {statementItems.length > 0 ? (
                <StatementItemsList
                  items={statementItems}
                  className="mt-4 text-inherit"
                />
              ) : null}
            </div>
          </div>

          {useInlineOptionTable ? null : (
          <ul
            className="eup-radio-list"
            role="radiogroup"
            aria-label="Answer options"
          >
            {optionLetters.map((letter) => {
              const text = question.options[letter];
              const isCorrectOption = letter === question.correct_option;
              const wasWrong =
                !hideLiveFeedback && incorrectAnswers.has(letter);
              const isSelected = currentSelection === letter;
              const showCorrect =
                !hideLiveFeedback &&
                ((locked && isCorrectOption && isCorrect === true) ||
                  (answerRevealed && isCorrectOption));
              const isFlashing =
                !hideLiveFeedback && resultFlash?.letter === letter;
              const flashCorrect =
                isFlashing && resultFlash?.kind === "correct";
              const flashWrong = isFlashing && resultFlash?.kind === "wrong";

              return (
                <li key={letter}>
                  <label
                    className={cn(
                      "eup-radio-row",
                      isSelected && "eup-radio-row--selected",
                      showCorrect && "eup-radio-row--correct",
                      wasWrong && "eup-radio-row--wrong",
                      locked && "eup-radio-row--locked",
                      locked &&
                        !showCorrect &&
                        !wasWrong &&
                        "eup-radio-row--dim",
                      flashCorrect && "eup-radio-row--flash-correct",
                      flashWrong && "eup-radio-row--flash-wrong",
                    )}
                  >
                    <span className="eup-radio-control">
                      <input
                        type="radio"
                        name={`qb-esat-${question.id}`}
                        value={letter}
                        checked={isSelected || showCorrect}
                        disabled={locked || wasWrong}
                        onChange={() => selectOption(letter)}
                        aria-label={`Option ${letter}`}
                      />
                    </span>
                    <span className="eup-radio-body">
                      <StemContent
                        content={text}
                        className="text-inherit inline"
                      />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          )}

          {belowQuestion ? (
            <div className="mt-6 w-full max-w-4xl">{belowQuestion}</div>
          ) : null}
        </div>

        {navigatorOpen ? (
          <div
            className="eup-nav-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setNavigatorOpen(false);
            }}
          >
            <div
              className="eup-nav-window"
              role="dialog"
              aria-modal="true"
              aria-label="Navigator"
            >
              <div className="eup-nav-window-header">
                <Grid3X3 size={16} strokeWidth={2} aria-hidden />
                <span>Navigator - select a question to go to it</span>
              </div>
              <div className="eup-nav-window-body">
                <table className="eup-nav-table">
                  <thead>
                    <tr>
                      <th>
                        Question # <span aria-hidden="true">▲</span>
                      </th>
                      <th>Status</th>
                      <th>Flagged for Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => {
                      const attempt = attemptsById.get(q.id);
                      const examAnswered =
                        hideLiveFeedback &&
                        (i === currentIndex
                          ? !!currentSelection
                          : Boolean(attempt?.userAnswer));
                      const status = hideLiveFeedback
                        ? examAnswered
                          ? ("incomplete" as NavStatus)
                          : ("unseen" as NavStatus)
                        : resolveNavStatus(
                            q.id,
                            i,
                            currentIndex,
                            attempt,
                            locked,
                            isCorrect,
                            answerRevealed,
                          );
                      const canJump =
                        hideLiveFeedback ||
                        reviewMode ||
                        i === currentIndex ||
                        !!attempt ||
                        i < currentIndex;
                      return (
                        <tr
                          key={q.id}
                          className={cn(
                            i === currentIndex && "eup-nav-row--current",
                            !hideLiveFeedback &&
                              status === "correct" &&
                              "eup-nav-row--correct",
                            !hideLiveFeedback &&
                              status === "incorrect" &&
                              "eup-nav-row--incorrect",
                          )}
                        >
                          <td>
                            <button
                              type="button"
                              className="eup-nav-link"
                              disabled={!canJump}
                              onClick={() => canJump && jump(i)}
                            >
                              Question {i + 1}
                            </button>
                          </td>
                          <td
                            className={cn(
                              "eup-nav-status",
                              `eup-nav-status--${status}`,
                            )}
                          >
                            {hideLiveFeedback
                              ? examAnswered
                                ? "Answered"
                                : "Unseen"
                              : navStatusLabel(status)}
                          </td>
                          <td className="eup-nav-flag-cell">
                            {flaggedIds.has(q.id) ? (
                              <span
                                className="eup-nav-flag"
                                aria-label="Flagged"
                              />
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="eup-nav-window-footer">
                <span>
            {hideLiveFeedback
              ? `${unfinishedCount} unanswered`
              : `${unfinishedCount} Unseen/Incomplete`}
          </span>
                <button
                  type="button"
                  className="eup-nav-close"
                  onClick={() => setNavigatorOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showHint && hintContent ? (
          <div
            className="eup-explain-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) onCloseHint();
            }}
          >
            <div
              className="eup-explain-window"
              role="dialog"
              aria-modal="true"
              aria-labelledby="qb-esat-hint-title"
              style={{ width: "min(520px, 100%)", maxHeight: "min(420px, 78vh)" }}
            >
              <div className="eup-explain-header">
                <h2 id="qb-esat-hint-title">Hint</h2>
                <button
                  type="button"
                  className="eup-explain-close"
                  onClick={onCloseHint}
                >
                  Close
                </button>
              </div>
              <div className="eup-explain-body">
                <StemContent
                  content={hintContent}
                  className="eup-explain-content"
                />
              </div>
            </div>
          </div>
        ) : null}

        {showExplanation && explanationContent ? (
          <div
            className="eup-explain-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) onCloseExplanation();
            }}
          >
            <div
              className="eup-explain-window"
              role="dialog"
              aria-modal="true"
              aria-labelledby="qb-esat-explain-title"
            >
              <div className="eup-explain-header">
                <h2 id="qb-esat-explain-title">Explanation</h2>
                <button
                  type="button"
                  className="eup-explain-close"
                  onClick={onCloseExplanation}
                >
                  Close
                </button>
              </div>
              <div className="eup-explain-body">
                {question.graph_specs ? (
                  <QuestionWithGraph
                    questionText={explanationContent}
                    graphSpecs={question.graph_specs}
                    className="eup-explain-content"
                  />
                ) : (
                  <StemContent
                    content={explanationContent}
                    className="eup-explain-content"
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}

        {showLeaveConfirm ? (
          <div className="eup-explain-backdrop" role="presentation">
            <div
              className="eup-explain-window"
              role="dialog"
              aria-modal="true"
              aria-label="Leave session"
              style={{ width: "min(420px, 100%)" }}
            >
              <div className="eup-explain-header">
                <h2>Leave session?</h2>
                <button
                  type="button"
                  className="eup-explain-close"
                  onClick={onCloseLeaveConfirm}
                >
                  Cancel
                </button>
              </div>
              <div className="eup-explain-body">
                <p style={{ marginTop: 0 }}>
                  You can stop now. You do not have to finish the rest of this
                  set. Questions you have not reached are not marked wrong.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  <button
                    type="button"
                    className="eup-done-btn eup-done-btn--primary"
                    onClick={onSaveAndLeave}
                  >
                    Stop here
                  </button>
                  <button
                    type="button"
                    className="eup-done-btn"
                    onClick={onDiscardSession}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative">
        {!hideSupportControl ? (
          <div className="pointer-events-none absolute bottom-full right-3 z-20 mb-2 flex justify-end">
            <div className="pointer-events-auto">
              <QuestionSupportControl
                questionId={question.id}
                sessionId={sessionId}
                tone="exam"
              />
            </div>
          </div>
        ) : null}
        <footer className="eup-footer">
        <button
          type="button"
          className="eup-footer-action"
          onClick={onOpenLeaveConfirm}
        >
          <LogOut size={19} strokeWidth={2} aria-hidden />
          <span>{reviewMode ? "Back to summary" : "Leave"}</span>
        </button>
        {footerExtra ? (
          <>
            <span className="eup-footer-rule" aria-hidden />
            <div className="eup-footer-group eup-footer-group--center min-w-0 flex-1 justify-center overflow-x-auto px-1">
              {footerExtra}
            </div>
          </>
        ) : null}
        <span className="eup-footer-rule" aria-hidden />
        <div className="eup-footer-group eup-footer-group--right">
          <button
            type="button"
            className="eup-footer-action"
            onClick={onPrevious}
            disabled={currentIndex <= 0}
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
            <span>Previous</span>
          </button>
          <span className="eup-footer-rule" aria-hidden />
          <button
            type="button"
            className="eup-footer-action"
            onClick={() => setNavigatorOpen(true)}
          >
            <Grid3X3 size={19} strokeWidth={2} aria-hidden />
            <span>Navigator</span>
          </button>
          <span className="eup-footer-rule" aria-hidden />
          {canSubmit ? (
            <button
              type="button"
              className="eup-footer-action eup-footer-action--primary"
              onClick={handleCheck}
            >
              <span>Check answer</span>
            </button>
          ) : (
            <button
              type="button"
              className="eup-footer-action eup-footer-action--primary"
              onClick={onNext}
              disabled={!canProceed && !reviewMode && !isLast}
              title={
                canProceed || reviewMode || hideLiveFeedback
                  ? undefined
                  : "Check or reveal the answer before continuing"
              }
            >
              <span>
                {reviewMode
                  ? isLast
                    ? "Summary"
                    : "Next"
                  : isLast
                    ? examMode
                      ? "Finish exam"
                      : "Finish"
                    : "Next"}
              </span>
              <ChevronRight size={22} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </footer>
      </div>
    </div>
  );
}
