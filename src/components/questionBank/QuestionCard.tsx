"use client";

import { useState, useEffect } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Pencil, Eye, ArrowRight, HelpCircle } from "lucide-react";

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
}

// Helper function to get subject color based on paper name
const getSubjectColor = (subjects: string | null | undefined): string => {
  if (!subjects) return 'bg-surface-subtle text-text-muted';
  
  const subjectsLower = subjects.toLowerCase().trim();
  
  // Math matching
  if (subjectsLower === 'math 1' || subjectsLower === 'math1') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  if (subjectsLower === 'math 2' || subjectsLower === 'math2') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  
  // Physics matching
  if (subjectsLower === 'physics') {
    return 'bg-[#2f2835]/30 text-[#a78bfa]';
  }
  
  // Chemistry matching
  if (subjectsLower === 'chemistry') {
    return 'bg-[#854952]/20 text-[#ef7d7d]';
  }
  
  // Biology matching
  if (subjectsLower === 'biology') {
    return 'bg-[#506141]/20 text-[#85BC82]';
  }
  
  // TMUA Paper matching
  if (subjectsLower === 'paper 1' || subjectsLower === 'paper1') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  if (subjectsLower === 'paper 2' || subjectsLower === 'paper2') {
    return 'bg-[#406166]/20 text-[#5da8f0]';
  }
  
  // Default fallback
  return 'bg-surface-subtle text-text-muted';
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
  onSelectionChange,
  onIncorrectAnswersChange,
}: QuestionCardProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<string | null>(null);
  const [revealedDistractors, setRevealedDistractors] = useState<Set<string>>(new Set());
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<string>>(new Set());

  // Get option letters from the options object
  const optionLetters = Object.keys(question.options).sort();

  // Reset local state when question changes
  useEffect(() => {
    if (!isAnswered || allowRetry) {
      setLocalSelectedAnswer(null);
      onSelectionChange?.(null);
    }
    setHoveredOption(null);
    setRevealedDistractors(new Set());
    setIncorrectAnswers(new Set());
  }, [question.id, isAnswered, allowRetry, onSelectionChange]);

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(localSelectedAnswer);
  }, [localSelectedAnswer, onSelectionChange]);
  
  // Track incorrect answers when they're submitted
  useEffect(() => {
    if (isAnswered && !isCorrect && selectedAnswer) {
      setIncorrectAnswers(prev => {
        const newSet = new Set(prev).add(selectedAnswer);
        onIncorrectAnswersChange?.(newSet);
        return newSet;
      });
    }
  }, [isAnswered, isCorrect, selectedAnswer, onIncorrectAnswersChange]);

  // Notify parent when incorrect answers change
  useEffect(() => {
    onIncorrectAnswersChange?.(incorrectAnswers);
  }, [incorrectAnswers, onIncorrectAnswersChange]);

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
    // Prevent submitting answers that are already known to be incorrect
    if (incorrectAnswers.has(localSelectedAnswer)) return;
    const correct = localSelectedAnswer === question.correct_option;
    onAnswerSubmit(localSelectedAnswer, correct);
  };

  const getOptionStyle = (optionLetter: string) => {
    // If answered correctly, show green background (signature green)
    if (isAnswered && isCorrect && optionLetter === correctAnswer) {
      return "bg-success/20 hover:bg-success/25 text-success border border-success/30 cursor-default";
    }
    
    // If answer is revealed, show correct answer with green
    if (answerRevealed && optionLetter === correctAnswer) {
      return "bg-success/20 text-success border border-success/30 cursor-default";
    }

    // Always keep all previously wrong answers marked as red
    if (incorrectAnswers.has(optionLetter) && optionLetter !== correctAnswer) {
      return "bg-error/20 text-error border border-error/30 cursor-default";
    }

    // If wrong answer was selected and not revealed, show only that wrong answer
    if (isAnswered && !isCorrect && !answerRevealed) {
      // Other options remain interactive
      if (allowRetry) {
        if (localSelectedAnswer === optionLetter) {
          return "bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 cursor-pointer";
        }
        return cn(
          "bg-surface-subtle hover:bg-surface-elevated text-text border border-border hover:border-border-subtle cursor-pointer transition-all duration-fast ease-signature",
          hoveredOption === optionLetter && "bg-surface-elevated"
        );
      }
      return "bg-surface-subtle text-text-muted border border-border cursor-default";
    }

    // Before answering or after correct answer - subtle lighter background for all, signature purple when selected
    if (localSelectedAnswer === optionLetter) {
      return "bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30 cursor-pointer";
    }
    return cn(
      "bg-surface-subtle hover:bg-surface-elevated text-text border border-border hover:border-border-subtle cursor-pointer transition-all duration-fast ease-signature",
      hoveredOption === optionLetter && "bg-surface-elevated"
    );
  };

  return (
    <div className="space-y-6">
      {/* Question stem - in its own card */}
      <Card className="px-8 pt-0 pb-0 relative group bg-surface-subtle">
        {onEditQuestionStem && (
          <button
            onClick={onEditQuestionStem}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-surface-elevated hover:bg-surface flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            title="Edit question"
          >
            <Pencil className="w-4 h-4 text-text-muted" />
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
            {question.subjects && question.subjects.trim() && (
              <span className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono",
                getSubjectColor(question.subjects)
              )}>
                {question.subjects}
              </span>
            )}
            {/* TMUA variation mode label (FAR/SIBLINGS) */}
            {question.subjects && (question.subjects === 'Paper 1' || question.subjects === 'Paper 2') && question.idea_plan && question.idea_plan.variation_mode && (
              <span className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono",
                question.idea_plan.variation_mode === 'FAR' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : question.idea_plan.variation_mode === 'SIBLINGS'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-surface-subtle text-text-muted'
              )}>
                {question.idea_plan.variation_mode}
              </span>
            )}
            {/* Grouped primary and secondary tags */}
            {(question.primary_tag || (question.secondary_tags && question.secondary_tags.length > 0)) && getTopicTitle && (
              <div className="flex items-center gap-0">
                {question.primary_tag && (
                  <span className={cn(
                    "px-3 py-1.5 bg-secondary/20 text-xs text-secondary font-mono",
                    (!question.secondary_tags || question.secondary_tags.length === 0)
                      ? "rounded-organic-md"
                      : "rounded-l-organic-md border-r border-secondary/30"
                  )}>
                    {getTopicTitle(question.primary_tag)}
                  </span>
                )}
                {question.secondary_tags && question.secondary_tags.length > 0 && question.secondary_tags.map((tag, index) => (
                  <span 
                    key={tag} 
                    className={cn(
                      "px-3 py-1.5 text-xs text-text-muted font-mono bg-surface-subtle",
                      index === question.secondary_tags!.length - 1 ? "rounded-r-organic-md" : "border-r border-border"
                    )}
                  >
                    {getTopicTitle(tag)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 'calc(1.125rem * 1.15)', lineHeight: '2.25rem', marginTop: '0', marginBottom: '0', paddingTop: '0', paddingBottom: '0' }}>
          {(question.graph_spec || question.graph_specs) ? (
            <QuestionWithGraph
              questionText={question.question_stem}
              graphSpec={question.graph_spec}
              graphSpecs={question.graph_specs}
              className="text-text"
            />
          ) : (
            <MathContent
              content={question.question_stem}
              className="text-text"
            />
          )}
        </div>
      </Card>

      {/* Options - in a container */}
      <Card className="p-6 bg-surface-subtle">
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
                (!isAnswered || allowRetry) && "hover:shadow-lg hover:shadow-secondary/10"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Option letter badge */}
                <div
                  className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-organic-md flex items-center justify-center font-bold text-sm transition-all duration-fast ease-signature border",
                    isAnswered && isCorrect && letter === correctAnswer
                      ? "bg-success/30 text-success border-success/40"
                      : answerRevealed && letter === correctAnswer
                      ? "bg-success/30 text-success border-success/40"
                      : incorrectAnswers.has(letter) && letter !== correctAnswer
                      ? "bg-error/30 text-error border-error/40"
                      : localSelectedAnswer === letter && (!isAnswered || (isAnswered && allowRetry && !incorrectAnswers.has(letter)))
                      ? "bg-secondary/30 text-secondary border-secondary/40"
                      : "bg-surface-elevated text-text-muted border-border"
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
                  {/* Distractor map reveal button or content for wrong answer - show for all incorrect answers */}
                  {incorrectAnswers.has(letter) && letter !== correctAnswer && question.distractor_map && question.distractor_map[letter] && (
                    <>
                      {!revealedDistractors.has(letter) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevealedDistractors(prev => new Set(prev).add(letter));
                          }}
                          className="flex items-center gap-2 px-3 h-10 rounded-organic-md bg-surface-elevated hover:bg-surface text-text-muted hover:text-text transition-all duration-fast ease-signature text-sm font-mono"
                        >
                          <HelpCircle className="w-4 h-4" strokeWidth={2.5} />
                          <span>Reveal why this answer is wrong</span>
                        </button>
                      ) : (
                        <span className="text-text-muted" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '2.25rem' }}>
                          <MathContent content={question.distractor_map[letter]} className="text-inherit" />
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Submit button or Checkmark/X for answered state */}
                <div className="flex-shrink-0 flex items-center justify-center">
                  {/* Submit button - shown when option is selected and (not answered OR retry is allowed), but not for previously incorrect answers */}
                  {((!isAnswered || (isAnswered && allowRetry)) && localSelectedAnswer === letter && !incorrectAnswers.has(letter)) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmit();
                      }}
                      className="w-10 h-10 rounded-organic-md bg-interview/40 hover:bg-interview/60 text-interview transition-all duration-fast ease-signature flex items-center justify-center"
                      style={{
                        boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
                      }}
                      title="Submit answer"
                    >
                      <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  )}
                  {/* Checkmark or X for answered state - using SVG icons from papers/mark, fixed width to prevent size changes */}
                  {isAnswered && (
                    <>
                      {(isCorrect && letter === correctAnswer) || (answerRevealed && letter === correctAnswer) ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#85BC82" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : incorrectAnswers.has(letter) && letter !== correctAnswer && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#854952" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </>
                  )}
                </div>
              </div>
              {/* Edit button - absolutely positioned in top-left, overlapping */}
              {onEditOption && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditOption(letter);
                  }}
                  className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-surface-elevated hover:bg-surface flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                  title={`Edit option ${letter}`}
                >
                  <Pencil className="w-3.5 h-3.5 text-text-muted" style={{ transform: 'scaleX(-1)' }} />
                </button>
              )}
            </button>
            </div>
          );
        })}
        </div>
      </Card>

      {/* Simple Feedback - shown by option colors */}

      
    </div>
  );
}

