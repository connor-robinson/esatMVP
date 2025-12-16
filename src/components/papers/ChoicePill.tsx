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
        return "bg-success/20 text-success ring-success/40";
      case "wrong":
        return "bg-error/20 text-error ring-error/40";
      case "guessed":
        return "bg-warning/20 text-warning ring-warning/40";
      default:
        return selected
          ? "bg-primary text-neutral-900 ring-primary/40"
          : "bg-white/5 text-neutral-100 ring-white/10 hover:bg-white/10 hover:ring-white/20";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-organic-md px-4 py-3 text-center text-base font-medium ring-1 transition-all duration-fast ease-signature",
        "interaction-scale disabled:opacity-50 disabled:cursor-not-allowed",
        getVariantStyles(),
        selected && "shadow-glow"
      )}
    >
      {letter}
    </button>
  );
}


