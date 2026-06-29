"use client";

import { useRef } from "react";
import { KatexInput } from "../KatexInput";

interface RadianInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReveal?: () => void;
  onContinue?: () => void;
  showFeedback: boolean;
  isCorrect: boolean | null;
  answerRevealed: boolean;
  disabled?: boolean;
}

export function RadianInput({
  value,
  onChange,
  onSubmit,
  onReveal,
  showFeedback,
  isCorrect,
  answerRevealed,
  disabled = false,
}: RadianInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <KatexInput
        ref={inputRef}
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        onReveal={onReveal}
        placeholder="e.g. 3π/4"
        disabled={(showFeedback && isCorrect === true) || disabled || answerRevealed}
        showReveal={!answerRevealed && showFeedback && isCorrect === false}
        hasError={showFeedback && isCorrect === false}
        autoFocus={!showFeedback && !answerRevealed}
      />
      <p className="text-xs text-text-subtle">Use π and fractions — e.g. pi/6, 3pi/4, 2π</p>
    </div>
  );
}
