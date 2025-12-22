"use client";

import { useState } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: QuestionBankQuestion;
  onAnswerSubmit: (selectedAnswer: string, isCorrect: boolean) => void;
  isAnswered: boolean;
  selectedAnswer: string | null;
  correctAnswer: string;
}

export function QuestionCard({
  question,
  onAnswerSubmit,
  isAnswered,
  selectedAnswer,
  correctAnswer,
}: QuestionCardProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  // Get option letters from the options object
  const optionLetters = Object.keys(question.options).sort();

  const handleOptionClick = (optionLetter: string) => {
    if (isAnswered) return; // Prevent changing answer after submission
    
    const isCorrect = optionLetter === question.correct_option;
    onAnswerSubmit(optionLetter, isCorrect);
  };

  const getOptionStyle = (optionLetter: string) => {
    if (!isAnswered) {
      // Before answering
      return cn(
        "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer",
        hoveredOption === optionLetter && "bg-white/10 border-white/20"
      );
    }

    // After answering
    if (optionLetter === correctAnswer) {
      // Correct answer - always show green
      return "bg-primary/20 border-2 border-primary text-white cursor-default";
    }

    if (optionLetter === selectedAnswer && optionLetter !== correctAnswer) {
      // Wrong answer selected
      return "bg-error/20 border-2 border-error text-white cursor-default";
    }

    // Other options - faded out
    return "bg-white/5 border border-white/5 text-white/40 cursor-default";
  };

  return (
    <Card className="p-8">
      {/* Question stem */}
      <div className="mb-8">
        <MathContent
          content={question.question_stem}
          className="text-lg text-white/90 leading-relaxed"
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        {optionLetters.map((letter) => (
          <button
            key={letter}
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
                    : "bg-white/10 text-white/70"
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
        ))}
      </div>

      {/* Question metadata */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded bg-white/5">
            {question.difficulty}
          </span>
          {question.primary_tag && (
            <span className="px-2 py-1 rounded bg-white/5">
              {question.primary_tag}
            </span>
          )}
        </div>
        <span>{question.schema_id}</span>
      </div>
    </Card>
  );
}

