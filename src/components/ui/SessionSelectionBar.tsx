"use client";

/**
 * Floating session summary + actions. Uses theme tokens (`surface-elevated`,
 * `primary`, `text`) so light/dark stay consistent with the rest of the app.
 */

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calculator,
  Clock,
  ListOrdered,
  ArrowRight,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getTopic } from "@/config/topics";
import type { TopicVariantSelection } from "@/types/core";
import { cn } from "@/lib/utils";

/** White label + light depth on primary buttons (dark theme). */
const PRIMARY_CTA_LABEL_DARK =
  "dark:text-white dark:[text-shadow:0_0.5px_1px_rgba(0,0,0,0.55),0_1px_2px_rgba(0,0,0,0.35)] dark:hover:text-white";

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
  /** When false, hides the “Clear all” control (compact figma island). */
  showClearAll?: boolean;
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
  showClearAll = true,
  className,
}: SessionSelectionBarProps) {
  const clearVisuallyMuted = clearDimmedWhenReady && canStartSession;
  const compact = density === "compact";
  const compactFigma = compact && compactVariant === "figma";
  const showDrillPopover = Boolean(
    compactFigma && selectedDrills && onRemoveDrill,
  );
  const drillSessionCount = selectedDrills?.length ?? 0;

  const [drillListOpen, setDrillListOpen] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);
  const figmaPlainCount = compactFigma && !showQuestionInput;
  const [countDraft, setCountDraft] = useState(() => String(questionCount));
  const countInputFocused = useRef(false);

  useEffect(() => {
    if (!figmaPlainCount) return;
    if (countInputFocused.current) return;
    setCountDraft(String(questionCount));
  }, [questionCount, figmaPlainCount]);

  const bumpQuestionCount = (delta: number) => {
    onQuestionCountChange(
      Math.min(
        questionCountMax,
        Math.max(questionCountMin, questionCount + delta),
      ),
    );
  };

  /** Minimal ↑↓ for mental-maths island (compact figma). */
  const figmaCountStepper = (
    <div
      className="flex shrink-0 flex-col"
      role="group"
      aria-label="Adjust number of questions"
    >
      <button
        type="button"
        onClick={() => bumpQuestionCount(1)}
        disabled={questionCount >= questionCountMax}
        className={cn(
          "flex h-[22px] w-7 items-center justify-center rounded-t-organic-sm text-text-muted transition-colors",
          "hover:bg-surface-mid/80 hover:text-text active:bg-surface-neutral/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
          "disabled:pointer-events-none disabled:opacity-20",
        )}
        aria-label="Increase number of questions"
      >
        <ChevronUp className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => bumpQuestionCount(-1)}
        disabled={questionCount <= questionCountMin}
        className={cn(
          "flex h-[22px] w-7 items-center justify-center rounded-b-organic-sm text-text-muted transition-colors",
          "hover:bg-surface-mid/80 hover:text-text active:bg-surface-neutral/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
          "disabled:pointer-events-none disabled:opacity-20",
        )}
        aria-label="Decrease number of questions"
      >
        <ChevronDown className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );

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

  /** Mental-maths style: session island + drill list as one elevated surface. */
  if (compactFigma) {
    return (
      <div
        ref={islandRef}
        className={cn(
          "relative w-full max-w-[min(100%,28rem)] sm:w-max sm:max-w-[calc(100vw-2rem)]",
          className,
        )}
      >
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-organic-xl bg-surface-elevated",
            /** Solid “stamp” shadow (no soft multi-layer blur). */
            "shadow-[0_5px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_7px_0_0_rgba(0,0,0,0.38)]",
            "transition-[box-shadow,transform] duration-200 ease-signature",
          )}
        >
          <AnimatePresence initial={false}>
            {drillListOpen && showDrillPopover && (
              <motion.div
                key="session-drill-popover"
                id="session-drill-popover"
                role="dialog"
                aria-label="Drills in this session"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{
                  duration: 0.2,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className="flex max-h-[min(52vh,20rem)] w-full shrink-0 flex-col border-b border-border-subtle/50 bg-surface-elevated"
              >
                <p className="px-4 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  In session
                </p>
                <ul className="scrollbar-hide max-h-[min(44vh,15rem)] min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                  {(selectedDrills ?? []).length === 0 ? (
                    <li className="rounded-organic-md px-3 py-8 text-center text-xs leading-relaxed text-text-muted">
                      No drills yet — add from the grid.
                    </li>
                  ) : (
                    (selectedDrills ?? []).map((sel, index) => {
                      const id = `${sel.topicId}-${sel.variantId}`;
                      const topic = getTopic(sel.topicId);
                      const variant = topic?.variants?.find(
                        (v) => v.id === sel.variantId,
                      );
                      const title = variant?.name ?? "Drill";
                      const topicName = topic?.name ?? "";

                      return (
                        <li key={id}>
                          <div className="flex items-center gap-2 rounded-organic-md py-2 pl-1.5 pr-1 transition-colors duration-150 ease-out hover:bg-surface-mid/70">
                            <span
                              className="flex w-7 shrink-0 justify-end pr-0.5 text-xs font-bold tabular-nums leading-none text-text-muted"
                              aria-hidden
                            >
                              {index + 1}.
                            </span>
                            <div className="min-w-0 flex-1 py-0.5">
                              <p className="truncate text-[13px] font-medium leading-snug text-text">
                                {title}
                              </p>
                              {topicName ? (
                                <p className="truncate text-[11px] text-text-subtle">
                                  {topicName}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveDrill?.(id)}
                              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-organic-lg text-text-muted transition-all duration-150 ease-out hover:bg-surface-mid hover:text-text active:scale-[0.94] active:bg-surface-neutral/90"
                              aria-label={`Remove ${title}`}
                            >
                              <X className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-3.5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="relative shrink-0">
                {drillSessionCount > 0 ? (
                  <span
                    className="pointer-events-none absolute -left-1 -top-1 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold tabular-nums leading-none text-background shadow-sm"
                    aria-hidden
                  >
                    {drillSessionCount > 99 ? "99+" : drillSessionCount}
                  </span>
                ) : null}
                {showDrillPopover ? (
                  <button
                    type="button"
                    onClick={() => setDrillListOpen((o) => !o)}
                    aria-expanded={drillListOpen}
                    aria-controls="session-drill-popover"
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-organic-md transition-all duration-200 ease-signature",
                      "text-primary hover:bg-primary/12",
                      drillListOpen && "scale-[1.02] bg-primary/14 text-primary",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    )}
                    aria-label={`View or remove drills in session${drillSessionCount > 0 ? `, ${drillSessionCount} selected` : ""}`}
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
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Session length
                </p>
                {showQuestionInput ? (
                  <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
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
                    {figmaCountStepper}
                  </div>
                ) : (
                  <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={3}
                        value={countDraft}
                        onFocus={() => {
                          countInputFocused.current = true;
                          setCountDraft(String(questionCount));
                        }}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 3);
                          setCountDraft(digits);
                          if (digits === "") return;
                          const n = parseInt(digits, 10);
                          if (Number.isNaN(n)) return;
                          onQuestionCountChange(
                            Math.min(
                              questionCountMax,
                              Math.max(questionCountMin, n),
                            ),
                          );
                        }}
                        onBlur={() => {
                          countInputFocused.current = false;
                          if (countDraft === "" || !/^\d+$/.test(countDraft)) {
                            onQuestionCountChange(questionCountMin);
                            setCountDraft(String(questionCountMin));
                            return;
                          }
                          const n = parseInt(countDraft, 10);
                          const clamped = Math.min(
                            questionCountMax,
                            Math.max(questionCountMin, n),
                          );
                          onQuestionCountChange(clamped);
                          setCountDraft(String(clamped));
                        }}
                        className={cn(
                          "min-w-[2.25rem] max-w-[4.25rem] shrink-0 cursor-text bg-transparent p-0 text-left text-xl font-bold tabular-nums leading-none text-primary",
                          "rounded-organic-sm border-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                        )}
                        aria-label="Number of questions"
                      />
                      <span className="text-sm font-medium text-text-muted">
                        {questionCount === 1 ? "question" : "questions"}
                      </span>
                    </div>
                    {figmaCountStepper}
                  </div>
                )}
              </div>
            </div>

            <div
              className={cn(
                "flex shrink-0 items-center gap-2 pt-0.5 sm:gap-3 sm:pt-0",
                showClearAll ? "justify-between" : "justify-end",
              )}
            >
              {showClearAll ? (
                <button
                  type="button"
                  onClick={onClearAll}
                  disabled={clearDisabled}
                  className={cn(
                    "min-h-[2.75rem] min-w-[4.5rem] rounded-organic-md px-3 text-sm font-medium text-text-muted transition-colors duration-150 ease-out",
                    "hover:bg-surface-mid/60 hover:text-text",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated",
                    clearDisabled &&
                      "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-muted",
                    !clearDisabled &&
                      clearVisuallyMuted &&
                      "text-text-subtle hover:text-text-muted",
                  )}
                >
                  {clearLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onStart}
                disabled={!canStartSession}
                className={cn(
                  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-organic-lg px-5 text-sm font-bold transition-all duration-200 ease-signature",
                  showClearAll ? "flex-1 sm:flex-initial" : "w-full min-w-0 flex-1 sm:w-auto sm:min-w-[12rem]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated",
                  "disabled:cursor-not-allowed",
                  canStartSession
                    ? cn(
                        "bg-primary text-background shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.97]",
                        PRIMARY_CTA_LABEL_DARK,
                      )
                    : "bg-surface-mid text-text-disabled [&_svg]:opacity-40",
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
                    ? cn(
                        "bg-primary text-background shadow-sm shadow-primary/25 hover:bg-primary-hover active:scale-[0.98]",
                        PRIMARY_CTA_LABEL_DARK,
                      )
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
                  ? cn(
                      "bg-primary text-background shadow-md shadow-primary/30 hover:bg-primary-hover hover:text-background active:scale-[0.98]",
                      PRIMARY_CTA_LABEL_DARK,
                    )
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
