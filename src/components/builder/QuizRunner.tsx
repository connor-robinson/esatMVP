/**
 * Quiz runner component for running multi-topic sessions
 */

"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Check, AlertCircle, ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/drill/ProgressBar";
import { GeneratedQuestion, QuestionAttempt } from "@/types/core";
import { getTopic } from "@/config/topics";
import { cn } from "@/lib/utils";

interface QuizRunnerProps {
  currentQuestion: GeneratedQuestion;
  questionNumber: number;
  totalQuestions: number;
  progress: number;
  showFeedback: boolean;
  lastAttempt: QuestionAttempt | null;
  onSubmitAnswer: (answer: string) => void;
  onContinueAfterIncorrect: () => void;
  onExit: () => void;
}

export function QuizRunner({
  currentQuestion,
  questionNumber,
  totalQuestions,
  progress,
  showFeedback,
  lastAttempt,
  onSubmitAnswer,
  onContinueAfterIncorrect,
  onExit,
}: QuizRunnerProps) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount and question change, clear input
  useEffect(() => {
    if (!showFeedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentQuestion, showFeedback]);

  // Clear input only when moving to next question (not during feedback)
  useEffect(() => {
    setAnswer("");
  }, [currentQuestion]);

  const handleSubmit = () => {
    if (answer.trim() && !showFeedback) {
      onSubmitAnswer(answer.trim());
    } else if (showFeedback && !lastAttempt?.isCorrect) {
      // If showing incorrect feedback, pressing enter advances to next question
      onContinueAfterIncorrect();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const topicName = currentQuestion.topicId
    ? getTopic(currentQuestion.topicId)?.name
    : "Unknown";

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header with title and exit button */}
      <div className="flex-shrink-0 pt-20 pb-3">
        <Container size="xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-heading font-bold text-white/95">
              Practice Session
            </h1>
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all text-sm font-medium"
            >
              <LogOut className="h-5 w-5" strokeWidth={2} />
              <span>Exit</span>
            </button>
          </div>
          
          {/* Progress bar */}
          <ProgressBar current={questionNumber} total={totalQuestions} />
        </Container>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <Container size="md" className="w-full flex items-center justify-center" style={{ marginTop: '-2rem' }}>
          <div className="w-full">
          {/* Question */}
          <div className="text-center">
            <Card className="py-14 px-12 bg-surface/80 backdrop-blur min-h-[440px] flex flex-col justify-center">
                {/* Topic badge - inside card at top */}
                <div className="flex justify-center mb-10">
                  <span className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold">
                    {topicName}
                  </span>
                </div>
                
                {/* Question */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={questionNumber}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.08 }}
                    className="text-5xl md:text-6xl font-bold text-white/90 tracking-tight mb-10 leading-tight"
                    style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
                  />
                </AnimatePresence>

                {/* Answer input */}
                <div className="flex flex-col items-center gap-3">
                  {/* Input with submit icon */}
                  <div className="relative w-full max-w-md">
                    <input
                      ref={inputRef}
                      type="text"
                      value={showFeedback && !lastAttempt?.isCorrect ? currentQuestion.answer : answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your answer"
                      className={cn(
                        "w-full h-16 px-6 pr-16 text-center text-2xl font-semibold rounded-2xl border-2 outline-none transition-all duration-75",
                        showFeedback && lastAttempt?.isCorrect && "bg-primary/20 border-primary/50 text-primary focus:ring-0 focus:outline-none focus:border-primary/50",
                        showFeedback && !lastAttempt?.isCorrect && "bg-red-500/20 border-red-500/50 text-red-100 focus:ring-0 focus:outline-none focus:border-red-500/50",
                        !showFeedback && "bg-white/5 border-white/10 text-white/90 focus:border-primary/50 focus:ring-4 focus:ring-primary/20",
                        "placeholder:text-white/20 placeholder:text-sm placeholder:font-normal"
                      )}
                      autoComplete="off"
                      disabled={showFeedback && lastAttempt?.isCorrect}
                      readOnly={showFeedback && !lastAttempt?.isCorrect}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={(!answer.trim() && !showFeedback) || (showFeedback && lastAttempt?.isCorrect)}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all",
                        showFeedback && !lastAttempt?.isCorrect
                          ? "bg-red-500/20 text-red-100 hover:bg-red-500/30"
                          : answer.trim() && !showFeedback
                          ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                      )}
                    >
                      <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                  </div>

                  <div className="text-xs text-white/30">
                    Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-white/40">Enter</kbd> to {showFeedback && !lastAttempt?.isCorrect ? "continue" : "submit"}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}

