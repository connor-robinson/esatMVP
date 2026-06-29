"use client";

import { Eye } from "lucide-react";
import type { BinaryChoiceAnswerInput } from "@/types/core";
import { cn } from "@/lib/utils";

interface BinaryChoiceInputProps {
  config: BinaryChoiceAnswerInput;
  selectedId: string | null;
  correctId: string | null;
  showFeedback: boolean;
  isCorrect: boolean | null;
  answerRevealed: boolean;
  disabled: boolean;
  hint?: string;
  onSelect: (choiceId: string) => void;
  onReveal?: () => void;
  onContinue?: () => void;
}

export function BinaryChoiceInput({
  config,
  selectedId,
  correctId,
  showFeedback,
  isCorrect,
  answerRevealed,
  disabled,
  hint,
  onSelect,
  onReveal,
  onContinue,
}: BinaryChoiceInputProps) {
  const [left, right] = config.choices;

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-4">
      <div className="flex w-full gap-4">
        {[left, right].map((choice) => {
          const isSelected = selectedId === choice.id;
          const isCorrectChoice =
            answerRevealed || (showFeedback && isCorrect)
              ? correctId === choice.id
              : false;
          const isWrongSelected = showFeedback && isCorrect === false && isSelected && !isCorrectChoice;

          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onSelect(choice.id)}
              disabled={disabled || (showFeedback && isCorrect === true)}
              className={cn(
                "flex h-20 flex-1 items-center justify-center rounded-2xl text-xl font-bold transition-all duration-75 active:scale-[0.98]",
                isWrongSelected
                  ? "bg-error/20 text-error"
                  : isCorrectChoice && (showFeedback || answerRevealed)
                    ? "bg-primary/20 text-primary"
                    : isSelected && !showFeedback
                      ? "bg-surface-mid text-text"
                      : "bg-surface-elevated text-text hover:bg-surface-mid",
                disabled || (showFeedback && isCorrect === true) ? "cursor-not-allowed" : "",
              )}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      {hint && showFeedback && isCorrect === false && !answerRevealed && (
        <div className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Hint</p>
          <p className="text-sm leading-relaxed text-text-muted">{hint}</p>
        </div>
      )}

      {onReveal && showFeedback && isCorrect === false && !answerRevealed && (
        <button
          type="button"
          onClick={onReveal}
          className="flex items-center gap-2 rounded-xl bg-surface-elevated px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text"
        >
          <Eye className="h-4 w-4" strokeWidth={2} />
          Reveal answer
        </button>
      )}

      {answerRevealed && onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-primary/20 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/30"
        >
          Continue
        </button>
      )}
    </div>
  );
}
