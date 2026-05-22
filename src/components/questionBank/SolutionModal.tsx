"use client";

import { useEffect } from "react";
import { MathContent } from "@/components/shared/MathContent";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import type { TMUAGraphSpec } from "@/components/shared/TMUAGraph";
import { X, Pencil, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const bodyPanelClass =
  "rounded-organic-lg bg-surface-mid px-4 py-4 text-sm leading-relaxed text-text sm:text-base [&_.katex]:text-text";

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
  isCorrect: _isCorrect,
  selectedAnswer: _selectedAnswer,
  onEditKeyInsight,
  onEditReasoning,
  onEditDistractor,
  graphSpecs,
}: SolutionModalProps) {
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

  const optionLetters = Object.keys(options).sort();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detailed-explanation-title"
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <h2
            id="detailed-explanation-title"
            className="text-lg font-semibold tracking-tight text-text"
          >
            Detailed Explanation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-organic-md bg-surface-mid text-text-muted transition-colors duration-fast ease-signature hover:bg-surface-neutral hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {solution_key_insight && (
            <div className="group space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                  Key insight
                </span>
                {onEditKeyInsight && (
                  <button
                    type="button"
                    onClick={onEditKeyInsight}
                    className="flex h-8 w-8 items-center justify-center rounded-organic-sm border border-border-subtle bg-surface-elevated text-text-muted opacity-0 transition-all duration-fast ease-signature group-hover:opacity-100 hover:bg-surface-mid hover:text-text"
                    title="Edit key insight"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className={bodyPanelClass}>
                <MathContent
                  content={solution_key_insight}
                  className="text-inherit"
                />
              </div>
            </div>
          )}

          {solution_reasoning && (
            <div className="group space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-text-subtle">
                  Step-by-step solution
                </span>
                {onEditReasoning && (
                  <button
                    type="button"
                    onClick={onEditReasoning}
                    className="flex h-8 w-8 items-center justify-center rounded-organic-sm border border-border-subtle bg-surface-elevated text-text-muted opacity-0 transition-all duration-fast ease-signature group-hover:opacity-100 hover:bg-surface-mid hover:text-text"
                    title="Edit solution"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className={bodyPanelClass}>
                {graphSpecs ? (
                  <QuestionWithGraph
                    questionText={solution_reasoning}
                    graphSpecs={graphSpecs}
                    className="text-inherit"
                  />
                ) : (
                  <MathContent
                    content={solution_reasoning}
                    className="text-inherit"
                  />
                )}
              </div>
            </div>
          )}

          {distractor_map && Object.keys(distractor_map).length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-medium text-text-subtle">
                Answer options
              </span>
              <div className="space-y-2">
                {optionLetters.map((letter) => {
                  const rowCorrect = letter === correct_option;
                  const hasDistractor = distractor_map[letter];

                  return (
                    <div
                      key={letter}
                      className={cn(
                        "group relative flex items-start gap-3 rounded-organic-lg border px-4 py-3",
                        rowCorrect
                          ? "border-primary/25 bg-primary/10"
                          : "border-error/20 bg-error/10",
                      )}
                    >
                      {onEditDistractor && !rowCorrect && (
                        <button
                          type="button"
                          onClick={() => onEditDistractor(letter)}
                          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-organic-sm border border-border-subtle bg-surface-elevated text-text-muted opacity-0 transition-all duration-fast ease-signature group-hover:opacity-100 hover:bg-surface-mid hover:text-text"
                          title={`Edit distractor ${letter}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-sm font-semibold",
                          rowCorrect
                            ? "bg-primary text-background"
                            : "bg-error text-background",
                        )}
                      >
                        {letter}
                      </div>
                      <div
                        className={cn(
                          "min-w-0 flex-1 text-sm leading-relaxed sm:text-base",
                          rowCorrect ? "text-text" : "text-text/90",
                        )}
                      >
                        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
                          <MathContent
                            content={options[letter]}
                            className="text-inherit"
                          />
                          {hasDistractor && (
                            <>
                              <span className="text-text-muted">—</span>
                              <MathContent
                                content={distractor_map[letter]}
                                className="text-text-muted"
                              />
                            </>
                          )}
                          {rowCorrect && (
                            <>
                              <span className="text-text-muted">—</span>
                              <span className="font-medium text-primary">
                                Correct answer
                              </span>
                            </>
                          )}
                        </div>
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

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null | undefined;
}

export function HintModal({ isOpen, onClose, content }: HintModalProps) {
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

  if (!isOpen || content == null || String(content).trim() === "") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hint-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md bg-surface-mid text-primary">
              <Lightbulb className="h-5 w-5" aria-hidden />
            </div>
            <h2
              id="hint-modal-title"
              className="truncate text-lg font-semibold tracking-tight text-text"
            >
              Hint
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md bg-surface-mid text-text-muted transition-colors duration-fast ease-signature hover:bg-surface-neutral hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-subtle">
            Key insight
          </p>
          <div className={bodyPanelClass}>
            <MathContent content={content} className="text-inherit" />
          </div>
        </div>
      </div>
    </div>
  );
}
