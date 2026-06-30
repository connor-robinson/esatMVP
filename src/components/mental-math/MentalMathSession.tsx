/**
 * Mental Math Session Component - Fast, minimalistic training UI
 */

"use client";

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Eye, ArrowRight, X } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Progress } from "@/components/ui/Progress";
import { MathContent } from "@/components/shared/MathContent";
import { DiagramRenderer } from "@/components/shared/DiagramRenderer";
import { BinaryChoiceInput } from "./BinaryChoiceInput";
import { PrimeFactorSlotsInput } from "./PrimeFactorSlotsInput";
import { AngleLocateInput } from "./unit-circle/AngleLocateInput";
import { FeedbackPopup } from "./FeedbackPopup";
import { KatexInput } from "./KatexInput";
import { CollapsibleMathSymbolBar } from "./CollapsibleMathSymbolBar";
import { insertAtCursor } from "./mathInputUtils";
import { GeneratedQuestion, QuestionAttempt } from "@/types/core";
import { getTopic } from "@/config/topics";
import { cn } from "@/lib/utils";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PROMINENT_DIAGRAM_TOPICS = new Set([
  "geometry_2d",
  "geometry_3d",
  "circle_theorems",
  "unit_circle_degrees",
  "unit_circle_radians",
]);

function parseMultiAnswerRevealPart(part: string): string {
  const trimmed = part.trim();
  const eqMatch = trimmed.match(/^[xyz]\s*=\s*(.+)$/i);
  return eqMatch ? eqMatch[1].trim() : trimmed;
}

function multiAnswerLabels(topicId: string | undefined, count: number): string[] {
  if (topicId === "quadraticEquations") {
    return Array.from({ length: count }, (_, i) => `solution ${i + 1}`);
  }
  if (count === 3) return ["x", "y", "z"];
  if (count === 2) return ["x", "y"];
  return Array.from({ length: count }, (_, i) => `Value ${i + 1}`);
}

function showMultiAnswerTopLabels(topicId: string | undefined): boolean {
  return topicId !== "quadraticEquations";
}

interface MentalMathSessionProps {
  currentQuestion: GeneratedQuestion;
  questionNumber: number;
  totalQuestions: number;
  progress: number;
  showFeedback: boolean;
  lastAttempt: QuestionAttempt | null;
  correctAttempts: number;
  totalAttempts: number;
  /** When set, show countdown instead of question cap. */
  remainingSeconds?: number | null;
  /** Open-ended questions or unlimited time — no fixed total. */
  isUnlimitedSession?: boolean;
  onSubmitAnswer: (answer: string) => void;
  onContinueAfterIncorrect: () => void;
  /** Save progress and open session summary. */
  onEndEarly: () => void;
  /** Leave without saving to leaderboard. */
  onDiscardSession: () => void;
}

