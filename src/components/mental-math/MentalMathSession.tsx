/**
 * Mental Math Session Component - Fast, minimalistic training UI
 */

"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Eye, ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Progress } from "@/components/ui/Progress";
import { MathContent } from "@/components/shared/MathContent";
import { FeedbackPopup } from "./FeedbackPopup";
import { KatexInput } from "./KatexInput";
import { GeneratedQuestion, QuestionAttempt } from "@/types/core";
import { getTopic } from "@/config/topics";
import { cn } from "@/lib/utils";

interface MentalMathSessionProps {
  currentQuestion: GeneratedQuestion;
  questionNumber: number;
  totalQuestions: number;
  progress: number;
  showFeedback: boolean;
  lastAttempt: QuestionAttempt | null;
  correctCount: number;
  onSubmitAnswer: (answer: string) => void;
  onContinueAfterIncorrect: () => void;
  onExit: () => void;
}

export function MentalMathSession({
  currentQuestion,
  questionNumber,
  totalQuestions,
  progress,
  showFeedback,
  lastAttempt,
  correctCount,
  onSubmitAnswer,
  onContinueAfterIncorrect,
  onExit,
}: MentalMathSessionProps) {
  const [answer, setAnswer] = useState("");
  const [multiAnswers, setMultiAnswers] = useState<string[]>([]);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [useKatexInput, setUseKatexInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const simpleInputRef = useRef<HTMLInputElement>(null);

  // Calculate accuracy
  const accuracy = questionNumber > 0 ? Math.round((correctCount / questionNumber) * 100) : 0;

  // Detect questions that have two numeric solutions (e.g. quadratic equations)
  const isMultiAnswer =
    typeof currentQuestion.answer === "string" &&
    currentQuestion.answer.split(",").filter((p) => p.trim().length > 0).length === 2;

  // Auto-focus and clear input when question changes
  useEffect(() => {
    setAnswer("");
    setAnswerRevealed(false);
    setShowSuccessFeedback(false);

    // Reset multi-answer inputs based on current question
    if (isMultiAnswer) {
      const partCount =
        typeof currentQuestion.answer === "string"
          ? currentQuestion.answer.split(",").filter((p) => p.trim().length > 0).length
          : 2;
      setMultiAnswers(new Array(Math.max(2, partCount)).fill(""));
    } else {
      setMultiAnswers([]);
    }
    
    if (!showFeedback) {
      // Focus the active input based on mode
      if (!isMultiAnswer && useKatexInput && inputRef.current) {
        inputRef.current.focus();
      } else if (simpleInputRef.current) {
        simpleInputRef.current.focus();
      }
    }
  }, [currentQuestion.id, currentQuestion.answer, showFeedback, useKatexInput, isMultiAnswer]);

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
    const hasAnyAnswer = isMultiAnswer
      ? multiAnswers.some((part) => part.trim().length > 0)
      : answer.trim().length > 0;

    const combinedAnswer = isMultiAnswer
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

  const topic = currentQuestion.topicId ? getTopic(currentQuestion.topicId) : null;
  const topicName = topic?.name || "Unknown";
  
  // Get variant name if available
  const variantName = topic?.variants?.find(v => v.difficulty === currentQuestion.difficulty)?.name;

  const displayTopicName = variantName ? topicName + ": " + variantName : topicName;

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header with progress bar and exit button */}
      <div className="flex-shrink-0 pt-16 pb-3">
        <Container size="xl">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={questionNumber} max={totalQuestions} />
              </div>
              <button
                onClick={onExit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all text-sm font-medium flex-shrink-0 z-50"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                <span>Exit</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-sm px-4">
              <span className="font-semibold text-primary text-base">
                {questionNumber} / {totalQuestions}
              </span>
              {accuracy > 0 && (
                <span className="text-white/40 text-sm">
                  {accuracy}% accurate
                </span>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden -mt-32">
        <Container size="md" className="w-full flex items-center justify-center">
          <div className="w-full max-w-2xl flex flex-col items-center gap-12">
            {/* Topic badge */}
            <div className="flex justify-center">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-medium">
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
                className="text-center"
              >
                <div className="text-5xl md:text-6xl font-bold text-white/95 tracking-tight leading-tight">
                  <MathContent content={currentQuestion.question} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Input section */}
            <div className="flex flex-col items-center gap-6 w-full max-w-md">
              {isMultiAnswer ? (
                <>
                  <div className="flex w-full justify-center gap-3">
                    {multiAnswers.map((value, index) => (
                      <input
                        key={index}
                        ref={index === 0 ? simpleInputRef : undefined}
                        type="text"
                        value={
                          answerRevealed
                            ? String(currentQuestion.answer)
                                .split(",")
                                .filter((p) => p.trim().length > 0)[index] ?? ""
                            : value
                        }
                        onChange={(e) => {
                          const next = [...multiAnswers];
                          next[index] = e.target.value;
                          setMultiAnswers(next);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={index === 0 ? "First root" : "Second root"}
                        className={cn(
                          "w-32 h-14 text-xl font-semibold rounded-2xl border-2 outline-none transition-all duration-75",
                          showFeedback && lastAttempt?.isCorrect
                            ? "bg-primary/20 border-primary/50 text-primary focus:ring-0 focus:outline-none focus:border-primary/50"
                            : showFeedback && !lastAttempt?.isCorrect
                            ? "bg-red-500/20 border-red-500/50 text-red-100 focus:ring-0 focus:outline-none focus:border-red-500/50"
                            : "bg-white/5 border-white/10 text-white/90 focus:border-primary/50 focus:ring-4 focus:ring-primary/20",
                          "placeholder:text-white/20 placeholder:text-sm placeholder:font-medium",
                          (showFeedback && lastAttempt?.isCorrect) || answerRevealed ? "cursor-not-allowed" : ""
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
                    ))}
                  </div>

                  {/* Submit / reveal buttons for multi-answer */}
                  <div className="flex items-center gap-2">
                    {!answerRevealed && showFeedback && !lastAttempt?.isCorrect && (
                      <button
                        onClick={handleRevealAnswer}
                        className="px-3 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90 transition-all text-xs"
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
                          ? "bg-red-500/20 text-red-100 hover:bg-red-500/30"
                          : multiAnswers.some((p) => p.trim().length > 0) && !showFeedback
                          ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                          : answerRevealed
                          ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                      )}
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                      <span>Submit</span>
                    </button>
                  </div>
                </>
              ) : useKatexInput ? (
                <>
                  <KatexInput
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
                        "w-full h-16 text-2xl font-semibold rounded-2xl border-2 outline-none transition-all duration-75",
                        showFeedback && lastAttempt?.isCorrect
                          ? "bg-primary/20 border-primary/50 text-primary focus:ring-0 focus:outline-none focus:border-primary/50"
                          : showFeedback && !lastAttempt?.isCorrect
                          ? "bg-red-500/20 border-red-500/50 text-red-100 focus:ring-0 focus:outline-none focus:border-red-500/50"
                          : "bg-white/5 border-white/10 text-white/90 focus:border-primary/50 focus:ring-4 focus:ring-primary/20",
                        "placeholder:text-white/20 placeholder:text-base placeholder:font-medium",
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
                            className="p-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90 transition-all"
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
                              ? "bg-red-500/20 text-red-100 hover:bg-red-500/30"
                              : answer.trim() && !showFeedback
                              ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                              : answerRevealed
                              ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                              : "bg-white/5 text-white/20 cursor-not-allowed"
                          )}
                        >
                          <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                  {/* Input mode toggle */}
                  <button
                    onClick={() => setUseKatexInput(!useKatexInput)}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    {useKatexInput ? "Switch to simple input" : "Switch to math input"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Explanation display (shown when answer is revealed) */}
          {answerRevealed && currentQuestion.explanation && (
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-medium text-white/70 mb-2">Explanation:</p>
              <p className="text-sm text-white/60 whitespace-pre-line">{currentQuestion.explanation}</p>
            </div>
          )}
        </Container>
      </div>


      {/* Success feedback popup */}
      <FeedbackPopup show={showSuccessFeedback} />
    </div>
  );
}

