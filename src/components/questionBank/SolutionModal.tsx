"use client";

import { useEffect } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  solution_reasoning: string | null;
  solution_key_insight: string | null;
  distractor_map: Record<string, string> | null;
  correct_option: string;
  options: Record<string, string>;
  isCorrect: boolean;
  selectedAnswer: string | null;
  onEditKeyInsight?: () => void;
  onEditReasoning?: () => void;
  onEditDistractor?: (optionLetter: string) => void;
}

export function SolutionModal({
  isOpen,
  onClose,
  solution_reasoning,
  solution_key_insight,
  distractor_map,
  correct_option,
  options,
  isCorrect,
  selectedAnswer,
  onEditKeyInsight,
  onEditReasoning,
  onEditDistractor,
}: SolutionModalProps) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Get sorted option letters
  const optionLetters = Object.keys(options).sort();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-neutral-900 rounded-organic-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
              isCorrect ? "bg-primary/20 text-primary" : "bg-error/20 text-error"
            )}>
              {isCorrect ? "✓" : "✗"}
            </div>
            <h2 className="text-lg font-semibold text-white/90">
              {isCorrect ? "Correct Answer" : "Review Solution"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Close solution"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Correct Answer Display */}
          <div className="p-4 rounded-organic-md bg-primary/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-neutral-900 flex items-center justify-center font-bold text-sm">
                {correct_option}
              </div>
              <div className="flex-1" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '1.75rem' }}>
                <MathContent
                  content={options[correct_option]}
                  className="text-white/90"
                />
              </div>
            </div>
          </div>

          {/* Key Insight */}
          {solution_key_insight && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide">Key Concept</h3>
                {onEditKeyInsight && (
                  <button
                    onClick={onEditKeyInsight}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                    title="Edit key insight"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white/60" />
                  </button>
                )}
              </div>
              <div className="p-6 rounded-organic-md bg-white/5" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '1.75rem' }}>
                <MathContent
                  content={solution_key_insight}
                  className="text-white/85"
                />
              </div>
            </div>
          )}

          {/* Distractor Analysis */}
          {distractor_map && Object.keys(distractor_map).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide">Why Other Options Are Wrong</h3>
              <div className="space-y-2">
                {optionLetters
                  .filter(letter => letter !== correct_option)
                  .map((letter) => (
                    <div
                      key={letter}
                      className={cn(
                        "p-4 rounded-organic-md transition-colors relative group",
                        letter === selectedAnswer 
                          ? "bg-error/10" 
                          : "bg-white/5"
                      )}
                    >
                      {onEditDistractor && (
                        <button
                          onClick={() => onEditDistractor(letter)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                          title={`Edit distractor ${letter}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-white/60" />
                        </button>
                      )}
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                          letter === selectedAnswer
                            ? "bg-error/20 text-error"
                            : "bg-white/10 text-white/40"
                        )}>
                          {letter}
                        </div>
                        <div className="flex-1 space-y-3" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          <div className="flex items-center gap-2" style={{ fontSize: '1.125rem', lineHeight: '1.75rem' }}>
                            <MathContent
                              content={options[letter]}
                              className={cn(
                                letter === selectedAnswer ? "text-white/80" : "text-white/50"
                              )}
                            />
                            {letter === selectedAnswer && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-error/70 bg-error/10 px-2 py-0.5 rounded">
                                Your Choice
                              </span>
                            )}
                          </div>
                          {distractor_map[letter] && (
                            <div className="pl-3" style={{ fontSize: '1.125rem', lineHeight: '1.75rem' }}>
                              <MathContent
                                content={distractor_map[letter]}
                                className="text-white/70"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Detailed Solution */}
          {solution_reasoning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wide">Step-by-Step Solution</h3>
                {onEditReasoning && (
                  <button
                    onClick={onEditReasoning}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                    title="Edit solution"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white/60" />
                  </button>
                )}
              </div>
              <div className="p-6 rounded-organic-md bg-white/5" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '1.75rem' }}>
                <MathContent
                  content={solution_reasoning}
                  className="text-white/80"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-neutral-900 rounded-lg font-semibold hover:bg-primary-hover transition-all text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
