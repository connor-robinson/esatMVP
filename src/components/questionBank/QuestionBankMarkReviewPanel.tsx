"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, Hash } from "lucide-react";
import { StemContent } from "@/components/shared/StemContent";
import { StatementItemsList } from "@/components/shared/StatementItemsList";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import { EupOptionTable } from "@/components/questionBank/esatUiPreview/EupOptionTable";
import { QuestionSupportControl } from "@/components/support/QuestionSupportControl";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { getQuestionStatementItems } from "@/lib/questionBank/statementItems";
import { extractLetterLabeledTable } from "@/lib/papers/tableBackedOptions";
import { cn } from "@/lib/utils";
import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
} from "@/types/questionBank";
import "@/components/questionBank/esatUiPreview/esatUiPreview.css";

export type QuestionBankMarkReviewPanelProps = {
  questions: QuestionBankQuestion[];
  attempts: QuestionBankSessionAttempt[];
  sessionId?: string | null;
  /** Optional controlled start index. */
  initialIndex?: number;
};

/**
 * In-block ESAT-styled review for finished / mark results.
 * Option rows show correct / wrong colors; chrome matches session shell.
 */
export function QuestionBankMarkReviewPanel({
  questions,
  attempts,
  sessionId,
  initialIndex = 0,
}: QuestionBankMarkReviewPanelProps) {
  const authSession = useSupabaseSession();
  const isLoggedIn = Boolean(authSession?.user);
  const safeQuestions = questions ?? [];
  const [index, setIndex] = useState(() =>
    Math.min(
      Math.max(0, initialIndex),
      Math.max(0, safeQuestions.length - 1),
    ),
  );
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [guestReportOpen, setGuestReportOpen] = useState(false);
  const [counterHidden, setCounterHidden] = useState(false);

  const question = safeQuestions[index] ?? null;
  const attempt = useMemo(() => {
    if (!question) return null;
    return (
      attempts.find((a) => a.questionId === question.id) ??
      attempts.find((a) => a.questionNumber === index + 1) ??
      null
    );
  }, [attempts, index, question]);

  useEffect(() => {
    setExplanationOpen(false);
    setGuestReportOpen(false);
  }, [question?.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (explanationOpen) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(safeQuestions.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [explanationOpen, safeQuestions.length]);

  const statementItems = useMemo(
    () => (question ? getQuestionStatementItems(question) ?? [] : []),
    [question],
  );

  const optionTableExtracted = useMemo(() => {
    if (!question) return null;
    return extractLetterLabeledTable(question.question_stem ?? "");
  }, [question]);

  const useInlineOptionTable = Boolean(
    optionTableExtracted?.table &&
      Object.keys(question?.options ?? {}).length > 0,
  );

  const optionLetters = useMemo(() => {
    if (!question) return [] as string[];
    return Object.keys(question.options ?? {}).sort();
  }, [question]);

  if (!question) return null;

  const selection = attempt?.userAnswer?.trim() || null;
  const incorrectAnswers = new Set(attempt?.wrongAnswersBefore ?? []);
  if (selection && attempt && !attempt.isCorrect) {
    incorrectAnswers.add(selection);
  }
  const explanation = question.solution_reasoning?.trim() || null;
  const isLast = index >= safeQuestions.length - 1;
  const subjectLabel = question.subjects || "Question bank";
  const total = safeQuestions.length;

  const rowState = (letter: string) => {
    const isCorrectOption = letter === question.correct_option;
    const wasWrong = incorrectAnswers.has(letter);
    return {
      wrong: wasWrong,
      showCorrect: isCorrectOption,
      flashCorrect: false,
      flashWrong: false,
    };
  };

  return (
    <div
      className="esat-ui-preview-root esat-ui-preview-root--embedded"
      data-theme="light"
      data-session-mode="instant"
      role="region"
      aria-label="Review questions"
    >
      <header className="eup-header">
        <div className="eup-header-left">
          <div className="eup-header-title">
            Review · {subjectLabel}
          </div>
        </div>
        <div className="eup-header-right">
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
                {index + 1} of {total}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div
        className="eup-progress"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Review progress"
      >
        <div
          className="eup-progress-fill"
          style={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <div className="eup-main">
        <div className="eup-viewport">
          <div className="eup-question-row">
            <span className="eup-qnum" aria-label={`Question ${index + 1}`}>
              {index + 1}.
            </span>
            <div className="eup-stem">
              {question.graph_specs ? (
                <QuestionWithGraph
                  questionText={
                    useInlineOptionTable
                      ? optionTableExtracted!.before
                      : question.question_stem
                  }
                  graphSpecs={question.graph_specs}
                  className="text-inherit"
                />
              ) : useInlineOptionTable ? (
                <>
                  {optionTableExtracted!.before.trim() ? (
                    <StemContent
                      content={optionTableExtracted!.before}
                      className="text-inherit"
                    />
                  ) : null}
                  {optionTableExtracted!.table ? (
                    <EupOptionTable
                      name={`qb-mark-review-${question.id}`}
                      table={optionTableExtracted!.table}
                      value={selection}
                      onChange={() => {}}
                      locked
                      rowState={rowState}
                    />
                  ) : null}
                  {optionTableExtracted!.after.trim() ? (
                    <StemContent
                      content={optionTableExtracted!.after}
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
                const wasWrong = incorrectAnswers.has(letter);
                const isSelected = selection === letter;

                return (
                  <li key={letter}>
                    <label
                      className={cn(
                        "eup-radio-row",
                        isSelected && "eup-radio-row--selected",
                        isCorrectOption && "eup-radio-row--correct",
                        wasWrong && "eup-radio-row--wrong",
                        "eup-radio-row--locked",
                        !isCorrectOption &&
                          !wasWrong &&
                          "eup-radio-row--dim",
                      )}
                    >
                      <span className="eup-radio-control">
                        <input
                          type="radio"
                          name={`qb-mark-review-${question.id}`}
                          value={letter}
                          checked={isSelected || isCorrectOption}
                          disabled
                          readOnly
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
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute bottom-full right-3 z-20 mb-2 flex justify-end">
          <div className="pointer-events-auto">
            {isLoggedIn ? (
              <QuestionSupportControl
                questionId={question.id}
                sessionId={sessionId}
                tone="exam"
              />
            ) : (
              <div className="relative">
                <button
                  type="button"
                  className="eup-footer-action"
                  onClick={() => setGuestReportOpen((open) => !open)}
                >
                  <Flag size={17} strokeWidth={2} aria-hidden />
                  <span>Report</span>
                </button>
                {guestReportOpen ? (
                  <div className="absolute bottom-full right-0 z-20 mb-2 w-56 rounded-organic-lg bg-surface-elevated p-3 text-sm text-text shadow-modal-card">
                    Sign in to report a problem with this question.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <footer className="eup-footer">
          <button
            type="button"
            className="eup-footer-action"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index <= 0}
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
            <span>Previous</span>
          </button>
          <span className="eup-footer-rule" aria-hidden />
          <button
            type="button"
            className="eup-footer-action"
            onClick={() => setExplanationOpen(true)}
            disabled={!explanation}
            title={explanation ? "View explanation" : "No explanation available"}
          >
            <span>Explanation</span>
          </button>
          <span className="eup-footer-rule" aria-hidden />
          <div className="eup-footer-group eup-footer-group--right">
            <button
              type="button"
              className="eup-footer-action eup-footer-action--primary"
              onClick={() =>
                setIndex((i) => Math.min(safeQuestions.length - 1, i + 1))
              }
              disabled={isLast}
            >
              <span>Next</span>
              <ChevronRight size={22} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </footer>
      </div>

      {explanationOpen && explanation ? (
        <div
          className="eup-explain-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExplanationOpen(false);
          }}
        >
          <div
            className="eup-explain-window"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-mark-explain-title"
          >
            <div className="eup-explain-header">
              <h2 id="qb-mark-explain-title">Explanation</h2>
              <button
                type="button"
                className="eup-explain-close"
                onClick={() => setExplanationOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="eup-explain-body">
              <StemContent
                content={explanation}
                className="eup-explain-content"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