export function MentalMathSession({
  currentQuestion,
  questionNumber,
  totalQuestions,
  progress,
  showFeedback,
  lastAttempt,
  correctAttempts,
  totalAttempts,
  remainingSeconds = null,
  isUnlimitedSession = false,
  onSubmitAnswer,
  onContinueAfterIncorrect,
  onEndEarly,
  onDiscardSession,
}: MentalMathSessionProps) {
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [answer, setAnswer] = useState("");
  const [multiAnswers, setMultiAnswers] = useState<string[]>([]);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [locateSelectedDegrees, setLocateSelectedDegrees] = useState<number | null>(null);
  const [useKatexInput, setUseKatexInput] = useState(true);
  const [activeMultiIndex, setActiveMultiIndex] = useState(0);
  const katexInputRef = useRef<HTMLInputElement | null>(null);
  const simpleInputRef = useRef<HTMLInputElement | null>(null);
  const multiInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const accuracy =
    totalAttempts > 0
      ? Math.round((correctAttempts / totalAttempts) * 100)
      : 0;

  const answerParts =
    typeof currentQuestion.answer === "string"
      ? currentQuestion.answer.split(",").filter((p) => p.trim().length > 0)
      : [];

  // Detect questions that have multiple parts (e.g. systems, quadratics)
  const isMultiAnswer = answerParts.length >= 2;
  const isBinaryChoice = currentQuestion.answerInput?.type === "binary-choice";
  const isPrimeFactorSlots = currentQuestion.answerInput?.type === "prime-factor-slots";
  const isAngleLocate = currentQuestion.answerInput?.type === "angle-locate";
  const hasDiagram = Boolean(currentQuestion.diagram && !isAngleLocate);
  const prominentDiagram =
    hasDiagram && PROMINENT_DIAGRAM_TOPICS.has(currentQuestion.topicId);
  const primeSlotCount =
    isPrimeFactorSlots && currentQuestion.answerInput?.type === "prime-factor-slots"
      ? currentQuestion.answerInput.slotCount
      : 0;

  // Auto-focus and clear input when question changes
  useEffect(() => {
    setAnswer("");
    setAnswerRevealed(false);
    setLocateSelectedDegrees(null);
    setShowSuccessFeedback(false);

    // Reset multi-answer inputs based on current question
    if (isPrimeFactorSlots) {
      setMultiAnswers(new Array(primeSlotCount).fill(""));
    } else if (isMultiAnswer) {
      const partCount = Math.max(2, answerParts.length);
      setMultiAnswers(new Array(partCount).fill(""));
      setActiveMultiIndex(0);
      multiInputRefs.current = [];
    } else {
      setMultiAnswers([]);
    }
    
    if (!showFeedback && !isBinaryChoice && !isPrimeFactorSlots && !isAngleLocate) {
      // Focus the active input based on mode
      if (!isMultiAnswer && useKatexInput && katexInputRef.current) {
        // Small delay to ensure the component is mounted
        setTimeout(() => {
          katexInputRef.current?.focus();
        }, 0);
      } else if (simpleInputRef.current) {
        setTimeout(() => {
          simpleInputRef.current?.focus();
        }, 0);
      }
    }
  }, [currentQuestion.id, currentQuestion.answer, showFeedback, useKatexInput, isMultiAnswer, isBinaryChoice, isPrimeFactorSlots, isAngleLocate, primeSlotCount]);

  const handleAngleLocate = useCallback(
    (degrees: number) => {
      if (showFeedback && lastAttempt?.isCorrect) return;
      if (answerRevealed) return;

      setLocateSelectedDegrees(degrees);

      if (!showFeedback) {
        onSubmitAnswer(String(degrees));
        return;
      }

      if (!lastAttempt?.isCorrect) {
        onSubmitAnswer(String(degrees));
      }
    },
    [showFeedback, lastAttempt, answerRevealed, onSubmitAnswer],
  );

  const handleBinaryChoice = useCallback(
    (choiceId: string) => {
      if (showFeedback && lastAttempt?.isCorrect) return;
      if (answerRevealed) return;

      if (!showFeedback) {
        onSubmitAnswer(choiceId);
        return;
      }

      if (!lastAttempt?.isCorrect) {
        onSubmitAnswer(choiceId);
      }
    },
    [showFeedback, lastAttempt, answerRevealed, onSubmitAnswer],
  );

  useEffect(() => {
    if (!isBinaryChoice || (showFeedback && lastAttempt?.isCorrect) || answerRevealed) return;

    const answerInput = currentQuestion.answerInput;
    if (answerInput?.type !== "binary-choice") return;

    const choices = answerInput.choices;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!choices) return;
      const key = e.key.toLowerCase();
      for (const choice of choices) {
        const id = choice.id.toLowerCase();
        const label = choice.label.toLowerCase();
        if (key === id || key === label.charAt(0)) {
          e.preventDefault();
          handleBinaryChoice(choice.id);
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isBinaryChoice, showFeedback, lastAttempt?.isCorrect, answerRevealed, handleBinaryChoice, currentQuestion.answerInput]);

  // Show success feedback when answer is correct
  useEffect(() => {
    if (showFeedback && lastAttempt?.isCorrect) {
      setShowSuccessFeedback(true);
      // Auto-hide after 2.5 seconds (longer duration)
      const timer = setTimeout(() => {
        setShowSuccessFeedback(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showFeedback, lastAttempt?.isCorrect]);

  const handleSubmit = () => {
    const hasAnyAnswer = isPrimeFactorSlots
      ? multiAnswers.some((part) => part.trim().length > 0)
      : isMultiAnswer
      ? multiAnswers.some((part) => part.trim().length > 0)
      : answer.trim().length > 0;

    const combinedAnswer = isPrimeFactorSlots || isMultiAnswer
      ? multiAnswers
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .join(", ")
      : answer.trim();

    if (!showFeedback && hasAnyAnswer) {
      // Submit answer if not showing feedback
      onSubmitAnswer(combinedAnswer);
    } else if (showFeedback && !lastAttempt?.isCorrect && answerRevealed) {
      // If showing incorrect feedback and answer is revealed, continue to next question
      onContinueAfterIncorrect();
    } else if (showFeedback && !lastAttempt?.isCorrect && !answerRevealed && hasAnyAnswer) {
      // Allow retry when incorrect (submit new answer)
      onSubmitAnswer(combinedAnswer);
    }
  };

  const handleRevealAnswer = () => {
    setAnswerRevealed(true);
    setAnswer(String(currentQuestion.answer));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSymbolInsert = useCallback(
    (insert: string, cursorOffset = 0) => {
      if (showFeedback && lastAttempt?.isCorrect) return;

      if (isMultiAnswer) {
        const index = activeMultiIndex;
        const value = multiAnswers[index] ?? "";
        const el = multiInputRefs.current[index];
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? value.length;
        const { next, cursor } = insertAtCursor(value, insert, start, end, cursorOffset);
        const updated = [...multiAnswers];
        updated[index] = next;
        setMultiAnswers(updated);
        requestAnimationFrame(() => {
          el?.focus();
          el?.setSelectionRange(cursor, cursor);
        });
        return;
      }

      const el = simpleInputRef.current;
      const start = el?.selectionStart ?? answer.length;
      const end = el?.selectionEnd ?? answer.length;
      const { next, cursor } = insertAtCursor(answer, insert, start, end, cursorOffset);
      setAnswer(next);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(cursor, cursor);
      });
    },
    [
      activeMultiIndex,
      answer,
      isMultiAnswer,
      lastAttempt?.isCorrect,
      multiAnswers,
      showFeedback,
    ],
  );

  const topic = currentQuestion.topicId ? getTopic(currentQuestion.topicId) : null;
  const topicName = topic?.name || "Unknown";
  
  const variantName = currentQuestion.variantId
    ? topic?.variants?.find((v) => v.id === currentQuestion.variantId)?.name
    : topic?.variants?.find((v) => v.difficulty === currentQuestion.difficulty)?.name;

  const displayTopicName = variantName ? `${topicName}: ${variantName}` : topicName;
  const answerFieldLabels = multiAnswerLabels(currentQuestion.topicId, answerParts.length);
  const showTopAnswerLabels = showMultiAnswerTopLabels(currentQuestion.topicId);

  const unitCircleFeedback =
    currentQuestion.diagram?.type === "unit-circle" &&
    !isAngleLocate &&
    currentQuestion.metadata?.angleDegrees != null &&
    ((showFeedback && lastAttempt?.isCorrect === false) || answerRevealed)
      ? {
          showCorrect: true,
          correctDegrees: currentQuestion.metadata.angleDegrees,
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background">
      {/* Header with progress bar and end session — keep above question layer */}
      <div className="relative z-30 flex-shrink-0 px-1 pb-3 pt-6 sm:pt-8">
        <Container size="xl">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              {!isUnlimitedSession ? (
                <div className="min-w-0 flex-1">
                  <Progress
                    trackTone="session"
                    value={questionNumber}
                    max={
                      remainingSeconds != null
                        ? Math.max(totalQuestions, questionNumber, 1)
                        : Math.max(totalQuestions, 1)
                    }
                  />
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEndConfirm(true);
                }}
                className="relative z-30 flex shrink-0 items-center gap-2 rounded-organic-lg bg-surface-mid px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral active:scale-[0.98] dark:bg-surface-neutral dark:hover:bg-surface-mid"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
                End session
              </button>
            </div>
            <div className="flex items-center justify-between text-sm px-4">
              <span className="font-semibold text-primary text-base tabular-nums">
                {remainingSeconds != null ? (
                  <>Time {formatCountdown(remainingSeconds)}</>
                ) : isUnlimitedSession ? (
                  <>Question {questionNumber}</>
                ) : (
                  <>
                    {questionNumber} / {totalQuestions}
                  </>
                )}
              </span>
              {totalAttempts > 0 && (
                <span className="text-text-subtle text-sm">
                  {accuracy}% accurate
                </span>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Question area — no negative margin (was blocking header clicks) */}
      <div
        className={cn(
          "relative z-0 flex min-h-0 flex-1 overflow-hidden",
          prominentDiagram ? "items-start justify-center pt-2" : "items-center justify-center",
        )}
      >
        <Container size="md" className="w-full flex h-full items-center justify-center">
          <div
            className={cn(
              "w-full max-w-2xl flex flex-col items-center",
              prominentDiagram ? "gap-2" : "gap-12",
            )}
          >
            {/* Topic badge */}
            <div className={cn("flex justify-center", prominentDiagram && "shrink-0")}>
              <span className="text-text-subtle text-xs font-sans uppercase tracking-wider">
                {displayTopicName}
              </span>
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, ease: "easeInOut" }}
                className={cn("text-center", prominentDiagram && "shrink-0")}
              >
                <div className="text-lg font-semibold tracking-tight leading-relaxed text-text-muted md:text-xl [&_.math-content]:space-y-4">
                  <MathContent content={currentQuestion.question} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Diagram (if present; locate mode renders circle in input area) */}
            {hasDiagram && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`diagram-${currentQuestion.id}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className={cn(
                    "w-full flex justify-center",
                    prominentDiagram ? "shrink-0" : currentQuestion.topicId === "circle_theorems" ? "my-2" : "mt-[-32px]",
                  )}
                >
                  <DiagramRenderer
                    data={currentQuestion.diagram!}
                    feedback={unitCircleFeedback}
                    className={prominentDiagram ? "w-full max-w-3xl" : undefined}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {showFeedback &&
              !lastAttempt?.isCorrect &&
              currentQuestion.explanation &&
              !answerRevealed &&
              !isAngleLocate && (
                <div className="w-full max-w-md rounded-xl bg-surface-elevated px-4 py-3 text-center">
                  <MathContent
                    content={currentQuestion.explanation}
                    className="text-sm leading-relaxed text-text-muted"
                  />
                </div>
              )}

            {/* Input section */}
            <div
              className={cn(
                "flex w-full max-w-md flex-col items-center",
                prominentDiagram ? "shrink-0 gap-3" : "gap-6",
              )}
            >
              {isBinaryChoice && currentQuestion.answerInput?.type === "binary-choice" ? (
                <BinaryChoiceInput
                  config={currentQuestion.answerInput}
                  selectedId={
                    answerRevealed
                      ? String(currentQuestion.answer)
                      : lastAttempt
                        ? String(lastAttempt.answer)
                        : null
                  }
                  correctId={String(currentQuestion.answer)}
                  showFeedback={showFeedback}
                  isCorrect={lastAttempt?.isCorrect ?? null}
                  answerRevealed={answerRevealed}
                  disabled={false}
                  onSelect={handleBinaryChoice}
                  hint={
                    currentQuestion.answerInput.showHintOnIncorrect &&
                    showFeedback &&
                    lastAttempt?.isCorrect === false &&
                    !answerRevealed
                      ? currentQuestion.explanation
                      : undefined
                  }
                  onReveal={
                    !answerRevealed && showFeedback && !lastAttempt?.isCorrect
                      ? handleRevealAnswer
                      : undefined
                  }
                  onContinue={
                    answerRevealed && showFeedback && !lastAttempt?.isCorrect
                      ? onContinueAfterIncorrect
                      : undefined
                  }
                />
              ) : isAngleLocate &&
                currentQuestion.answerInput?.type === "angle-locate" &&
                currentQuestion.diagram?.type === "unit-circle" ? (
                <AngleLocateInput
                  config={currentQuestion.answerInput}
                  diagram={currentQuestion.diagram}
                  correctDegrees={currentQuestion.metadata?.angleDegrees ?? 0}
                  showFeedback={showFeedback}
                  isCorrect={lastAttempt?.isCorrect ?? null}
                  answerRevealed={answerRevealed}
                  selectedDegrees={locateSelectedDegrees}
                  explanation={currentQuestion.explanation}
                  onSelect={handleAngleLocate}
                  onReveal={
                    !answerRevealed && showFeedback && !lastAttempt?.isCorrect
                      ? handleRevealAnswer
                      : undefined
                  }
                  onContinue={
                    answerRevealed && showFeedback && !lastAttempt?.isCorrect
                      ? onContinueAfterIncorrect
                      : undefined
                  }
                />
              ) : isPrimeFactorSlots && currentQuestion.answerInput?.type === "prime-factor-slots" ? (
                <PrimeFactorSlotsInput
                  slotCount={currentQuestion.answerInput.slotCount}
                  values={multiAnswers}
                  onChange={setMultiAnswers}
                  onSubmit={handleSubmit}
                  showFeedback={showFeedback}
                  isCorrect={lastAttempt?.isCorrect ?? null}
                  answerRevealed={answerRevealed}
                  revealedValues={String(currentQuestion.answer)
                    .split(",")
                    .map((p) => p.trim())}
                  disabled={showFeedback && lastAttempt?.isCorrect === true}
                  onReveal={
                    !answerRevealed && showFeedback && !lastAttempt?.isCorrect
                      ? handleRevealAnswer
                      : undefined
                  }
                  onContinue={
                    answerRevealed && showFeedback && !lastAttempt?.isCorrect
                      ? onContinueAfterIncorrect
                      : undefined
                  }
                />
              ) : isMultiAnswer ? (
                <>
                  <div className="flex w-full justify-center gap-4">
                    {multiAnswers.map((value, index) => {
                      const label = answerFieldLabels[index] ?? `Value ${index + 1}`;
                      const revealedPart = answerRevealed
                        ? parseMultiAnswerRevealPart(
                            String(currentQuestion.answer)
                              .split(",")
                              .filter((p) => p.trim().length > 0)[index] ?? "",
                          )
                        : "";

                      return (
                        <div key={index} className="flex flex-col items-center gap-2">
                          {showTopAnswerLabels && (
                            <span className="text-sm font-bold uppercase tracking-wider text-text">
                              {label}
                            </span>
                          )}
                          <input
                            ref={(el) => {
                              multiInputRefs.current[index] = el;
                              if (index === 0) simpleInputRef.current = el;
                            }}
                            type="text"
                            value={answerRevealed ? revealedPart : value}
                            onFocus={() => setActiveMultiIndex(index)}
                            onChange={(e) => {
                              const next = [...multiAnswers];
                              next[index] = e.target.value;
                              setMultiAnswers(next);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={label}
                            aria-label={label}
                            className={cn(
                              showTopAnswerLabels ? "w-32" : "w-40",
                              "h-14 text-xl font-semibold rounded-2xl border-0 outline-none transition-all duration-75",
                              showFeedback && lastAttempt?.isCorrect
                                ? "bg-primary/20 text-primary focus:ring-0 focus:outline-none"
                                : showFeedback && !lastAttempt?.isCorrect
                                  ? "bg-error/20 text-error focus:ring-0 focus:outline-none"
                                  : "bg-surface-elevated text-text focus:ring-0 focus:outline-none",
                              "placeholder:text-text-disabled placeholder:text-base placeholder:font-semibold",
                              (showFeedback && lastAttempt?.isCorrect) || answerRevealed
                                ? "cursor-not-allowed"
                                : "",
                            )}
                            style={{
                              textAlign: "center",
                              lineHeight: "3.5rem",
                              height: "3.5rem",
                            }}
                            autoComplete="off"
                            disabled={showFeedback && lastAttempt?.isCorrect}
                            readOnly={answerRevealed}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / reveal buttons for multi-answer */}
                  <div className="flex items-center gap-2">
                    {!answerRevealed && showFeedback && !lastAttempt?.isCorrect && (
                      <button
                        onClick={handleRevealAnswer}
                        className="px-3 py-2 rounded-xl bg-surface-elevated text-text-muted hover:bg-surface hover:text-text transition-all text-xs"
                        title="Reveal answer"
                      >
                        <Eye className="h-4 w-4" strokeWidth={2} />
                      </button>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={
                        (!multiAnswers.some((p) => p.trim().length > 0) && !answerRevealed) ||
                        (showFeedback && lastAttempt?.isCorrect)
                      }
                      className={cn(
                        "px-4 py-2 rounded-xl transition-all text-sm font-medium flex items-center gap-1",
                        showFeedback && !lastAttempt?.isCorrect
                          ? "bg-error/20 text-error hover:bg-error/30"
                          : multiAnswers.some((p) => p.trim().length > 0) && !showFeedback
                          ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                          : answerRevealed
                          ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                          : "bg-surface-elevated text-text-disabled cursor-not-allowed"
                      )}
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                      <span>Submit</span>
                    </button>
                  </div>
                  <CollapsibleMathSymbolBar
                    onInsert={handleSymbolInsert}
                    disabled={(showFeedback && lastAttempt?.isCorrect) || answerRevealed}
                    className="w-full max-w-md"
                  />
                </>
              ) : useKatexInput ? (
                <>
                  <KatexInput
                    ref={katexInputRef}
                    value={answer}
                    onChange={setAnswer}
                    onSubmit={handleSubmit}
                    onReveal={
                      !answerRevealed && showFeedback && !lastAttempt?.isCorrect
                        ? handleRevealAnswer
                        : undefined
                    }
                    placeholder="Type your answer"
                    disabled={showFeedback && lastAttempt?.isCorrect}
                    showReveal={!answerRevealed && showFeedback && !lastAttempt?.isCorrect}
                    hasError={showFeedback && !lastAttempt?.isCorrect}
                    autoFocus={!showFeedback}
                  />
                  {/* Input mode toggle */}
                  <button
                    onClick={() => setUseKatexInput(!useKatexInput)}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    {useKatexInput ? "Switch to simple input" : "Switch to math input"}
                  </button>
                </>
              ) : (
                <>
                  <div className="relative w-full">
                    <input
                      ref={simpleInputRef}
                      type="text"
                      value={answerRevealed ? String(currentQuestion.answer) : answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your answer"
                      className={cn(
                        "w-full h-16 text-2xl font-semibold rounded-2xl border-0 outline-none transition-all duration-75",
                        showFeedback && lastAttempt?.isCorrect
                          ? "bg-primary/20 text-primary focus:ring-0 focus:outline-none"
                          : showFeedback && !lastAttempt?.isCorrect
                          ? "bg-error/20 text-error focus:ring-0 focus:outline-none"
                          : "bg-surface-elevated text-text focus:ring-0 focus:outline-none",
                        "placeholder:text-text-disabled placeholder:text-base placeholder:font-medium",
                        (showFeedback && lastAttempt?.isCorrect) || answerRevealed ? "cursor-not-allowed" : ""
                      )}
                      style={{ 
                        textAlign: "center",
                        paddingLeft: "4.5rem", // Equal padding to center text properly
                        paddingRight: "4.5rem", // Equal padding (button is absolutely positioned)
                        lineHeight: "4rem", // Match height for vertical centering (64px)
                        height: "4rem"
                      }}
                      autoComplete="off"
                      disabled={showFeedback && lastAttempt?.isCorrect}
                      readOnly={answerRevealed}
                    />
                    
                    {/* Action buttons */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {!answerRevealed && showFeedback && !lastAttempt?.isCorrect && (
                          <button
                            onClick={handleRevealAnswer}
                            className="p-2 rounded-xl bg-surface-elevated text-text-muted hover:bg-surface hover:text-text transition-all"
                            title="Reveal answer"
                          >
                            <Eye className="h-5 w-5" strokeWidth={2} />
                          </button>
                        )}
                        <button
                          onClick={handleSubmit}
                          disabled={
                            (!answer.trim() && !answerRevealed) ||
                            (showFeedback && lastAttempt?.isCorrect)
                          }
                          className={cn(
                            "p-3 rounded-xl transition-all",
                            showFeedback && !lastAttempt?.isCorrect
                              ? "bg-error/20 text-error hover:bg-error/30"
                              : answer.trim() && !showFeedback
                              ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                              : answerRevealed
                              ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                              : "bg-surface-elevated text-text-disabled cursor-not-allowed"
                          )}
                        >
                          <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                  <CollapsibleMathSymbolBar
                    onInsert={handleSymbolInsert}
                    disabled={(showFeedback && lastAttempt?.isCorrect) || answerRevealed}
                    className="w-full max-w-md"
                  />

                  {/* Input mode toggle */}
                  <button
                    onClick={() => setUseKatexInput(!useKatexInput)}
                    className="text-xs text-text-subtle hover:text-text-muted transition-colors"
                  >
                    {useKatexInput ? "Switch to simple input" : "Switch to math input"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Explanation display (shown when answer is revealed) */}
          {answerRevealed && currentQuestion.explanation && (
            <div className="mt-6 rounded-xl bg-surface-elevated px-4 py-3">
              <p className="text-sm font-medium text-text-muted mb-2">Explanation</p>
              <MathContent
                content={currentQuestion.explanation}
                className="text-sm leading-relaxed text-text-subtle"
              />
            </div>
          )}
        </Container>
      </div>


      {/* Success feedback popup */}
      <FeedbackPopup
        show={showSuccessFeedback}
        message={currentQuestion.metadata?.feedbackMessage ?? "Correct!"}
      />

      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-session-title"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md rounded-organic-xl border border-border bg-surface-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="absolute right-4 top-4 rounded-organic-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>

              <h2
                id="end-session-title"
                className="pr-8 font-heading text-xl font-bold text-text"
              >
                End session early?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Save your progress so far and view the summary, or discard this session and return
                to drills without adding it to your leaderboard.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEndConfirm(false);
                    onDiscardSession();
                  }}
                  className="rounded-organic-lg px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                >
                  Discard session
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEndConfirm(false);
                    onEndEarly();
                  }}
                  className="rounded-organic-lg bg-primary px-4 py-3 text-sm font-bold text-background shadow-md shadow-primary/20 transition-colors hover:bg-primary-hover active:scale-[0.98]"
                >
                  End early & view summary
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

