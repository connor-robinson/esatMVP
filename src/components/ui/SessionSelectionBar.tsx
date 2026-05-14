"use client";

/**
 * Floating session summary + actions. Uses theme tokens (`surface`, `border`,
 * `primary`, `text`) so light/dark stay consistent with the rest of the app.
 */

import { useState, useRef, useEffect } from "react";
import { Calculator, Clock, ListOrdered, ArrowRight, X } from "lucide-react";
import { getTopic } from "@/config/topics";
import type { TopicVariantSelection } from "@/types/core";
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
  /** Extra line under the main count (e.g. “3 drills selected”). */
  detailLine?: string;
  /** When set with `onRemoveDrill`, the list control opens a drill picker popover. */
  selectedDrills?: TopicVariantSelection[];
  onRemoveDrill?: (topicVariantId: string) => void;
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
  detailLine,
  selectedDrills,
  onRemoveDrill,
  className,
}: SessionSelectionBarProps) {
  const clearVisuallyMuted = clearDimmedWhenReady && canStartSession;
  const compact = density === "compact";
  const compactFigma = compact && compactVariant === "figma";
  const showDrillPopover = Boolean(
    compactFigma && selectedDrills && onRemoveDrill,
  );

  const [drillListOpen, setDrillListOpen] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDrillPopover) {
      setDrillListOpen(false);
      return;
    }
    if (!drillListOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        islandRef.current &&
        !islandRef.current.contains(e.target as Node)
      ) {
        setDrillListOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [drillListOpen, showDrillPopover]);

  useEffect(() => {
    if (!drillListOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrillListOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drillListOpen]);

  const countControl = (
    <span
      className={cn(
        "inline-flex items-center tabular-nums ring-1 ring-border-subtle",
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

  /** Mental-maths style: frosted island, session stats, drill list popover, actions. */
  if (compactFigma) {
    return (
      <div
        ref={islandRef}
        className={cn(
          "relative w-full max-w-[min(100%,28rem)] sm:w-max sm:max-w-[calc(100vw-2rem)]",
          className,
        )}
      >
        {drillListOpen && showDrillPopover ? (
          <div
            id="session-drill-popover"
            role="dialog"
            aria-label="Drills in this session"
            className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-[60] max-h-[min(55vh,22rem)] overflow-hidden rounded-organic-lg border border-border-subtle bg-surface-elevated shadow-2xl sm:left-auto sm:right-0 sm:w-[min(100%,20rem)]"
          >
            <div className="border-b border-border-subtle px-3 py-2.5">
              <p className="text-xs font-semibold text-text">Session drills</p>
              <p className="text-[11px] text-text-muted">
                Remove any drill; changes apply immediately.
              </p>
            </div>
            <ul className="scrollbar-hide max-h-[min(48vh,18rem)] overflow-y-auto p-2">
              {(selectedDrills ?? []).length === 0 ? (
                <li className="rounded-organic-md px-3 py-6 text-center text-sm text-text-muted">
                  No drills yet. Add drills from the grid.
                </li>
              ) : (
                (selectedDrills ?? []).map((sel) => {
                  const id = `${sel.topicId}-${sel.variantId}`;
                  const topic = getTopic(sel.topicId);
                  const variant = topic?.variants?.find(
                    (v) => v.id === sel.variantId,
                  );
                  const title = variant?.name ?? "Drill";
                  const topicName = topic?.name ?? "";

                  return (
                    <li
                      key={id}
                      className="flex items-start gap-2 rounded-organic-md px-2 py-2 hover:bg-surface-mid/80"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">
                          {title}
                        </p>
                        {topicName ? (
                          <p className="truncate text-[11px] text-text-muted">
                            {topicName}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveDrill?.(id)}
                        className="shrink-0 rounded-organic-sm p-1.5 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                        aria-label={`Remove ${title}`}
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 rounded-organic-xl bg-surface-elevated/45 p-3 shadow-bar-floating backdrop-blur-xl sm:flex-row sm:items-center sm:gap-4 sm:p-3.5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {showDrillPopover ? (
              <button
                type="button"
                onClick={() => setDrillListOpen((o) => !o)}
                aria-expanded={drillListOpen}
                aria-controls="session-drill-popover"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md transition-colors",
                  "text-primary hover:bg-primary/15",
                  drillListOpen && "bg-primary/18",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
                aria-label="View or remove drills in session"
              >
                <ListOrdered className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md bg-primary/12 text-primary"
                aria-hidden
              >
                <ListOrdered className="h-5 w-5" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Session length
              </p>
              {showQuestionInput ? (
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) =>
                      onQuestionCountChange(
                        Number(e.target.value) || questionCountMin,
                      )
                    }
                    min={questionCountMin}
                    max={questionCountMax}
                    className={cn(
                      "w-14 rounded-organic-sm border border-border bg-surface px-2 py-1.5 text-center text-base font-bold tabular-nums text-text outline-none transition-colors",
                      "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30 [appearance:textfield]",
                      "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    )}
                    aria-label="Number of questions"
                  />
                  <span className="text-sm font-medium text-text-muted">
                    {questionSuffix}
                  </span>
                </div>
              ) : (
                <p className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-xl font-bold tabular-nums leading-none text-text">
                    {questionCount}
                  </span>
                  <span className="text-sm font-medium text-text-muted">
                    {questionCount === 1 ? "question" : "questions"}
                  </span>
                </p>
              )}
              {detailLine ? (
                <p className="mt-1.5 text-xs leading-snug text-text-muted">
                  {detailLine}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 pt-1 sm:gap-3 sm:pt-0">
            <button
              type="button"
              onClick={onClearAll}
              disabled={clearDisabled}
              className={cn(
                "min-h-[2.75rem] min-w-[4.5rem] rounded-organic-md px-3 text-sm font-medium text-text-muted transition-colors",
                "hover:bg-surface-mid/80 hover:text-text",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                clearDisabled &&
                  "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-muted",
                !clearDisabled &&
                  clearVisuallyMuted &&
                  "text-text-subtle hover:text-text-muted",
              )}
            >
              {clearLabel}
            </button>
            <button
              type="button"
              onClick={onStart}
              disabled={!canStartSession}
              className={cn(
                "inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-organic-lg px-5 text-sm font-bold transition-all duration-fast ease-signature sm:flex-initial",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                "disabled:cursor-not-allowed",
                canStartSession
                  ? "bg-primary text-background shadow-md shadow-primary/25 hover:bg-primary-hover active:scale-[0.98]"
                  : "bg-surface-mid text-text-disabled [&_svg]:opacity-40",
              )}
            >
              {startLabel}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("w-max max-w-[min(20rem,calc(100vw-1.5rem))]", className)}>
        <div className="rounded-organic-xl border border-border bg-surface-elevated/95 p-2 shadow-bar-floating backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <div className="flex shrink-0 -space-x-2">
              <div
                className={cn(
                  "relative z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle text-background",
                  "bg-accent shadow-sm shadow-accent/30",
                )}
              >
                <Calculator className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div
                className={cn(
                  "relative z-20 flex h-7 w-7 items-center justify-center rounded-lg",
                  "border border-border-subtle bg-surface-mid text-text shadow-sm",
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
                  "relative z-10 flex h-9 w-9 items-center justify-center rounded-organic-lg border border-border-subtle text-background",
                  "bg-accent shadow-badge-mint",
                )}
              >
                <Calculator className="h-5 w-5" aria-hidden />
              </div>
              <div
                className={cn(
                  "relative z-20 flex h-9 w-9 items-center justify-center rounded-organic-lg",
                  "border border-border-subtle bg-surface-mid text-text shadow-sm",
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
