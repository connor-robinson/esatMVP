"use client";

import { useRef, KeyboardEvent } from "react";
import { Eye, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrimeFactorSlotsInputProps {
  slotCount: number;
  values: string[];
  onChange: (values: string[]) => void;
  onSubmit: () => void;
  showFeedback: boolean;
  isCorrect: boolean | null;
  answerRevealed: boolean;
  revealedValues: string[];
  disabled: boolean;
  onReveal?: () => void;
  onContinue?: () => void;
}

export function PrimeFactorSlotsInput({
  slotCount,
  values,
  onChange,
  onSubmit,
  showFeedback,
  isCorrect,
  answerRevealed,
  revealedValues,
  disabled,
  onReveal,
  onContinue,
}: PrimeFactorSlotsInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const displayValues = answerRevealed ? revealedValues : values;
  const hasAnyValue = values.some((v) => v.trim().length > 0);

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (values.every((v) => v.trim().length > 0) && !disabled) {
        onSubmit();
      }
      return;
    }

    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const next = [...values];
    next[index] = digits;
    onChange(next);

    if (digits.length > 0 && index < slotCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: slotCount }, (_, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-xl font-semibold text-text-muted select-none">×</span>
            )}
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              value={displayValues[index] ?? ""}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={disabled || (showFeedback && isCorrect === true)}
              readOnly={answerRevealed}
              autoComplete="off"
              aria-label={`Prime factor ${index + 1}`}
              className={cn(
                "h-14 w-16 rounded-2xl text-xl font-semibold text-center outline-none transition-all duration-75",
                showFeedback && isCorrect
                  ? "bg-primary/20 text-primary"
                  : showFeedback && isCorrect === false
                    ? "bg-error/20 text-error"
                    : "bg-surface-elevated text-text",
                (disabled || answerRevealed) && "cursor-not-allowed",
              )}
            />
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={onSubmit}
          disabled={
            (!hasAnyValue && !answerRevealed) ||
            (showFeedback && isCorrect === true)
          }
          className={cn(
            "flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition-all",
            showFeedback && isCorrect === false
              ? "bg-error/20 text-error hover:bg-error/30"
              : hasAnyValue && !showFeedback
                ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                : answerRevealed
                  ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                  : "bg-surface-elevated text-text-disabled cursor-not-allowed",
          )}
        >
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          <span>Submit</span>
        </button>
      </div>

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
