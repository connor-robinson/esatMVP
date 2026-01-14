"use client";

import { useEffect } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import type { TMUAGraphSpec } from "@/components/shared/TMUAGraph";
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
  graphSpecs?: Record<string, TMUAGraphSpec> | null;
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
  graphSpecs,
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
      <div className="relative bg-white/[0.08] rounded-organic-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white/90 font-mono">Detailed Explanation</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Key Insight */}
          {solution_key_insight && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wide">Key Insight</span>
                {onEditKeyInsight && (
                  <button
                    onClick={onEditKeyInsight}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    title="Edit key insight"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white/60" />
                  </button>
                )}
              </div>
              <div className="p-4 rounded-organic-md bg-white/[0.08]" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '2.25rem' }}>
                <MathContent
                  content={solution_key_insight}
                  className="text-white/90"
                />
              </div>
            </div>
          )}

          {/* Step-by-Step Solution */}
          {solution_reasoning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wide">Step-by-Step Solution</span>
                {onEditReasoning && (
                  <button
                    onClick={onEditReasoning}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    title="Edit solution"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white/60" />
                  </button>
                )}
              </div>
              <div className="p-4 rounded-organic-md bg-white/[0.08]" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '2.25rem' }}>
                {graphSpecs ? (
                  <QuestionWithGraph
                    questionText={solution_reasoning}
                    graphSpecs={graphSpecs}
                    className="text-white/90"
                  />
                ) : (
                  <MathContent
                    content={solution_reasoning}
                    className="text-white/90"
                  />
                )}
              </div>
            </div>
          )}

          {/* All Options Analysis */}
          {distractor_map && Object.keys(distractor_map).length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono text-white/50 uppercase tracking-wide">Answer Options</span>
              <div className="space-y-2">
                {optionLetters.map((letter) => {
                  const isCorrect = letter === correct_option;
                  const hasDistractor = distractor_map[letter];
                  
                  return (
                    <div
                      key={letter}
                      className={cn(
                        "p-3 rounded-organic-md relative group flex items-start gap-3",
                        isCorrect
                          ? "bg-[#85BC82]/20"
                          : "bg-[#854952]/20"
                      )}
                    >
                      {onEditDistractor && !isCorrect && (
                        <button
                          onClick={() => onEditDistractor(letter)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                          title={`Edit distractor ${letter}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-white/60" />
                        </button>
                      )}
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-organic-md flex items-center justify-center font-bold text-sm",
                        isCorrect
                          ? "bg-[#85BC82]/40 text-white"
                          : "bg-[#854952]/40 text-white"
                      )}>
                        {letter}
                      </div>
                      <div className="flex-1 flex items-start gap-2" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '1.125rem', lineHeight: '2.25rem' }}>
                        <div className={isCorrect ? "text-white/90" : "text-white/80"}>
                          <MathContent
                            content={options[letter]}
                            className={isCorrect ? "text-white/90" : "text-white/80"}
                          />
                        </div>
                        {hasDistractor && (
                          <>
                            <span className="text-white/50 mx-1">—</span>
                            <div className="text-white/70">
                              <MathContent
                                content={distractor_map[letter]}
                                className="text-white/70"
                              />
                            </div>
                          </>
                        )}
                        {isCorrect && (
                          <>
                            <span className="text-white/50 mx-1">—</span>
                            <span className="text-[#85BC82] text-white/90">Correct answer</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
