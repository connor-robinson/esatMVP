"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type MistakeHistoryStripEvent = {
  at: number;
  isCorrect: boolean;
  sessionId: string;
};

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
  variant = "default",
  title,
}: {
  events: MistakeHistoryStripEvent[];
  className?: string;
  /** Header chrome: light pill on purple/blue Pearson bar. */
  variant?: "default" | "header";
  /** Native tooltip, e.g. paper + wrong-count meta. */
  title?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const ordered = [...events].sort((a, b) => b.at - a.at).slice(0, 16);
  const isHeader = variant === "header";

  const shellClass = isHeader
    ? "relative inline-flex max-w-[min(420px,42vw)] items-center rounded-[3px] bg-white text-[11px] text-black"
    : "relative inline-flex max-w-full items-center rounded-organic-lg bg-white text-xs text-neutral-700";

  const dividerClass = isHeader
    ? "h-4 w-px shrink-0 bg-black/20"
    : "h-6 w-px shrink-0 bg-neutral-200";

  const labelPad = isHeader ? "px-2 py-1 font-medium" : "px-3 py-2.5 font-medium";
  const squaresPad = isHeader ? "gap-1 px-2 py-1" : "gap-1.5 px-3 py-2.5";
  const squareClass = isHeader
    ? "relative h-3 w-3 shrink-0 rounded-[2px]"
    : "relative h-3.5 w-3.5 shrink-0 rounded-[3px] transition-transform hover:scale-110";

  const emptyBody = (
    <>
      <span className={labelPad}>Question history</span>
      <span className={dividerClass} aria-hidden />
      <span className={cn(labelPad, isHeader ? "text-black/55" : "text-neutral-500")}>
        No attempts yet
      </span>
    </>
  );

  if (ordered.length === 0) {
    return (
      <div className={cn(shellClass, className)} data-theme="light" title={title}>
        {emptyBody}
      </div>
    );
  }

  return (
    <div className={cn(shellClass, className)} data-theme="light" title={title}>
      <span className={cn(labelPad, "shrink-0")}>Question history</span>
      <span className={dividerClass} aria-hidden />
      <div className={cn("flex items-center overflow-x-auto", squaresPad)}>
        {ordered.map((event, i) => {
          const label = event.isCorrect
            ? `Answered correct, ${formatHistoryDate(event.at)}`
            : `Answered incorrect, ${formatHistoryDate(event.at)}`;
          return (
            <button
              key={`${event.sessionId}-${event.at}-${i}`}
              type="button"
              className={cn(
                squareClass,
                event.isCorrect ? "bg-[#2e7d32]" : "bg-[#c62828]",
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
          className={cn(
            "pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap bg-white px-2.5 py-1.5 text-[11px] font-medium leading-snug text-black shadow-md",
            isHeader ? "top-full mt-1.5 rounded-[3px]" : "top-full mt-2 rounded-organic-md",
          )}
        >
          {ordered[hovered].isCorrect
            ? "Answered correct,"
            : "Answered incorrect,"}{" "}
          {formatHistoryDate(ordered[hovered].at)}
          <span
            className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white"
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  );
}
