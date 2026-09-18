"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MistakeHistoryEvent } from "@/lib/papers/mistakes";

function formatHistoryDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MistakeQuestionHistoryStrip({
  events,
  className,
}: {
  events: MistakeHistoryEvent[];
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const ordered = [...events].sort((a, b) => a.at - b.at).slice(-16);

  if (ordered.length === 0) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-organic-lg bg-surface-elevated text-xs text-text-muted",
          className,
        )}
      >
        <span className="px-3 py-2.5 font-medium">Question history</span>
        <span className="h-6 w-px shrink-0 bg-surface-mid" aria-hidden />
        <span className="px-3 py-2.5 text-text-subtle">No attempts yet</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex max-w-full items-center rounded-organic-lg bg-surface-elevated text-xs text-text-muted",
        className,
      )}
    >
      <span className="shrink-0 px-3 py-2.5 font-medium">Question history</span>
      <span className="h-6 w-px shrink-0 bg-surface-mid" aria-hidden />
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5">
        {ordered.map((event, i) => {
          const label = event.isCorrect
            ? `Answered correct, ${formatHistoryDate(event.at)}`
            : `Answered incorrect, ${formatHistoryDate(event.at)}`;
          return (
            <button
              key={`${event.sessionId}-${event.at}-${i}`}
              type="button"
              className={cn(
                "relative h-3.5 w-3.5 shrink-0 rounded-[3px] transition-transform hover:scale-110",
                event.isCorrect ? "bg-success" : "bg-error",
              )}
              aria-label={label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            />
          );
        })}
      </div>
      {hovered != null && ordered[hovered] ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-organic-md bg-background px-3 py-2 text-[11px] font-medium leading-snug text-text shadow-lg"
        >
          {ordered[hovered].isCorrect
            ? "Answered correct,"
            : "Answered incorrect,"}{" "}
          {formatHistoryDate(ordered[hovered].at)}
          <span
            className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-background"
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  );
}
