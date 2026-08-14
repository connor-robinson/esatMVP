"use client";

import { cn } from "@/lib/utils";

type LibraryTutorialSkipProps = {
  onSkip: () => void;
  className?: string;
};

/** Lightweight skip control for the interactive library walkthrough. */
export function LibraryTutorialSkip({
  onSkip,
  className,
}: LibraryTutorialSkipProps) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className={cn(
        "font-heading text-xs font-medium text-text-muted transition-colors hover:text-text",
        className,
      )}
    >
      Skip tutorial
    </button>
  );
}
