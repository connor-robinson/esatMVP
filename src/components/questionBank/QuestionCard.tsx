"use client";

import { useState, useEffect, useRef } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn, formatTime } from "@/lib/utils";
import { CheckCircle2, XCircle, Pencil, Eye, Clock } from "lucide-react";

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
  elapsedTime?: number;
  onResetTimer?: () => void;
}

// Helper function to get subject color based on paper name
const getSubjectColor = (paper: string | null): string => {
  if (!paper) return 'bg-white/10 text-white/70';
  
  const paperLower = paper.toLowerCase();
  if (paperLower.includes('math 1') || paper === 'Math 1') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  if (paperLower.includes('math 2') || paper === 'Math 2') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  if (paperLower.includes('physics') || paper === 'Physics') {
    return 'bg-[#2f2835]/30 text-[#a78bfa]';
  }
  if (paperLower.includes('chemistry') || paper === 'Chemistry') {
    return 'bg-[#854952]/20 text-[#ef7d7d]';
  }
  if (paperLower.includes('biology') || paper === 'Biology') {
    return 'bg-[#506141]/20 text-[#85BC82]';
  }
  // Default fallback
  return 'bg-white/10 text-white/70';
};

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
  onRevealAnswer,
  allowRetry = false,
  getTopicTitle,
  elapsedTime = 0,
  onResetTimer,
}: QuestionCardProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get option letters from the options object
  const optionLetters = Object.keys(question.options).sort();

  // Reset local state when question changes
  useEffect(() => {
    if (!isAnswered || allowRetry) {
      setLocalSelectedAnswer(null);
    }
  }, [question.id, isAnswered, allowRetry]);

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
    if (isAnswered && !allowRetry && !answerRevealed) return; // Prevent changing answer after submission unless retry is allowed
    setLocalSelectedAnswer(optionLetter);
  };

  const handleSubmit = () => {
    if (!localSelectedAnswer || (isAnswered && !allowRetry && !answerRevealed)) return;
    const correct = localSelectedAnswer === question.correct_option;
    onAnswerSubmit(localSelectedAnswer, correct);
  };

  const getOptionStyle = (optionLetter: string) => {
    // If answer is revealed, show correct answer
    if (answerRevealed && optionLetter === correctAnswer) {
      return "bg-[#506141]/30 text-white cursor-default";
    }

    // If wrong answer was selected and not revealed, show only that wrong answer
    if (isAnswered && !isCorrect && !answerRevealed) {
      if (optionLetter === selectedAnswer && optionLetter !== correctAnswer) {
        return "bg-[#854952]/25 text-white cursor-pointer";
      }
      // Other options remain interactive
      if (allowRetry) {
        if (localSelectedAnswer === optionLetter) {
          return "bg-interview/20 hover:bg-interview/25 text-white cursor-pointer";
        }
        return cn(
          "bg-white/5 hover:bg-white/10 text-white/90 cursor-pointer transition-all duration-fast ease-signature",
          hoveredOption === optionLetter && "bg-white/8"
        );
      }
      return "bg-white/5 text-white/40 cursor-default";
    }

    // Before answering or after correct answer - subtle lighter background for all, signature purple when selected
    if (localSelectedAnswer === optionLetter) {
      return "bg-interview/20 hover:bg-interview/25 text-white cursor-pointer";
    }
    return cn(
      "bg-white/5 hover:bg-white/10 text-white/90 cursor-pointer transition-all duration-fast ease-signature",
      hoveredOption === optionLetter && "bg-white/8"
    );
  };

  return (
    <div className="space-y-6">
      {/* Question stem - in its own card */}
      <Card className="p-8 relative group bg-white/[0.03]">
        {onEditQuestionStem && (
          <button
            onClick={onEditQuestionStem}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            title="Edit question"
          >
            <Pencil className="w-4 h-4 text-white/60" />
          </button>
        )}
        
        {/* Question Details and Timer - inside question container */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn(
              "px-3 py-1.5 rounded-organic-md text-xs font-mono",
              question.difficulty === 'Easy' && 'bg-[#506141]/20 text-[#85BC82]',
              question.difficulty === 'Medium' && 'bg-[#967139]/20 text-[#b8a066]',
              question.difficulty === 'Hard' && 'bg-[#854952]/20 text-[#ef7d7d]'
            )}>
              {question.difficulty}
            </span>
            {question.paper && (
              <span className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono",
                getSubjectColor(question.paper)
              )}>
                {question.paper}
              </span>
            )}
            {/* Grouped primary and secondary tags */}
            {(question.primary_tag || (question.secondary_tags && question.secondary_tags.length > 0)) && getTopicTitle && (
              <div className="flex items-center gap-0">
                {question.primary_tag && (
                  <span className="px-3 py-1.5 rounded-l-organic-md bg-secondary/20 text-xs text-secondary font-mono border-r border-secondary/30">
                    {getTopicTitle(question.primary_tag)}
                  </span>
                )}
                {question.secondary_tags && question.secondary_tags.length > 0 && question.secondary_tags.map((tag, index) => (
                  <span 
                    key={tag} 
                    className={cn(
                      "px-3 py-1.5 text-xs text-white/40 font-mono bg-white/10",
                      index === question.secondary_tags!.length - 1 ? "rounded-r-organic-md" : "border-r border-white/20"
                    )}
                  >
                    {getTopicTitle(tag)}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Timer - in question details row */}
          {elapsedTime !== undefined && onResetTimer && (
            <div className="flex items-center gap-4">
              <Clock 
                className="w-6 h-6 text-white/70"
                strokeWidth={1.5}
              />
              <div 
                onDoubleClick={onResetTimer}
                className="text-2xl font-bold tabular-nums tracking-tight text-white/90 cursor-pointer hover:text-white transition-colors select-none"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
                title="Double-click to reset timer"
              >
                {formatTime(elapsedTime)}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 'calc(1.125rem * 1.15)', lineHeight: '2.25rem' }}>
          <MathContent
            content={question.question_stem}
            className="text-white/95"
          />
        </div>
      </Card>

      {/* Options - in a container */}
      <Card className="p-6 bg-white/[0.03]">
        <div className="space-y-2">
          {optionLetters.map((letter) => {
          const hasDistractor = question.distractor_map && question.distractor_map[letter] && letter !== correctAnswer;
          return (
            <div key={letter} className="relative group">
            <button
              onClick={() => handleOptionClick(letter)}
              onMouseEnter={() => (!isAnswered || allowRetry) && setHoveredOption(letter)}
              onMouseLeave={() => setHoveredOption(null)}
              disabled={isAnswered && !allowRetry && !answerRevealed}
              className={cn(
                "w-full py-3 px-4 rounded-organic-md transition-all duration-fast ease-signature text-left relative",
                getOptionStyle(letter),
                (!isAnswered || allowRetry) && "hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Option letter badge */}
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-organic-md flex items-center justify-center font-bold text-sm transition-all duration-fast ease-signature",
                    answerRevealed && letter === correctAnswer
                      ? "bg-[#506141]/40 text-white"
                      : isAnswered && !isCorrect && !answerRevealed && letter === selectedAnswer && letter !== correctAnswer
                      ? "bg-[#854952]/35 text-white"
                      : localSelectedAnswer === letter
                      ? "bg-interview/30 text-white"
                      : "bg-white/10 text-white/70"
                  )}
                >
                  {letter}
                </div>

                {/* Option text - with Times New Roman font, same size as question */}
                <div className="flex-1 flex items-center gap-3" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '2.25rem' }}>
                  <MathContent
                    content={question.options[letter]}
                    className="text-inherit"
                  />
                  {/* Distractor map inline for wrong answer */}
                  {isAnswered && !isCorrect && !answerRevealed && letter === selectedAnswer && letter !== correctAnswer && question.distractor_map && question.distractor_map[letter] && (
                    <span className="text-white/60 text-sm" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      • <MathContent content={question.distractor_map[letter]} className="text-inherit" />
                    </span>
                  )}
                </div>

                {/* Checkmark or X for answered state - using SVG icons from papers/mark, fixed width to prevent size changes */}
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {answerRevealed && letter === correctAnswer && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#506141" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {isAnswered && !isCorrect && !answerRevealed && letter === selectedAnswer && letter !== correctAnswer && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#854952" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>
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
          );
        })}
        </div>
      </Card>

      {/* Simple Feedback - shown by option colors */}

      {/* Check Answer Button - Simple and Modern */}
      {(!isAnswered || (isAnswered && allowRetry && !answerRevealed)) && localSelectedAnswer && (
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
      
      {/* Reveal Answer Button - shown when wrong answer */}
      {isAnswered && !isCorrect && !answerRevealed && onRevealAnswer && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onRevealAnswer}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-organic-md text-sm text-white/70 transition-all duration-fast ease-signature flex items-center gap-2 border border-white/10"
          >
            <Eye className="w-4 h-4" />
            Reveal Answer
          </button>
        </div>
      )}
    </div>
  );
}

