"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  HelpCircle,
  Star,
  ThumbsDown,
} from "lucide-react";
import { isQualityGateVerified } from "@/lib/questionBank/qualityGate";
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
}

const PANEL_SHELL = "rounded-organic-xl bg-surface-elevated";

/** One step from panel: darker in light mode, lighter in dark mode. */
const PILL_SURFACE = "bg-surface-mid dark:bg-surface-mid";

const PILL_BASE =
  "rounded-organic-md px-2.5 py-1 text-[11px] font-semibold tracking-wide";

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
  getTopicTitle,
  onSelectionChange,
  onIncorrectAnswersChange,
  isAuthenticated = false,
  headerTrailing,
  questionNumber,
  belowOptionsSlot,
}: QuestionCardProps) {
  const verified = isQualityGateVerified(question);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<string | null>(
    null,
  );
  const [revealedDistractors, setRevealedDistractors] = useState<Set<string>>(
    new Set(),
  );
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<string>>(
    new Set(),
  );

  const [rating, setRating] = useState<QuestionRatingResponse | null>(null);
  const [ratingLoading, setRatingLoading] = useState(true);
  const [feedback, setFeedback] = useState<QuestionFeedbackResponse | null>(
    null,
  );
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [dislikeSubmitting, setDislikeSubmitting] = useState(false);
  const [hoverStar, setHoverStar] = useState<number | null>(null);

  const optionLetters = Object.keys(question.options).sort();

  useEffect(() => {
    if (!isAnswered || allowRetry) {
      setLocalSelectedAnswer(null);
      onSelectionChange?.(null);
    }
    setHoveredOption(null);
    setRevealedDistractors(new Set());
    setIncorrectAnswers(new Set());
  }, [question.id, isAnswered, allowRetry, onSelectionChange]);

  useEffect(() => {
    onSelectionChange?.(localSelectedAnswer);
  }, [localSelectedAnswer, onSelectionChange]);

  useEffect(() => {
    if (isAnswered && !isCorrect && selectedAnswer) {
      setIncorrectAnswers((prev) => {
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

  const handleDislikeToggle = async () => {
    if (!isAuthenticated || dislikeSubmitting) return;
    setDislikeSubmitting(true);
    try {
      const res = await fetch(
        `/api/question-bank/questions/${questionId}/dislike`,
        { method: "POST" },
      );
      if (res.ok) {
        const data: QuestionFeedbackResponse = await res.json();
        setFeedback(data);
      }
    } finally {
      setDislikeSubmitting(false);
    }
  };

  useEffect(() => {
    onIncorrectAnswersChange?.(incorrectAnswers);
  }, [incorrectAnswers, onIncorrectAnswersChange]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && localSelectedAnswer && !isAnswered) {
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [localSelectedAnswer, isAnswered]);

  const handleOptionClick = (optionLetter: string) => {
    if (isAnswered && !allowRetry && !answerRevealed) return;
    setLocalSelectedAnswer(optionLetter);
  };

  const handleSubmit = () => {
    if (!localSelectedAnswer || (isAnswered && !allowRetry && !answerRevealed))
      return;
    if (incorrectAnswers.has(localSelectedAnswer)) return;
    const correct = localSelectedAnswer === question.correct_option;
    onAnswerSubmit(localSelectedAnswer, correct);
  };

  const getOptionStyle = (letter: string) => {
    if (isAnswered && isCorrect && letter === correctAnswer) {
      return "cursor-default bg-primary/12";
    }
    if (answerRevealed && letter === correctAnswer) {
      return "cursor-default bg-primary/12";
    }
    if (incorrectAnswers.has(letter) && letter !== correctAnswer) {
      return "cursor-default bg-error/10";
    }
    if (isAnswered && !isCorrect && !answerRevealed) {
      if (allowRetry) {
        if (localSelectedAnswer === letter) {
          return "cursor-pointer bg-surface-neutral dark:bg-surface-mid";
        }
        return cn(
          "cursor-pointer bg-transparent hover:bg-surface-mid transition-colors duration-fast ease-signature",
          hoveredOption === letter && "bg-surface-mid",
        );
      }
      return "cursor-default opacity-70";
    }
    if (localSelectedAnswer === letter) {
      return "cursor-pointer bg-surface-neutral dark:bg-surface-mid";
    }
    return cn(
      "cursor-pointer bg-transparent hover:bg-surface-mid transition-colors duration-fast ease-signature",
      hoveredOption === letter && "bg-surface-mid",
    );
  };

  const letterBadgeClass = (letter: string) => {
    if (isAnswered && isCorrect && letter === correctAnswer) {
      return "bg-primary/20 text-primary";
    }
    if (answerRevealed && letter === correctAnswer) {
      return "bg-primary/20 text-primary";
    }
    if (incorrectAnswers.has(letter) && letter !== correctAnswer) {
      return "bg-error/15 text-error";
    }
    if (
      localSelectedAnswer === letter &&
      (!isAnswered || (isAnswered && allowRetry && !incorrectAnswers.has(letter)))
    ) {
      return "bg-surface-neutral text-text dark:bg-surface-neutral";
    }
    return "bg-surface-mid text-text-muted dark:bg-surface-neutral/80";
  };

  const stemTypography = cn(
    "text-text text-[1.05rem] sm:text-[1.125rem] leading-relaxed tracking-tight",
    "font-sans",
  );

  return (
    <div className="space-y-5">
      <div className={cn(PANEL_SHELL, "px-5 pb-8 pt-5 sm:px-8 sm:pt-6 sm:pb-10")}>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 gap-y-2">
            {verified && (
              <span
                className={cn(
                  PILL_BASE,
                  "inline-flex items-center gap-1",
                  PILL_SURFACE,
                  "text-primary",
                )}
              >
                <BadgeCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                Verified
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
            {(question.primary_tag ||
              (question.secondary_tags &&
                question.secondary_tags.length > 0)) &&
              getTopicTitle && (
                <div className="flex max-w-full flex-wrap items-center gap-1">
                  {question.primary_tag && (
                    <span className={cn(PILL_BASE, PILL_SURFACE, "text-xs text-secondary")}>
                      {getTopicTitle(question.primary_tag)}
                    </span>
                  )}
                  {question.secondary_tags?.map((tag) => (
                    <span
                      key={tag}
                      className={cn(PILL_BASE, PILL_SURFACE, "text-xs text-text-muted")}
                    >
                      {getTopicTitle(tag)}
                    </span>
                  ))}
                </div>
              )}
          </div>
          {headerTrailing ? (
            <div className="flex shrink-0 items-center gap-3 sm:justify-end">
              {headerTrailing}
            </div>
          ) : null}
        </div>

        <div className={stemTypography}>
          {questionNumber != null ? (
            <span className="mr-1 font-semibold tabular-nums text-text">
              {questionNumber}.
            </span>
          ) : null}
          {question.graph_spec || question.graph_specs ? (
            <QuestionWithGraph
              questionText={question.question_stem}
              graphSpec={question.graph_spec}
              graphSpecs={question.graph_specs}
              className="text-text inline"
            />
          ) : (
            <MathContent content={question.question_stem} className="text-inherit inline" />
          )}
        </div>
      </div>

      <div className={cn(PANEL_SHELL, "p-5 sm:p-6")}>
        <div className="space-y-2">
          {optionLetters.map((letter) => (
            <div key={letter} className="relative">
              <button
                type="button"
                onClick={() => handleOptionClick(letter)}
                onMouseEnter={() =>
                  (!isAnswered || allowRetry) && setHoveredOption(letter)
                }
                onMouseLeave={() => setHoveredOption(null)}
                disabled={isAnswered && !allowRetry && !answerRevealed}
                className={cn(
                  "relative w-full rounded-organic-lg py-3 pl-4 pr-3 text-left transition-all duration-fast ease-signature sm:py-3.5",
                  getOptionStyle(letter),
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-sm font-bold transition-colors duration-fast ease-signature",
                      letterBadgeClass(letter),
                    )}
                  >
                    {letter}
                  </div>

                  <div className={cn("flex flex-1 items-center gap-3", stemTypography)}>
                    <MathContent
                      content={question.options[letter]}
                      className="text-inherit"
                    />
                    {incorrectAnswers.has(letter) &&
                      letter !== correctAnswer &&
                      question.distractor_map?.[letter] && (
                        <>
                          {!revealedDistractors.has(letter) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevealedDistractors((prev) =>
                                  new Set(prev).add(letter),
                                );
                              }}
                              className="flex h-10 shrink-0 items-center gap-2 rounded-organic-md bg-surface-mid px-3 text-sm text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
                            >
                              <HelpCircle className="h-4 w-4" strokeWidth={2.5} />
                              <span className="hidden sm:inline">Reveal why wrong</span>
                            </button>
                          ) : (
                            <MathContent
                              content={question.distractor_map[letter]}
                              className="text-text-muted"
                            />
                          )}
                        </>
                      )}
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12">
                    {((!isAnswered || (isAnswered && allowRetry)) &&
                      localSelectedAnswer === letter &&
                      !incorrectAnswers.has(letter)) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubmit();
                        }}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-organic-lg sm:h-12 sm:w-12",
                          "bg-secondary text-background",
                          "shadow-[0_5px_0_0_#623e56] dark:shadow-[0_5px_0_0_#8a5a7a]",
                          "transition-all duration-150 ease-out",
                          "hover:brightness-110",
                          "active:translate-y-1 active:shadow-[0_2px_0_0_#623e56] dark:active:shadow-[0_2px_0_0_#8a5a7a]",
                        )}
                        title="Submit answer"
                        aria-label="Submit answer"
                      >
                        <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                      </button>
                    )}
                    {isAnswered && (
                      <>
                        {(isCorrect && letter === correctAnswer) ||
                        (answerRevealed && letter === correctAnswer) ? (
                          <svg
                            className="text-primary"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : incorrectAnswers.has(letter) &&
                          letter !== correctAnswer ? (
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
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-organic-lg border border-border-subtle bg-surface-elevated/80 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Rate the difficulty
            </span>
            {ratingLoading ? (
              <span className="text-xs text-text-muted">—</span>
            ) : (
              <>
                <div
                  className="flex items-center gap-0.5"
                  role="group"
                  aria-label="Difficulty rating"
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
            {feedbackLoading ? (
              <span className="text-xs text-text-muted">…</span>
            ) : (
              <>
                <span className="text-xs text-text-muted">
                  {feedback?.dislikeCount ?? 0} unhelpful
                </span>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleDislikeToggle}
                    disabled={dislikeSubmitting}
                    className={cn(
                      "flex items-center gap-1 rounded-organic-md px-2 py-1 text-xs transition-colors",
                      feedback?.userDisliked
                        ? "bg-error/15 text-error"
                        : "text-text-muted hover:bg-surface-elevated hover:text-text",
                    )}
                  >
                    <ThumbsDown
                      className={cn(
                        "h-3.5 w-3.5",
                        feedback?.userDisliked && "fill-current",
                      )}
                    />
                    <span>Unhelpful</span>
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">
                    Sign in to mark unhelpful
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {belowOptionsSlot ? (
          <div className="mt-5">{belowOptionsSlot}</div>
        ) : null}
      </div>
    </div>
  );
}
