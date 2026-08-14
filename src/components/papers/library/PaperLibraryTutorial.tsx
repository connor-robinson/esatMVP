"use client";

import { MousePointerClick, ChevronDown, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type PaperLibraryTutorialProps = {
  onDismiss: () => void;
  hasBasketItems: boolean;
  className?: string;
};

const STEPS = [
  {
    icon: MousePointerClick,
    text: "Click a paper to add it to your basket",
  },
  {
    icon: ChevronDown,
    text: "Expand a paper to pick individual sections",
  },
  {
    icon: ArrowRight,
    text: "Review your basket, then start your session",
  },
] as const;

export function PaperLibraryTutorial({
  onDismiss,
  hasBasketItems,
  className,
}: PaperLibraryTutorialProps) {
  return (
    <div
      className={cn(
        "relative rounded-organic-lg bg-primary/10 px-4 py-3.5 sm:px-5",
        className,
      )}
      role="region"
      aria-label="How to use the paper library"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-organic-sm text-text-muted transition-colors hover:bg-surface/60 hover:text-text"
        aria-label="Dismiss tutorial"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>

      <p className="pr-8 font-heading text-sm font-semibold text-text">
        How it works
      </p>

      <ol className="mt-2.5 space-y-2">
        {STEPS.map(({ icon: Icon, text }, index) => {
          const done = index === 0 && hasBasketItems;
          return (
            <li
              key={text}
              className={cn(
                "flex items-start gap-2.5 text-sm leading-snug transition-opacity",
                done ? "text-text-muted opacity-60" : "text-text",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums",
                  done
                    ? "bg-surface-mid text-text-muted"
                    : "bg-primary/20 text-primary",
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 items-start gap-1.5 pt-px">
                <Icon
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    done ? "text-text-muted" : "text-primary",
                  )}
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span>{text}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-xs font-medium text-text-muted transition-colors hover:text-text"
      >
        Got it, don&apos;t show again
      </button>
    </div>
  );
}
