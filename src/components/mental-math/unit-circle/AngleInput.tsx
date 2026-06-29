"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { Eye, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AngleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReveal?: () => void;
  onContinue?: () => void;
  showFeedback: boolean;
  isCorrect: boolean | null;
  answerRevealed: boolean;
  revealedAnswer: string;
  disabled?: boolean;
}

export function AngleInput({
  value,
  onChange,
  onSubmit,
  onReveal,
  onContinue,
  showFeedback,
  isCorrect,
  answerRevealed,
  revealedAnswer,
  disabled = false,
}: AngleInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showFeedback && !answerRevealed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showFeedback, answerRevealed]);

  const displayRevealed = revealedAnswer.includes("°")
    ? revealedAnswer
    : `${revealedAnswer}°`;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={answerRevealed ? displayRevealed.replace(/°$/, "") : value}
          onChange={(e) => onChange(e.target.value.replace(/°/g, ""))}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 135"
          aria-label="Angle in degrees"
          className={cn(
            "w-full h-16 text-2xl font-semibold rounded-2xl border-0 outline-none transition-all duration-75",
            showFeedback && isCorrect
              ? "bg-primary/20 text-primary"
              : showFeedback && isCorrect === false
                ? "bg-error/20 text-error"
                : "bg-surface-elevated text-text",
            "placeholder:text-text-disabled placeholder:text-base placeholder:font-medium",
            (showFeedback && isCorrect) || answerRevealed ? "cursor-not-allowed" : "",
          )}
          style={{
            textAlign: "center",
            paddingLeft: "4.5rem",
            paddingRight: "4.5rem",
            lineHeight: "4rem",
            height: "4rem",
          }}
          autoComplete="off"
          disabled={(showFeedback && isCorrect === true) || disabled}
          readOnly={answerRevealed}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {onReveal && showFeedback && isCorrect === false && !answerRevealed && (
            <button
              type="button"
              onClick={onReveal}
              className="p-2 rounded-xl bg-surface-elevated text-text-muted hover:bg-surface hover:text-text transition-all"
              title="Reveal answer"
            >
              <Eye className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={
              (!value.trim() && !answerRevealed) || (showFeedback && isCorrect === true)
            }
            className={cn(
              "p-3 rounded-xl transition-all",
              showFeedback && isCorrect === false
                ? "bg-error/20 text-error hover:bg-error/30"
                : value.trim() && !showFeedback
                  ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                  : answerRevealed
                    ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                    : "bg-surface-elevated text-text-disabled cursor-not-allowed",
            )}
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
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
