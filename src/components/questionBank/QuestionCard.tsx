"use client";

import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import { StemContent } from "@/components/shared/StemContent";
import { StatementItemsList } from "@/components/shared/StatementItemsList";
import { getQuestionStatementItems } from "@/lib/questionBank/statementItems";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BadgeCheck,
  HelpCircle,
  Star,
} from "lucide-react";
import { isQualityGateVerified } from "@/lib/questionBank/qualityGate";
import { coerceFieldText } from "@/lib/utils/coerceFieldText";
import { QuestionReportPopover } from "@/components/questionBank/QuestionReportPopover";
import type {
  QuestionRatingResponse,
  QuestionFeedbackResponse,
} from "@/types/questionBank";

interface QuestionCardProps {
  question: QuestionBankQuestion;
  onAnswerSubmit: (selectedAnswer: string, isCorrect: boolean) => void;
  isAnswered: boolean;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  onEditQuestionStem?: () => void;
  onEditOption?: (optionLetter: string) => void;
  answerRevealed?: boolean;
  onRevealAnswer?: () => void;
  allowRetry?: boolean;
  /** Pre-resolved human-readable topic labels for header pills */
  topicLabels?: string[];
  getTopicTitle?: (tag: string) => string;
  onSelectionChange?: (selectedAnswer: string | null) => void;
  onIncorrectAnswersChange?: (incorrectAnswers: Set<string>) => void;
  isAuthenticated?: boolean;
  /** Timer + rotate (e.g.) aligned top-right of question panel */
  headerTrailing?: ReactNode;
  /** Session index shown before the stem, e.g. 1 → "1." */
  questionNumber?: number;
  /** Centered pill under MCQ rows (e.g. Community stats) */
  belowOptionsSlot?: ReactNode;
  /** Seed wrong attempts (e.g. post-session review) */
  seedIncorrectAnswers?: string[];
}

const PANEL_SHELL = "rounded-organic-xl bg-surface-elevated";

/** One step from panel: darker in light mode, lighter in dark mode. */
const PILL_SURFACE = "bg-surface-mid dark:bg-surface-mid";

const PILL_BASE =
  "rounded-organic-md px-3.5 py-1.5 text-xs font-semibold tracking-wide sm:px-4 sm:py-2 sm:text-sm";

function difficultyBadgeClass(d: string): string {
  switch (d) {
    case "Easy":
      return cn(PILL_SURFACE, "text-difficulty-pill-easy");
    case "Medium":
      return cn(PILL_SURFACE, "text-difficulty-pill-medium");
    case "Hard":
      return cn(PILL_SURFACE, "text-difficulty-pill-hard");
    default:
      return cn(PILL_SURFACE, "text-text-muted");
  }
}

function subjectBadgeClass(subjects: string | null | undefined): string {
  if (!subjects) return cn(PILL_SURFACE, "text-text-muted");
  const s = subjects.toLowerCase().trim();
  if (s === "math 1" || s === "math1" || s === "paper 1" || s === "paper1") {
    return cn(PILL_SURFACE, "text-maths");
  }
  if (
    s === "math 2" ||
    s === "math2" ||
    s === "mathematics 2" ||
    s === "paper 2" ||
    s === "paper2"
  ) {
    return cn(PILL_SURFACE, "text-accent");
  }
  if (s === "physics") return cn(PILL_SURFACE, "text-physics");
  if (s === "chemistry") return cn(PILL_SURFACE, "text-chemistry");
  if (s === "biology") return cn(PILL_SURFACE, "text-primary");
  return cn(PILL_SURFACE, "text-text-muted");
}

function distractorTextFor(
  distractorMap: QuestionBankQuestion["distractor_map"],
  letter: string,
): string | null {
  if (!distractorMap) return null;
  const text = coerceFieldText(distractorMap[letter], "").trim();
  return text || null;
}

