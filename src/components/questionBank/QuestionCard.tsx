"use client";

import { useState, useEffect, useRef } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Pencil } from "lucide-react";

interface QuestionCardProps {
  question: QuestionBankQuestion;
  onAnswerSubmit: (selectedAnswer: string, isCorrect: boolean) => void;
  isAnswered: boolean;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  onEditQuestionStem?: () => void;
  onEditOption?: (optionLetter: string) => void;
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
}: QuestionCardProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get option letters from the options object
  const optionLetters = Object.keys(question.options).sort();

  // Reset local state when question changes
  useEffect(() => {
    if (!isAnswered) {
      setLocalSelectedAnswer(null);
    }
  }, [question.id, isAnswered]);

  // Handle Enter key press
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && localSelectedAnswer && !isAnswered) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [localSelectedAnswer, isAnswered]);

  const handleOptionClick = (optionLetter: string) => {
    if (isAnswered) return; // Prevent changing answer after submission
    setLocalSelectedAnswer(optionLetter);
  };

  const handleSubmit = () => {
    if (!localSelectedAnswer || isAnswered) return;
    const correct = localSelectedAnswer === question.correct_option;
    onAnswerSubmit(localSelectedAnswer, correct);
  };

  const getOptionStyle = (optionLetter: string) => {
    if (!isAnswered) {
      // Before answering - subtle lighter background for all, even lighter when selected
      if (localSelectedAnswer === optionLetter) {
        return "bg-white/12 hover:bg-white/15 cursor-pointer";
      }
      return cn(
        "bg-white/5 hover:bg-white/8 cursor-pointer",
        hoveredOption === optionLetter && "bg-white/8"
      );
    }

    // After answering
    if (optionLetter === correctAnswer) {
      // Correct answer - show green (desaturated)
      return "bg-primary/20 text-white cursor-default";
    }

    if (optionLetter === selectedAnswer && optionLetter !== correctAnswer) {
      // Wrong answer selected - show red (desaturated)
      return "bg-error/20 text-white cursor-default";
    }

    // Other options - faded out
    return "bg-white/5 text-white/40 cursor-default";
  };

  return (
    <div className="space-y-6">
      {/* Question stem - in its own card */}
      <Card className="p-8 relative group">
        {onEditQuestionStem && (
          <button
            onClick={onEditQuestionStem}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            title="Edit question"
          >
            <Pencil className="w-4 h-4 text-white/60" />
          </button>
        )}
        {/* QUESTION FONT SIZE: Change 'text-base' below to adjust size
            Options: text-xs (0.71rem), text-sm (0.857rem), text-base (1rem), 
                     text-lg (1.4rem), text-xl (1.96rem), text-2xl (2.744rem) */}
        <div style={{ fontFamily: "'EB Garamond', Garamond, Georgia, serif" }}>
          <MathContent
            content={question.question_stem}
            className="text-lg text-white/90 leading-relaxed font-serif"
          />
        </div>
      </Card>

      {/* Options - without container */}
      <div className="space-y-3">
        {optionLetters.map((letter) => (
          <div key={letter} className="relative group">
            <button
              onClick={() => handleOptionClick(letter)}
              onMouseEnter={() => !isAnswered && setHoveredOption(letter)}
              onMouseLeave={() => setHoveredOption(null)}
              disabled={isAnswered}
              className={cn(
                "w-full p-4 rounded-organic-md transition-all duration-fast ease-signature text-left",
                getOptionStyle(letter)
              )}
            >
              <div className="flex items-start gap-4">
                {/* Option letter badge */}
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-fast",
                    isAnswered && letter === correctAnswer
                      ? "bg-primary text-neutral-900"
                      : isAnswered && letter === selectedAnswer && letter !== correctAnswer
                      ? "bg-error text-white"
                      : localSelectedAnswer === letter && !isAnswered
                      ? "bg-white/15 text-white/90"
                      : "bg-white/8 text-white/50"
                  )}
                >
                  {letter}
                </div>

                {/* Option text */}
                <div className="flex-1 pt-1">
                  <MathContent
                    content={question.options[letter]}
                    className="text-base"
                  />
                </div>

                {/* Checkmark or X for answered state */}
                {isAnswered && letter === correctAnswer && (
                  <div className="flex-shrink-0 text-primary text-xl font-bold">
                    ✓
                  </div>
                )}
                {isAnswered && letter === selectedAnswer && letter !== correctAnswer && (
                  <div className="flex-shrink-0 text-error text-xl font-bold">
                    ✗
                  </div>
                )}
              </div>
            </button>
            {onEditOption && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditOption(letter);
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                title={`Edit option ${letter}`}
              >
                <Pencil className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Simple Feedback - shown by option colors */}

      {/* Check Answer Button - Simple and Modern */}
      {!isAnswered && localSelectedAnswer && (
        <div className="flex justify-center mt-8">
          <button
            ref={buttonRef}
            onClick={handleSubmit}
            className="px-8 py-3 bg-primary text-neutral-900 rounded-lg font-semibold hover:bg-primary-hover transition-all duration-200 hover:scale-105"
          >
            Check Answer
          </button>
        </div>
      )}
    </div>
  );
}

