"use client";

import { MathContent } from "@/components/shared/MathContent";
import { cn } from "@/lib/utils";
import {
  getPastPaperOptionLetters,
  shouldRenderPastPaperAsText,
} from "@/lib/papers/pastPaperTextMode";
import type { Letter, Question } from "@/types/papers";

interface PastPaperTextQuestionProps {
  question: Question;
  questionNumber: number;
  className?: string;
  /** When set, render selectable option rows (solve mode) */
  selectedChoice?: Letter | null;
  onChoiceSelect?: (letter: Letter) => void;
  showOptionsBelow?: boolean;
  showStem?: boolean;
}

export function PastPaperTextQuestion({
  question,
  questionNumber,
  className,
  selectedChoice,
  onChoiceSelect,
  showOptionsBelow = false,
  showStem = true,
}: PastPaperTextQuestionProps) {
  if (!shouldRenderPastPaperAsText(question) || !question.questionStem) {
    return null;
  }
  if (!showStem && !showOptionsBelow) {
    return null;
  }

  const letters = getPastPaperOptionLetters(question);
  const options = question.options ?? {};

  return (
    <div className={cn("w-full max-w-3xl mx-auto space-y-6 px-4 py-6", className)}>
      {showStem && (
        <>
          <div className="text-sm font-semibold text-text-muted tabular-nums">
            {questionNumber}.
          </div>
          <div className="text-base leading-relaxed text-text">
            <MathContent content={question.questionStem} className="text-inherit" />
          </div>
        </>
      )}

      {showOptionsBelow && (
        <div className="flex flex-col gap-2.5 pt-2">
          {letters.map((letter) => {
            const text = options[letter as Letter];
            if (!text) return null;
            const selected = selectedChoice === letter;
            const interactive = Boolean(onChoiceSelect);
            return (
              <button
                key={letter}
                type="button"
                disabled={!interactive}
                onClick={() => onChoiceSelect?.(letter as Letter)}
                className={cn(
                  "w-full rounded-organic-md px-3.5 py-2.5 text-left transition-all duration-fast",
                  interactive && "cursor-pointer",
                  selected
                    ? "bg-primary text-background"
                    : interactive
                      ? "bg-surface-mid text-text hover:bg-surface-neutral"
                      : "bg-surface-mid text-text",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 shrink-0 text-sm font-semibold tabular-nums">
                    {letter}
                  </span>
                  <div className="min-w-0 flex-1 text-[0.98rem] leading-relaxed">
                    <MathContent content={text} className="text-inherit" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
