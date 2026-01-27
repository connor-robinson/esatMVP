/**
 * Choice pill component for A-H selection
 */

import { cn } from "@/lib/utils";
import type { Letter } from "@/types/papers";

interface ChoicePillProps {
  letter: Letter;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "correct" | "wrong" | "guessed";
}

export function ChoicePill({ 
  letter, 
  selected = false, 
  onClick, 
  disabled = false,
  variant = "default" 
}: ChoicePillProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "correct":
        return "bg-success/20 text-success border border-success/30 hover:bg-success/25";
      case "wrong":
        return "bg-error/20 text-error border border-error/30 hover:bg-error/25";
      case "guessed":
        return "bg-warning/20 text-warning border border-warning/30 hover:bg-warning/25";
      default:
        return selected
          ? "bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary/30"
          : "bg-surface-subtle text-text border border-border hover:bg-surface-elevated hover:border-border-subtle";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-organic-md px-4 py-3 text-center text-base font-medium transition-all duration-fast ease-signature",
        "interaction-scale disabled:opacity-50 disabled:cursor-not-allowed",
        getVariantStyles(),
        selected && "shadow-lg shadow-secondary/10"
      )}
    >
      {letter}
    </button>
  );
}