export function QuestionCard({
  question,
  onAnswerSubmit,
  isAnswered,
  selectedAnswer,
  correctAnswer,
  isCorrect,
  onEditQuestionStem,
  onEditOption,
  answerRevealed = false,
  allowRetry = false,
  topicLabels,
  getTopicTitle,
  onSelectionChange,
  onIncorrectAnswersChange,
  isAuthenticated = false,
  headerTrailing,
  questionNumber,
  belowOptionsSlot,
  seedIncorrectAnswers,
}: QuestionCardProps) {
  const verified = isQualityGateVerified(question);
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<string | null>(
    null,
  );
  const [revealedDistractors, setRevealedDistractors] = useState<Set<string>>(
    new Set(),
  );
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<string>>(
    () => new Set(seedIncorrectAnswers ?? []),
  );

  const [rating, setRating] = useState<QuestionRatingResponse | null>(null);
  const [ratingLoading, setRatingLoading] = useState(true);
  const [feedback, setFeedback] = useState<QuestionFeedbackResponse | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const [resultFlash, setResultFlash] = useState<{
    letter: string;
    kind: "correct" | "wrong";
  } | null>(null);
  const lastFlashKeyRef = useRef("");
  const seedIncorrectKey = (seedIncorrectAnswers ?? []).join(",");

  const optionLetters = Object.keys(question.options).sort();
  const statementItems = getQuestionStatementItems(question);
  const showSessionNotation = questionNumber != null;

  // Locked only when fully resolved (correct or revealed). Retry stays open.
  const optionsLocked = answerRevealed || (isAnswered && isCorrect === true);

  // Reset on question change only (do not depend on callback identity).
  useEffect(() => {
    setLocalSelectedAnswer(null);
    setRevealedDistractors(new Set());
    setIncorrectAnswers(new Set(seedIncorrectAnswers ?? []));
    setResultFlash(null);
    lastFlashKeyRef.current = "";
    onSelectionChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when the question or seed changes
  }, [question.id, seedIncorrectKey]);

  useEffect(() => {
    if (isAnswered && !isCorrect && selectedAnswer) {
      setIncorrectAnswers((prev) => {
        if (prev.has(selectedAnswer)) return prev;
        const next = new Set(prev).add(selectedAnswer);
        onIncorrectAnswersChange?.(next);
        return next;
      });
    }
  }, [isAnswered, isCorrect, selectedAnswer, onIncorrectAnswersChange]);

  const questionId = question.id;

  useEffect(() => {
    if (!questionId) {
      setRating(null);
      setFeedback(null);
      setRatingLoading(false);
      setFeedbackLoading(false);
      return;
    }
    setRatingLoading(true);
    setFeedbackLoading(true);
    const ratingAbort = new AbortController();
    const feedbackAbort = new AbortController();
    fetch(`/api/question-bank/questions/${questionId}/rating`, {
      signal: ratingAbort.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: QuestionRatingResponse) => setRating(data))
      .catch(
        (e) =>
          e.name !== "AbortError" && setRating({ average: 0, count: 0 }),
      )
      .finally(() => setRatingLoading(false));
    fetch(`/api/question-bank/questions/${questionId}/feedback`, {
      signal: feedbackAbort.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: QuestionFeedbackResponse) => setFeedback(data))
      .catch(
        (e) =>
          e.name !== "AbortError" && setFeedback({ dislikeCount: 0 }),
      )
      .finally(() => setFeedbackLoading(false));
    return () => {
      ratingAbort.abort();
      feedbackAbort.abort();
    };
  }, [questionId]);

  const handleRate = async (value: number) => {
    if (!isAuthenticated || ratingSubmitting) return;
    setRatingSubmitting(true);
    setHoverStar(null);
    const prev = rating;
    setRating((r) =>
      r
        ? { ...r, userRating: value }
        : { average: value, count: 1, userRating: value },
    );
    try {
      const res = await fetch(
        `/api/question-bank/questions/${questionId}/rating`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: value }),
        },
      );
      if (res.ok) {
        const data: QuestionRatingResponse = await res.json();
        setRating(data);
      } else {
        setRating(prev);
      }
    } catch {
      setRating(prev);
    } finally {
      setRatingSubmitting(false);
    }
  };

  useEffect(() => {
    onIncorrectAnswersChange?.(incorrectAnswers);
  }, [incorrectAnswers, onIncorrectAnswersChange]);

  // Trigger a short result flash when a submit is scored.
  useEffect(() => {
    if (!showSessionNotation || !selectedAnswer || !isAnswered) return;
    const key = `${question.id}:${selectedAnswer}:${isCorrect}`;
    if (lastFlashKeyRef.current === key) return;
    lastFlashKeyRef.current = key;
    setResultFlash({ letter: selectedAnswer, kind: isCorrect ? "correct" : "wrong" });
    const timer = window.setTimeout(() => setResultFlash(null), 500);
    return () => window.clearTimeout(timer);
  }, [showSessionNotation, question.id, selectedAnswer, isAnswered, isCorrect]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        localSelectedAnswer &&
        !optionsLocked &&
        !incorrectAnswers.has(localSelectedAnswer)
      ) {
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
    // handleSubmit closes over latest localSelectedAnswer via this effect's deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSelectedAnswer, optionsLocked, incorrectAnswers]);

  const handleOptionSelect = (optionLetter: string) => {
    if (optionsLocked) return;
    if (incorrectAnswers.has(optionLetter)) return;
    setLocalSelectedAnswer(optionLetter);
    // Sync immediately so the session bar never lags behind the UI.
    onSelectionChange?.(optionLetter);
  };

  const handleSubmit = () => {
    if (!localSelectedAnswer || optionsLocked) return;
    if (incorrectAnswers.has(localSelectedAnswer)) return;
    const answer = localSelectedAnswer;
    const correct = answer === question.correct_option;
    setLocalSelectedAnswer(null);
    onSelectionChange?.(null);
    onAnswerSubmit(answer, correct);
  };

  const OPTION_ROW_BASE = "bg-surface-subtle dark:bg-surface-mid";
  const OPTION_ROW_SELECTED = "bg-surface-mid dark:bg-folder-card-selected";
  const OPTION_ROW_CORRECT = "bg-success/25 dark:bg-success/20";
  const OPTION_ROW_HOVER = "hover:bg-surface-mid/70 dark:hover:bg-surface-neutral";

  const getOptionStyle = (letter: string) => {
    const isCorrectAnswer = letter === correctAnswer;
    const wasWrong = incorrectAnswers.has(letter) && !isCorrectAnswer;

    // Correct answer - resolved.
    if ((isAnswered && isCorrect && isCorrectAnswer) || (answerRevealed && isCorrectAnswer)) {
      return cn("cursor-default", OPTION_ROW_CORRECT);
    }
    // Previously wrong - greyed out, not a dark error color.
    if (wasWrong) {
      return cn("cursor-default opacity-50", OPTION_ROW_BASE);
    }
    // Locked (correct or revealed) - non-selected options dim slightly.
    if (optionsLocked) {
      return cn("cursor-default opacity-70", OPTION_ROW_BASE);
    }
    // Active selection.
    if (localSelectedAnswer === letter) {
      return cn("cursor-pointer", OPTION_ROW_SELECTED);
    }
    // Default clickable.
    return cn("cursor-pointer", OPTION_ROW_BASE, OPTION_ROW_HOVER);
  };

  const letterLabelClass = (letter: string) => {
    const isCorrectAnswer = letter === correctAnswer;
    if ((isAnswered && isCorrect && isCorrectAnswer) || (answerRevealed && isCorrectAnswer)) {
      return "text-success";
    }
    if (incorrectAnswers.has(letter) && !isCorrectAnswer) {
      return "text-error/60";
    }
    if (localSelectedAnswer === letter && !optionsLocked) {
      return "text-text";
    }
    return "text-text-muted";
  };

  const stemTypography = cn(
    "text-text text-[1.05rem] sm:text-[1.125rem] leading-relaxed tracking-tight",
    "font-sans",
  );

  return (
    <div className="space-y-5">
      <div className={cn(PANEL_SHELL, "px-5 pb-8 pt-5 sm:px-8 sm:pt-6 sm:pb-10")}>
        <div
          className={cn(
            "mb-5 flex flex-row flex-wrap gap-3 sm:gap-4",
            showSessionNotation ? "items-center" : "items-start",
            headerTrailing && "sm:justify-between",
          )}
        >
          {showSessionNotation && (
            <div
              className="flex shrink-0 items-center"
              aria-label={`Question ${questionNumber}`}
            >
              <span className="text-xl font-semibold leading-none tabular-nums tracking-tight text-text sm:text-2xl">
                {questionNumber}
              </span>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 gap-y-2.5 sm:gap-3">
            {verified && !showSessionNotation && (
              <span
                className="inline-flex items-center gap-1.5 pr-1 text-sm font-medium"
                title="Verified by ESAT quality gate"
              >
                <BadgeCheck
                  className="h-5 w-5 shrink-0 text-secondary sm:h-[1.35rem] sm:w-[1.35rem]"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="text-secondary">Verified</span>
              </span>
            )}
            <span
              className={cn(
                PILL_BASE,
                "uppercase tracking-wide",
                difficultyBadgeClass(question.difficulty),
              )}
            >
              {question.difficulty}
            </span>
            {question.subjects?.trim() && (
              <span className={cn(PILL_BASE, subjectBadgeClass(question.subjects))}>
                {question.subjects}
              </span>
            )}
            {question.subjects &&
              (question.subjects === "Paper 1" ||
                question.subjects === "Paper 2") &&
              question.idea_plan?.variation_mode && (
                <span
                  className={cn(
                    PILL_BASE,
                    "uppercase tracking-wide",
                    PILL_SURFACE,
                    question.idea_plan.variation_mode === "FAR"
                      ? "text-accent"
                      : question.idea_plan.variation_mode === "SIBLINGS"
                        ? "text-secondary"
                        : "text-text-muted",
                  )}
                >
                  {question.idea_plan.variation_mode}
                </span>
              )}
            {(topicLabels?.length ||
              question.primary_tag ||
              (question.secondary_tags &&
                question.secondary_tags.length > 0)) &&
              (topicLabels?.length || getTopicTitle) && (
                <div className="flex max-w-full flex-wrap items-center gap-2">
                  {topicLabels?.length
                    ? topicLabels.map((label) => (
                        <span
                          key={label}
                          className={cn(PILL_BASE, PILL_SURFACE, "text-secondary")}
                        >
                          {label}
                        </span>
                      ))
                    : (
                      <>
                        {question.primary_tag && (
                          <span className={cn(PILL_BASE, PILL_SURFACE, "text-secondary")}>
                            {getTopicTitle!(question.primary_tag)}
                          </span>
                        )}
                        {question.secondary_tags?.map((tag) => (
                          <span
                            key={tag}
                            className={cn(PILL_BASE, PILL_SURFACE, "text-text-muted")}
                          >
                            {getTopicTitle!(tag)}
                          </span>
                        ))}
                      </>
                    )}
                </div>
              )}
          </div>
          {headerTrailing ? (
            <div className="flex shrink-0 items-center gap-3 sm:justify-end">
              {headerTrailing}
            </div>
          ) : null}
        </div>

        <div className={cn(stemTypography, "inline-block w-full")}>
          {question.graph_spec || question.graph_specs ? (
            <QuestionWithGraph
              questionText={question.question_stem}
              graphSpec={question.graph_spec}
              graphSpecs={question.graph_specs}
              className="text-text inline"
            />
          ) : (
            <>
              <StemContent content={question.question_stem} className="text-inherit inline" />
              {statementItems ? (
                <StatementItemsList items={statementItems} className="mt-4 block" />
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className={cn(PANEL_SHELL, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-2.5">
          {optionLetters.map((letter) => {
            const distractor = distractorTextFor(question.distractor_map, letter);
            const isCorrectAnswer = letter === correctAnswer;
            const isWrongAttempt =
              incorrectAnswers.has(letter) && !isCorrectAnswer;
            const showDistractorControl = isWrongAttempt && Boolean(distractor);
            const distractorRevealed = revealedDistractors.has(letter);
            const canSelect = !optionsLocked && !isWrongAttempt;
            const showSubmit = canSelect && localSelectedAnswer === letter;
            const showCorrectMark =
              (isAnswered && isCorrect && isCorrectAnswer) ||
              (answerRevealed && isCorrectAnswer);
            const showWrongMark = isWrongAttempt;

            const isFlashing = resultFlash?.letter === letter;
            const flashCorrect = isFlashing && resultFlash.kind === "correct";
            const flashWrong = isFlashing && resultFlash.kind === "wrong";

            return (
            <div
              key={letter}
              role={canSelect ? "button" : undefined}
              tabIndex={canSelect ? 0 : undefined}
              aria-pressed={canSelect ? localSelectedAnswer === letter : undefined}
              aria-disabled={!canSelect || undefined}
              aria-label={`Option ${letter}`}
              onPointerDown={(e) => {
                // Prefer pointerdown so selection updates even if click is lost
                // on complex KaTeX/HTML inside the option.
                if (e.button !== 0) return;
                if (!canSelect) return;
                // Don't steal clicks from the submit / distractor controls.
                const target = e.target as HTMLElement;
                if (target.closest("[data-option-control]")) return;
                handleOptionSelect(letter);
              }}
              onKeyDown={(e) => {
                if (!canSelect) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOptionSelect(letter);
                }
              }}
              className={cn(
                "relative flex w-full flex-col overflow-hidden rounded-organic-md transition-[background-color,opacity] duration-200 ease-out",
                "border-0 outline-none ring-0 shadow-none",
                "focus:border-0 focus:outline-none focus:ring-0",
                "focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0",
                "active:outline-none active:ring-0",
                "select-none [-webkit-tap-highlight-color:transparent]",
                getOptionStyle(letter),
                flashCorrect && "!bg-success/30",
                flashWrong && "!bg-error/15",
              )}
            >
              <div className="relative flex w-full items-center gap-2 px-3.5 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className={cn(
                      "flex w-6 shrink-0 items-center text-sm font-semibold tabular-nums leading-none",
                      letterLabelClass(letter),
                    )}
                  >
                    {letter}
                  </span>

                  <div
                    className={cn(
                      "flex min-w-0 flex-1 items-center text-[0.98rem] leading-relaxed tracking-tight sm:text-[1.02rem]",
                      "font-sans text-text",
                      // KaTeX/HTML inside options must not capture the row click target.
                      "pointer-events-none select-none",
                      showDistractorControl &&
                        (distractorRevealed
                          ? "line-clamp-1 pr-[36%] sm:pr-[32%]"
                          : "pr-28 sm:pr-36"),
                    )}
                  >
                    <StemContent
                      content={question.options[letter]}
                      className="text-inherit inline"
                    />
                  </div>
                </div>

                {showDistractorControl && !distractorRevealed ? (
                  <button
                    type="button"
                    data-option-control
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRevealedDistractors((prev) => new Set(prev).add(letter));
                    }}
                    title="Reveal why it may be wrong"
                    className={cn(
                      "absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2",
                      "inline-flex items-center gap-1.5 rounded-full",
                      "bg-surface-elevated/95 px-3 py-1.5",
                      "text-[11px] font-medium tracking-wide text-text-muted",
                      "hover:bg-surface-mid/80 hover:text-text",
                    )}
                  >
                    <HelpCircle
                      className="h-3.5 w-3.5 shrink-0 opacity-80"
                      strokeWidth={2}
                      aria-hidden
                    />
                    Why it may be wrong
                  </button>
                ) : null}

                {showDistractorControl && distractorRevealed ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute left-1/2 top-1/2 z-10",
                      "w-[min(54%,22rem)] -translate-x-1/2 -translate-y-1/2 px-2 text-center",
                    )}
                  >
                    <StemContent
                      content={distractor!}
                      className="text-xs leading-snug text-text-muted sm:text-sm"
                    />
                  </div>
                ) : null}

                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10">
                  {showSubmit ? (
                    <button
                      type="button"
                      data-option-control
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmit();
                      }}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-organic-md sm:h-10 sm:w-10",
                        "border-0 outline-none ring-0",
                        "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                        "bg-secondary text-background",
                        "shadow-[0_4px_0_0_#623e56] dark:shadow-[0_4px_0_0_#8a5a7a]",
                        "hover:brightness-110",
                        "active:translate-y-0.5 active:shadow-[0_2px_0_0_#623e56] dark:active:shadow-[0_2px_0_0_#8a5a7a]",
                      )}
                      title="Submit answer"
                      aria-label="Submit answer"
                    >
                      <ArrowRight className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" strokeWidth={2.5} />
                    </button>
                  ) : null}
                  {showCorrectMark ? (
                    <svg
                      className="text-success"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                  {showWrongMark ? (
                    <svg
                      className="text-error"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1 py-1 sm:px-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Rate this question
            </span>
            {ratingLoading ? (
              <span className="text-xs text-text-muted"> - </span>
            ) : (
              <>
                <div
                  className="flex items-center gap-0.5"
                  role="group"
                  aria-label="Question rating"
                  onMouseLeave={() => setHoverStar(null)}
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active =
                      hoverStar !== null
                        ? value <= hoverStar
                        : (rating?.userRating ?? rating?.average ?? 0) >=
                          value;
                    const canRate = isAuthenticated && !ratingSubmitting;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={!canRate}
                        onMouseEnter={() => setHoverStar(value)}
                        onClick={() => canRate && handleRate(value)}
                        className={cn(
                          "rounded-md p-0.5 outline-none transition-transform duration-200 ease-out will-change-transform",
                          canRate &&
                            "cursor-pointer hover:scale-[1.08] active:scale-95 focus-visible:ring-2 focus-visible:ring-secondary/35",
                          !canRate && "cursor-default",
                        )}
                        title={
                          isAuthenticated
                            ? `Rate ${value} star${value === 1 ? "" : "s"}`
                            : "Sign in to rate"
                        }
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 transition-colors duration-150",
                            active
                              ? "fill-secondary text-secondary"
                              : "text-text-disabled",
                          )}
                          strokeWidth={1.5}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-text-muted">
                  {rating?.count
                    ? `${rating.average.toFixed(1)} (${rating.count})`
                    : "No ratings yet"}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isAuthenticated && (
              <button
                type="button"
                disabled
                className="rounded-full border border-border-subtle bg-surface-mid px-3 py-1.5 text-xs font-medium text-text-muted"
              >
                Sign in to rate
              </button>
            )}
            <QuestionReportPopover
              questionId={questionId}
              isAuthenticated={isAuthenticated}
              feedback={feedback}
              feedbackLoading={feedbackLoading}
              onFeedbackChange={setFeedback}
            />
          </div>
        </div>

        {belowOptionsSlot ? (
          <div className="mt-5">{belowOptionsSlot}</div>
        ) : null}
      </div>
    </div>
  );
}
