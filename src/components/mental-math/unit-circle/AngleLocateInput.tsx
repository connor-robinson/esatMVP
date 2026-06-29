"use client";

import { useCallback, useState } from "react";
import { Eye } from "lucide-react";
import type { AngleLocateAnswerInput, UnitCircleDiagramData } from "@/types/core";
import { nearestStandardAngle } from "@/lib/angles/angleData";
import { UnitCircle } from "./UnitCircle";
import { MathContent } from "@/components/shared/MathContent";
import { cn } from "@/lib/utils";

interface AngleLocateInputProps {
  config: AngleLocateAnswerInput;
  diagram: UnitCircleDiagramData;
  correctDegrees: number;
  showFeedback: boolean;
  isCorrect: boolean | null;
  answerRevealed: boolean;
  selectedDegrees: number | null;
  explanation?: string;
  onSelect: (degrees: number) => void;
  onReveal?: () => void;
  onContinue?: () => void;
}

export function AngleLocateInput({
  config,
  diagram,
  correctDegrees,
  showFeedback,
  isCorrect,
  answerRevealed,
  selectedDegrees,
  explanation,
  onSelect,
  onReveal,
  onContinue,
}: AngleLocateInputProps) {
  const [localSelected, setLocalSelected] = useState<number | null>(null);
  const tolerance = config.toleranceDeg ?? 18;

  const handleAngleSelect = useCallback(
    (clickDeg: number) => {
      if (showFeedback && isCorrect) return;
      if (answerRevealed) return;

      const { angle } = nearestStandardAngle(clickDeg);
      setLocalSelected(angle.degrees);
      onSelect(angle.degrees);
    },
    [showFeedback, isCorrect, answerRevealed, onSelect],
  );

  const displaySelected = selectedDegrees ?? localSelected;

  const feedback =
    showFeedback && isCorrect === false
      ? {
          showCorrect: true,
          correctDegrees,
          selectedDegrees: displaySelected ?? undefined,
        }
      : answerRevealed
        ? {
            showCorrect: true,
            correctDegrees,
            selectedDegrees: displaySelected ?? undefined,
          }
        : undefined;

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-4">
      <UnitCircle
        config={diagram.config}
        interactive={!showFeedback || isCorrect === false}
        onAngleSelect={handleAngleSelect}
        feedback={feedback}
        disabled={(showFeedback && isCorrect === true) || answerRevealed}
        className="w-full"
      />

      <p className="text-xs text-text-subtle text-center">
        Tap a position on the circle (within ~{tolerance}° of a standard angle)
      </p>

      {showFeedback && isCorrect === false && explanation && !answerRevealed && (
        <div className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-center">
          <MathContent
            content={explanation}
            className="text-sm leading-relaxed text-text-muted"
          />
        </div>
      )}

      {onReveal && showFeedback && isCorrect === false && !answerRevealed && (
        <button
          type="button"
          onClick={onReveal}
          className={cn(
            "flex items-center gap-2 rounded-xl bg-surface-elevated px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-text",
          )}
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
