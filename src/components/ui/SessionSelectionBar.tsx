"use client";

/**
 * Figma "Bars" section `219:594` — Start Bar / Selected Start Bar composite.
 * Tokens: background n50, surface n100 overlay, CTA idle n200 + muted text, CTA ready primaryHover (greenDark) + black label.
 */

import { Calculator, Clock, ListOrdered, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SessionSelectionBarProps {
  /** Ignored when `density="compact"` and `compactVariant="figma"`. */
  selectionTitle?: string;
  questionCount: number;
  onQuestionCountChange: (n: number) => void;
  questionCountMin?: number;
  questionCountMax?: number;
  canStartSession: boolean;
  onClearAll: () => void;
  onStart: () => void;
  startLabel?: string;
  clearLabel?: string;
  questionSuffix?: string;
  /** When true, "Clear all" is dimmed (Figma Selected Start Bar). */
  clearDimmedWhenReady?: boolean;
  clearDisabled?: boolean;
  /**
   * `full` — wide centered bar (Figma Bars spec).
   * `compact` — floating chip; use `compactVariant` for layout.
   */
  density?: "full" | "compact";
  /**
   * `icons` — calculator + clock + drill/question lines (dense).
   * `figma` — mental maths drill screen: one row, “N Questions selected”, underlined Clear all, pill CTA (matches Figma).
   */
  compactVariant?: "icons" | "figma";
  /** For figma compact bar, hides the numeric input and shows plain count text. */
  showQuestionInput?: boolean;
  className?: string;
}

export function SessionSelectionBar({
  selectionTitle = "",
  questionCount,
  onQuestionCountChange,
  questionCountMin = 1,
  questionCountMax = 100,
  canStartSession,
  onClearAll,
  onStart,
  startLabel = "Review & start session",
  clearLabel = "Clear all",
  questionSuffix = "questions",
  clearDimmedWhenReady = true,
  clearDisabled = false,
  density = "full",
  compactVariant = "figma",
  showQuestionInput = true,
  className,
}: SessionSelectionBarProps) {
  const clearVisuallyMuted = clearDimmedWhenReady && canStartSession;
  const compact = density === "compact";
  const compactFigma = compact && compactVariant === "figma";

  const countControl = (
    <span
      className={cn(
        "inline-flex items-center tabular-nums ring-1 ring-white/5",
        compact
          ? "gap-1 rounded-md bg-surface-elevated px-1.5 py-0.5"
          : "gap-1.5 rounded-lg bg-surface-elevated px-2 py-1",
      )}
    >
      <input
        type="number"
        value={questionCount}
        onChange={(e) =>
          onQuestionCountChange(Number(e.target.value) || questionCountMin)
        }
        min={questionCountMin}
        max={questionCountMax}
        className={cn(
          "border-0 bg-transparent p-0 text-center font-bold leading-none text-text outline-none",
          "focus:ring-0 [appearance:textfield]",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          compact ? "w-8 text-xs" : "min-w-[2.25rem] text-sm",
        )}
        aria-label="Number of questions"
      />
      <span
        className={cn(
          "font-normal text-text-muted/80",
          compact ? "text-[10px]" : "",
        )}
      >
        {questionSuffix}
      </span>
    </span>
  );

  /** Figma mental-maths drill: wide pill, questions-first, no icon clutter. */
  if (compactFigma) {
    return (
      <div
        className={cn("w-max max-w-[calc(100vw-2rem)]", className)}
      >
        <div
          className={cn(
            "flex items-center gap-4 rounded-full border border-border-subtle/70 bg-surface px-4 py-2.5",
            "shadow-bar-floating backdrop-blur-md",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
            <p className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-text">
              {showQuestionInput ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) =>
                      onQuestionCountChange(Number(e.target.value) || questionCountMin)
                    }
                    min={questionCountMin}
                    max={questionCountMax}
                    className={cn(
                      "w-11 rounded-md border border-border-subtle bg-surface-elevated px-1.5 py-0.5 text-center text-sm font-semibold text-text outline-none",
                      "focus-visible:ring-2 focus-visible:ring-primary/40 [appearance:textfield]",
                      "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    )}
                    aria-label="Number of questions"
                  />
                  <span>Questions Selected</span>
                </span>
              ) : (
                <span className="tabular-nums">{questionCount} Questions Selected</span>
              )}
            </p>
            <button
              type="button"
              onClick={onClearAll}
              disabled={clearDisabled}
              className={cn(
                "shrink-0 text-sm font-normal underline decoration-text-muted/80 underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm",
                clearDisabled && "cursor-not-allowed opacity-40 no-underline",
                !clearDisabled &&
                  (clearVisuallyMuted
                    ? "text-text-muted/50"
                    : "text-text-muted hover:text-text"),
              )}
            >
              {clearLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={!canStartSession}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-fast ease-signature",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed",
              canStartSession
                ? "bg-primary text-background shadow-md shadow-primary/30 hover:bg-primary-hover hover:text-background active:scale-[0.98]"
                : "bg-surface-elevated text-text/50 [&_svg]:opacity-30",
            )}
          >
            {startLabel}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("w-max max-w-[min(20rem,calc(100vw-1.5rem))]", className)}>
        <div className="rounded-2xl border border-border-subtle/60 bg-surface/95 p-2 shadow-lg shadow-black/40 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <div className="flex shrink-0 -space-x-2">
              <div
                className={cn(
                  "relative z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-background",
                  "bg-accent shadow-sm shadow-accent/30",
                )}
              >
                <Calculator className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div
                className={cn(
                  "relative z-20 flex h-7 w-7 items-center justify-center rounded-lg",
                  "border border-white/10 bg-surface-mid text-text shadow-sm",
                )}
              >
                <Clock className="h-3 w-3 text-text-muted" aria-hidden />
              </div>
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[11px] font-bold text-text">{selectionTitle}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
                <ListOrdered className="h-2.5 w-2.5 shrink-0 opacity-50" aria-hidden />
                {countControl}
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onClearAll}
                disabled={clearDisabled}
                className={cn(
                  "rounded px-1 text-[10px] font-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  clearDisabled && "cursor-not-allowed opacity-40",
                  !clearDisabled &&
                    (clearVisuallyMuted
                      ? "text-text-muted/50"
                      : "text-text hover:text-text-muted"),
                )}
              >
                {clearLabel}
              </button>
              <button
                type="button"
                onClick={onStart}
                disabled={!canStartSession}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all duration-fast ease-signature",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "disabled:cursor-not-allowed",
                  canStartSession
                    ? "bg-primary text-background shadow-sm shadow-primary/25 hover:bg-primary-hover active:scale-[0.98]"
                    : "bg-surface-elevated text-text/50 [&_svg]:opacity-30",
                )}
              >
                <span className="max-w-[9rem] truncate">{startLabel}</span>
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-4xl px-4", className)}>
      <div className="rounded-organic-xl bg-background p-0">
        <div
          className={cn(
            "flex flex-col gap-4 rounded-organic-xl bg-surface px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6",
            "shadow-bar-floating border border-border-subtle/50",
          )}
        >
          <div className="flex w-full items-center gap-4 md:w-auto">
            <div className="flex -space-x-3 shrink-0">
              <div
                className={cn(
                  "relative z-10 flex h-9 w-9 items-center justify-center rounded-organic-lg border border-white/10 text-background",
                  "bg-accent shadow-badge-mint",
                )}
              >
                <Calculator className="h-5 w-5" aria-hidden />
              </div>
              <div
                className={cn(
                  "relative z-20 flex h-9 w-9 items-center justify-center rounded-organic-lg",
                  "border border-white/10 bg-surface-mid text-text shadow-sm",
                )}
              >
                <Clock className="h-4 w-4 text-text-muted" aria-hidden />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold leading-[1.27] text-text">{selectionTitle}</h2>
              <p className="mt-0.5 flex items-center gap-2 text-[11px] text-text-muted">
                <ListOrdered className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
                {countControl}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-shrink-0 items-center justify-end gap-4 md:w-auto">
            <button
              type="button"
              onClick={onClearAll}
              disabled={clearDisabled}
              className={cn(
                "text-sm font-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm",
                clearDisabled && "opacity-40 cursor-not-allowed",
                !clearDisabled &&
                  (clearVisuallyMuted ? "text-text-muted/50" : "text-text hover:text-text-muted"),
              )}
            >
              {clearLabel}
            </button>

            <button
              type="button"
              onClick={onStart}
              disabled={!canStartSession}
              className={cn(
                "inline-flex min-h-[2.45rem] items-center gap-2 rounded-organic-lg px-5 py-2 text-sm font-bold transition-all duration-fast ease-signature",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:cursor-not-allowed",
                canStartSession
                  ? "bg-primary text-background shadow-md shadow-primary/30 hover:bg-primary-hover hover:text-background active:scale-[0.98]"
                  : "bg-surface-elevated text-text/50 [&_svg]:opacity-30",
              )}
            >
              {startLabel}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
