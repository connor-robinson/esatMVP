"use client";

import { cn } from "@/lib/utils";

export interface NavigatorItem {
  index: number;
  answered: boolean;
  markedForReview: boolean;
  current: boolean;
}

interface QuestionNavigatorProps {
  items: NavigatorItem[];
  onJump: (index: number) => void;
}

export function QuestionNavigator({ items, onJump }: QuestionNavigatorProps) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {items.map((item) => (
          <button
            key={item.index}
            type="button"
            onClick={() => onJump(item.index)}
            aria-label={`Go to question ${item.index + 1}${
              item.answered ? ", answered" : ", not answered"
            }${item.markedForReview ? ", marked for review" : ""}`}
            aria-current={item.current ? "true" : undefined}
            className={cn(
              "relative flex h-10 w-full items-center justify-center rounded-organic-md text-sm font-semibold transition-colors duration-fast ease-signature",
              "focus-visible:outline-none focus-visible:shadow-glow-focus",
              item.current
                ? "bg-primary text-background"
                : item.answered
                  ? "bg-primary/15 text-text"
                  : "bg-surface-subtle text-text-muted hover:bg-surface hover:text-text",
            )}
          >
            {item.index + 1}
            {item.markedForReview ? (
              <span
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warning"
                aria-hidden
              />
            ) : null}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary/40" aria-hidden /> Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-surface-subtle" aria-hidden /> Unanswered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" aria-hidden /> Marked for review
        </span>
      </div>
    </div>
  );
}
