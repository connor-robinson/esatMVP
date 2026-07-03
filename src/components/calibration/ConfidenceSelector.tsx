"use client";

import { cn } from "@/lib/utils";

const LEVELS: { value: number; label: string; short: string }[] = [
  { value: 1, label: "Guessing", short: "Guess" },
  { value: 2, label: "Low confidence", short: "Low" },
  { value: 3, label: "Unsure", short: "Unsure" },
  { value: 4, label: "Confident", short: "Confident" },
  { value: 5, label: "Very confident", short: "Very" },
];

interface ConfidenceSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
}

/** Compact five-point confidence selector shown once an answer is chosen. */
export function ConfidenceSelector({ value, onChange }: ConfidenceSelectorProps) {
  return (
    <div className="mt-5" role="group" aria-label="How confident are you in this answer?">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        How confident are you?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {LEVELS.map((level) => {
          const active = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              aria-pressed={active}
              aria-label={level.label}
              className={cn(
                "rounded-organic-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-signature",
                "focus-visible:outline-none focus-visible:shadow-glow-focus",
                active
                  ? "bg-primary text-background"
                  : "bg-surface-subtle text-text-muted hover:bg-surface hover:text-text",
              )}
            >
              <span className="hidden sm:inline">{level.label}</span>
              <span className="sm:hidden">{level.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
