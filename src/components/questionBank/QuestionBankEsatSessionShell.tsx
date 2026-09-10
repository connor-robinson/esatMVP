"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getQuestionStatementItems } from "@/lib/questionBank/statementItems";
import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
} from "@/types/questionBank";
import { cn } from "@/lib/utils";
import { QuestionSupportControl } from "@/components/support/QuestionSupportControl";
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
  currentSelection: string | null;
  incorrectAnswers: Set<string>;
  isAnswered: boolean;
  isCorrect: boolean | null;
  answerRevealed: boolean;
  showLeaveConfirm: boolean;
  flaggedIds: Set<string>;
  onToggleFlag: (questionId: string) => void;
  onSelectionChange: (letter: string | null) => void;
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
}

export function QuestionBankEsatSessionShell({
  question,
  questions,
  currentIndex,
  attemptLog,
  remainingTimeMs,
  timerLabel,
  reviewMode = false,
  currentSelection,
  incorrectAnswers,
  isAnswered,
  isCorrect,
  answerRevealed,
  showLeaveConfirm,
  flaggedIds,
  onToggleFlag,
  onSelectionChange,
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
  const locked =
    reviewMode || answerRevealed || (isAnswered && isCorrect === true);
  const canProceed = locked;
  const canSubmit =
    !!currentSelection &&
    !incorrectAnswers.has(currentSelection) &&
    !canProceed;
  const isLast = currentIndex >= total - 1;
  const optionLetters = Object.keys(question.options).sort();
  const statementItems = getQuestionStatementItems(question) ?? [];
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
    if (locked || incorrectAnswers.has(letter)) return;
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
    if (locked) return;
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
      role="application"
      aria-label="Question bank session"
    >
      <header className="eup-header">
        <div className="eup-header-left">
          <div className="eup-header-title">
            {reviewMode ? "Review" : "Question bank"} · {subjectLabel}
          </div>
          <button
            type="button"
            className="eup-theme-toggle"
            onClick={onUseClassicUi}
            title="Switch back to the previous question bank layout"
          >
            Classic UI
          </button>
        </div>
        <div className="eup-header-right">
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
                  questionText={question.question_stem}
                  graphSpecs={question.graph_specs}
                  className="text-inherit"
                />
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

          <ul
            className="eup-radio-list"
            role="radiogroup"
            aria-label="Answer options"
          >
            {optionLetters.map((letter) => {
              const text = question.options[letter];
              const isCorrectOption = letter === question.correct_option;
              const wasWrong = incorrectAnswers.has(letter);
              const isSelected = currentSelection === letter;
              const showCorrect =
                (locked && isCorrectOption && isCorrect === true) ||
                (answerRevealed && isCorrectOption);
              const isFlashing = resultFlash?.letter === letter;
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
                      const status = resolveNavStatus(
                        q.id,
                        i,
                        currentIndex,
                        attempt,
                        locked,
                        isCorrect,
                        answerRevealed,
                      );
                      const canJump =
                        i === currentIndex ||
                        !!attempt ||
                        i < currentIndex ||
                        reviewMode;
                      return (
                        <tr
                          key={q.id}
                          className={cn(
                            i === currentIndex && "eup-nav-row--current",
                            status === "correct" && "eup-nav-row--correct",
                            status === "incorrect" && "eup-nav-row--incorrect",
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
                            {navStatusLabel(status)}
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
                <span>{unfinishedCount} Unseen/Incomplete</span>
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
                  Save your progress and leave, or discard this session.
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
                    Save and leave
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
        <div className="pointer-events-none absolute bottom-full right-3 z-20 mb-2 flex justify-end">
          <div className="pointer-events-auto">
            <QuestionSupportControl
              questionId={question.id}
              sessionId={sessionId}
              tone="exam"
            />
          </div>
        </div>
        <footer className="eup-footer">
        <button
          type="button"
          className="eup-footer-action"
          onClick={onOpenLeaveConfirm}
        >
          <LogOut size={19} strokeWidth={2} aria-hidden />
          <span>{reviewMode ? "Back to summary" : "End session"}</span>
        </button>
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
                canProceed || reviewMode
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
                    ? "Finish"
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
