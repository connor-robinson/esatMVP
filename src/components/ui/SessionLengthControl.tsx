"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SessionLengthMode = "questions" | "time";

const FIGMA_SESSION_LABEL = "text-session-green dark:text-text";

const INFINITE_QUESTIONS_HINT =
  "Clear the number for an open-ended session. Practice until you stop.";
const INFINITE_TIME_HINT =
  "Clear the number for unlimited time. Practice until you stop.";

export interface SessionLengthControlProps {
  mode: SessionLengthMode;
  onModeChange: (mode: SessionLengthMode) => void;
  questionCount: number;
  onQuestionCountChange: (n: number) => void;
  questionCountMin?: number;
  questionCountMax?: number;
  timeLimitMinutes: number;
  onTimeLimitChange: (n: number) => void;
  timeLimitMin?: number;
  timeLimitMax?: number;
  /** Plain text field (island); otherwise number input. */
  usePlainInput?: boolean;
  /** Click suffix to switch questions ↔ minutes (no separate toggle row). */
  showModeToggle?: boolean;
  className?: string;
}

export function SessionLengthControl({
  mode,
  onModeChange,
  showModeToggle = true,
  questionCount,
  onQuestionCountChange,
  questionCountMin = 0,
  questionCountMax = 100,
  timeLimitMinutes,
  onTimeLimitChange,
  timeLimitMin = 0,
  timeLimitMax = 180,
  usePlainInput = true,
  className,
}: SessionLengthControlProps) {
  const isQuestions = mode === "questions";
  const value = isQuestions ? questionCount : timeLimitMinutes;
  const min = isQuestions ? questionCountMin : timeLimitMin;
  const max = isQuestions ? questionCountMax : timeLimitMax;
  const onChange = isQuestions ? onQuestionCountChange : onTimeLimitChange;
  const allowInfinite = min <= 0;

  const [draft, setDraft] = useState(() =>
    value === 0 && allowInfinite ? "" : String(value),
  );
  const inputFocused = useRef(false);

  useEffect(() => {
    if (!usePlainInput) return;
    if (inputFocused.current) return;
    setDraft(value === 0 && allowInfinite ? "" : String(value));
  }, [value, usePlainInput, allowInfinite]);

  const bump = (delta: number) => {
    onChange(Math.min(max, Math.max(min, value + delta)));
  };

  const suffix =
    isQuestions
      ? value === 0 && allowInfinite
        ? "open-ended"
        : value === 1
          ? "question"
          : "questions"
      : value === 0 && allowInfinite
        ? "open-ended"
        : value === 1
          ? "minute"
          : "minutes";

  const hint = isQuestions ? INFINITE_QUESTIONS_HINT : INFINITE_TIME_HINT;
  const hintId = isQuestions
    ? "session-length-questions-hint"
    : "session-length-time-hint";

  const stepper = (
    <div
      className="flex shrink-0 flex-col"
      role="group"
      aria-label={
        isQuestions
          ? "Adjust number of questions"
          : "Adjust session duration in minutes"
      }
    >
      <button
        type="button"
        onClick={() => bump(1)}
        disabled={value >= max}
        className={cn(
          "flex h-[22px] w-7 items-center justify-center rounded-t-organic-sm text-text-muted transition-colors dark:text-text/80",
          "hover:bg-surface-mid/80 hover:text-text active:bg-surface-neutral/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
          "disabled:pointer-events-none disabled:opacity-20",
        )}
        aria-label={isQuestions ? "Increase questions" : "Increase minutes"}
      >
        <ChevronUp className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={value <= min}
        className={cn(
          "flex h-[22px] w-7 items-center justify-center rounded-b-organic-sm text-text-muted transition-colors dark:text-text/80",
          "hover:bg-surface-mid/80 hover:text-text active:bg-surface-neutral/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
          "disabled:pointer-events-none disabled:opacity-20",
        )}
        aria-label={isQuestions ? "Decrease questions" : "Decrease minutes"}
      >
        <ChevronDown className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );

  const toggleMode = () => onModeChange(isQuestions ? "time" : "questions");

  return (
    <div className={cn(className)}>
      <div
        className="group/count relative flex w-full min-w-0 items-center gap-1.5 sm:gap-2"
        role="group"
        aria-describedby={allowInfinite ? hintId : undefined}
      >
        {usePlainInput ? (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            value={draft}
            onFocus={() => {
              inputFocused.current = true;
              if (value === 0) setDraft("");
              else setDraft(String(value));
            }}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              setDraft(digits);
              if (digits === "") {
                if (allowInfinite) onChange(0);
                return;
              }
              const n = parseInt(digits, 10);
              if (Number.isNaN(n)) return;
              onChange(Math.min(max, Math.max(min, n)));
            }}
            onBlur={() => {
              inputFocused.current = false;
              if (draft === "" || !/^\d+$/.test(draft)) {
                if (allowInfinite) {
                  onChange(0);
                  setDraft("");
                  return;
                }
                onChange(min);
                setDraft(String(min));
                return;
              }
              const n = parseInt(draft, 10);
              const clamped = Math.min(max, Math.max(min, n));
              onChange(clamped);
              setDraft(String(clamped));
            }}
            placeholder={allowInfinite ? "∞" : undefined}
            className={cn(
              "w-[2.75rem] shrink-0 cursor-text bg-transparent p-0 text-left text-xl font-bold tabular-nums leading-none text-session-green dark:text-primary",
              "rounded-organic-sm border-0 outline-none placeholder:text-session-green/35 placeholder:dark:text-primary/35 focus-visible:ring-2 focus-visible:ring-session-green/35 focus-visible:dark:ring-primary/35",
            )}
            aria-label={
              isQuestions ? "Number of questions" : "Session duration in minutes"
            }
          />
        ) : (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || min)}
            min={min}
            max={max}
            className={cn(
              "w-14 shrink-0 rounded-organic-sm border border-border bg-surface px-2 py-1.5 text-center text-base font-bold tabular-nums text-text outline-none transition-colors",
              "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30 [appearance:textfield]",
              "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            )}
            aria-label={
              isQuestions ? "Number of questions" : "Session duration in minutes"
            }
          />
        )}
        <div className="flex min-w-[2rem] flex-1 items-center justify-center">
          {stepper}
        </div>
        {showModeToggle ? (
          <button
            type="button"
            onClick={toggleMode}
            className={cn(
              "shrink-0 text-sm font-medium transition-colors",
              FIGMA_SESSION_LABEL,
              "rounded-organic-sm underline-offset-2 hover:underline",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-session-green/35 focus-visible:dark:ring-primary/35",
            )}
            aria-label={
              isQuestions
                ? "Switch to time limit in minutes"
                : "Switch to question count"
            }
          >
            {suffix}
          </button>
        ) : (
          <span className={cn("shrink-0 text-sm font-medium", FIGMA_SESSION_LABEL)}>
            {suffix}
          </span>
        )}
        {allowInfinite ? (
          <div
            id={hintId}
            role="tooltip"
            className={cn(
              "pointer-events-none absolute bottom-full left-0 z-20 mb-2 max-w-[13.5rem] rounded-organic-md px-3 py-2",
              "border border-border-subtle bg-surface-elevated text-[11px] leading-snug text-text-muted shadow-md",
              "opacity-0 transition-opacity duration-150 ease-out",
              "group-hover/count:opacity-100 group-focus-within/count:opacity-100",
            )}
          >
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Summary line for review modal header / footer. */
export function formatSessionLengthSummary(
  mode: SessionLengthMode,
  questionCount: number,
  timeLimitMinutes: number,
): string {
  if (mode === "time") {
    if (timeLimitMinutes === 0) return "Unlimited time";
    return `${timeLimitMinutes} min${timeLimitMinutes === 1 ? "" : "s"}`;
  }
  if (questionCount === 0) return "Open-ended";
  return `${questionCount} question${questionCount === 1 ? "" : "s"}`;
}
