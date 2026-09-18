"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MISTAKES_EXAM_FILTERS,
  MISTAKES_POOL_OPTIONS,
  type MistakesExamFilter,
  type MistakesPoolMode,
  type MistakesSummary,
} from "@/lib/papers/mistakes";
import {
  applyExtraTimeMinutes,
  fetchExtraTimePrefs,
} from "@/lib/papers/extraTime";

const QUESTION_MIN = 1;
const QUESTION_MAX = 40;
const TIME_STEP = 0.5;
const TIME_MIN = 0.5;
const TIME_MAX = 180;
const DEFAULT_EXTRA_TIME_PERCENT = 25;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundToStep(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function autoTimeLimitMinutes(questionCount: number): number {
  return clamp(roundToStep(questionCount * 1.5, TIME_STEP), TIME_MIN, TIME_MAX);
}

function formatStepperValue(value: number, step: number): string {
  if (step < 1) {
    const rounded = roundToStep(value, step);
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
  return String(Math.round(value));
}

function NumericStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  allowDecimals = false,
  suffix,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  allowDecimals?: boolean;
  suffix: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(formatStepperValue(value, step));

  useEffect(() => {
    setDraft(formatStepperValue(value, step));
  }, [value, step]);

  const commitDraft = () => {
    const parsed = allowDecimals ? parseFloat(draft) : parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(formatStepperValue(value, step));
      return;
    }
    const next = allowDecimals
      ? clamp(roundToStep(parsed, step), min, max)
      : clamp(Math.round(parsed), min, max);
    onChange(next);
    setDraft(formatStepperValue(next, step));
  };

  const bump = (delta: number) => {
    onChange(clamp(roundToStep(value + delta, step), min, max));
  };

  return (
    <div className="flex min-h-14 items-center justify-between overflow-visible rounded-organic-lg bg-surface-elevated px-1.5 py-1.5">
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={value <= min}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-neutral hover:text-text disabled:opacity-35"
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 overflow-visible px-1">
        <input
          type="text"
          inputMode={allowDecimals ? "decimal" : "numeric"}
          value={draft}
          onChange={(e) => {
            const next = allowDecimals
              ? e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1")
              : e.target.value.replace(/\D/g, "");
            setDraft(next);
          }}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "box-content h-10 w-[5.5ch] shrink-0 border-0 bg-transparent px-1.5 text-center text-2xl font-semibold tabular-nums leading-none text-text sm:text-[1.75rem]",
            "outline-none shadow-none ring-0 focus:border-0 focus:outline-none focus:ring-0",
          )}
          aria-label={ariaLabel}
        />
        <span className="shrink-0 text-sm font-medium leading-none text-text-muted">
          {suffix}
        </span>
      </div>
      <button
        type="button"
        onClick={() => bump(step)}
        disabled={value >= max}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-neutral hover:text-text disabled:opacity-35"
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export type MistakesLaunchConfig = {
  mode: MistakesPoolMode;
  exam: MistakesExamFilter;
  questionCount: number;
  timeLimitMinutes: number;
};

interface MistakesSessionSettingsProps {
  summary: MistakesSummary | null;
  loadingSummary: boolean;
  starting: boolean;
  error: string | null;
  onStart: (config: MistakesLaunchConfig) => void;
}

export function MistakesSessionSettings({
  summary,
  loadingSummary,
  starting,
  error,
  onStart,
}: MistakesSessionSettingsProps) {
  const [exam, setExam] = useState<MistakesExamFilter>("ALL");
  const [mode, setMode] = useState<MistakesPoolMode>("untouched");
  const [questionCount, setQuestionCount] = useState(10);
  const [minutes, setMinutes] = useState(autoTimeLimitMinutes(10));
  const [timeManual, setTimeManual] = useState(false);
  const [extraTimeOn, setExtraTimeOn] = useState(false);
  const [extraTimePercent, setExtraTimePercent] = useState(
    DEFAULT_EXTRA_TIME_PERCENT,
  );

  useEffect(() => {
    let cancelled = false;
    fetchExtraTimePrefs()
      .then((prefs) => {
        if (cancelled) return;
        if (prefs.percentage > 0) setExtraTimePercent(prefs.percentage);
        if (prefs.enabled) setExtraTimeOn(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const expectedAutoMinutes = useMemo(() => {
    const base = autoTimeLimitMinutes(questionCount);
    return extraTimeOn
      ? applyExtraTimeMinutes(base, extraTimePercent)
      : base;
  }, [questionCount, extraTimeOn, extraTimePercent]);

  const isAutoTime = !timeManual;

  useEffect(() => {
    if (!timeManual) {
      setMinutes(expectedAutoMinutes);
    }
  }, [expectedAutoMinutes, timeManual]);

  const poolAvailable = useMemo(() => {
    if (!summary) return 0;
    if (exam === "ALL") return summary.totalIncorrect;
    return summary.byExam[exam] ?? 0;
  }, [summary, exam]);

  const modeHint = MISTAKES_POOL_OPTIONS.find((o) => o.id === mode);

  const handleQuestionCountChange = (next: number) => {
    setQuestionCount(next);
    if (!timeManual) {
      const base = autoTimeLimitMinutes(next);
      setMinutes(
        extraTimeOn ? applyExtraTimeMinutes(base, extraTimePercent) : base,
      );
    }
  };

  const handleMinutesChange = (next: number) => {
    setTimeManual(true);
    setMinutes(next);
  };

  const applyAutoTimeLimit = () => {
    setTimeManual(false);
    setMinutes(expectedAutoMinutes);
  };

  const toggleExtraTime = () => {
    const next = !extraTimeOn;
    setExtraTimeOn(next);
    if (!timeManual) {
      const base = autoTimeLimitMinutes(questionCount);
      setMinutes(next ? applyExtraTimeMinutes(base, extraTimePercent) : base);
    }
  };

  const canStart = poolAvailable > 0 && !starting && !loadingSummary;

  return (
    <div className="mx-auto w-full max-w-[960px] rounded-[4px] bg-surface p-8 sm:p-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-text sm:text-xl">
            Mistakes session settings
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Drill individual past-paper questions you got wrong.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
        <span>
          Incorrect pool:{" "}
          <span className="font-semibold tabular-nums text-text">
            {loadingSummary ? "…" : summary?.totalIncorrect ?? 0}
          </span>
        </span>
        <span>
          Untouched:{" "}
          <span className="font-semibold tabular-nums text-text">
            {loadingSummary ? "…" : summary?.untouched ?? 0}
          </span>
        </span>
        <span>
          Bounce-backs:{" "}
          <span className="font-semibold tabular-nums text-text">
            {loadingSummary ? "…" : summary?.bounceBacks ?? 0}
          </span>
        </span>
      </div>

      <div className="mt-8 space-y-3">
        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Exam
        </label>
        <div className="flex flex-wrap gap-2">
          {MISTAKES_EXAM_FILTERS.map((value) => {
            const active = exam === value;
            const count =
              value === "ALL"
                ? summary?.totalIncorrect ?? 0
                : summary?.byExam[value] ?? 0;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setExam(value)}
                className={cn(
                  "rounded-organic-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-background"
                    : "bg-surface-elevated text-text hover:bg-surface-mid",
                )}
              >
                {value === "ALL" ? "All exams" : value}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    active ? "text-background/70" : "text-text-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Question pool
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {MISTAKES_POOL_OPTIONS.map((option) => {
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  "rounded-organic-lg px-4 py-3 text-left transition-colors",
                  active
                    ? "bg-secondary text-background"
                    : "bg-surface-elevated text-text hover:bg-surface-mid",
                )}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <div
                  className={cn(
                    "mt-1 text-xs leading-snug",
                    active ? "text-background/75" : "text-text-muted",
                  )}
                >
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>
        {modeHint ? (
          <p className="text-xs text-text-muted sm:hidden">
            {modeHint.description}
          </p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Time limit
          </label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <NumericStepper
                value={minutes}
                onChange={handleMinutesChange}
                min={TIME_MIN}
                max={TIME_MAX}
                step={TIME_STEP}
                allowDecimals
                suffix="min"
                ariaLabel="Time limit in minutes"
              />
            </div>
            <button
              type="button"
              onClick={toggleExtraTime}
              className={cn(
                "flex min-h-14 shrink-0 items-center self-stretch rounded-organic-lg px-3 text-xs font-semibold transition-colors",
                extraTimeOn
                  ? "bg-secondary text-background"
                  : "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text",
              )}
              aria-pressed={extraTimeOn}
            >
              +{extraTimePercent}%
            </button>
            <button
              type="button"
              onClick={applyAutoTimeLimit}
              disabled={isAutoTime}
              className={cn(
                "flex min-h-14 shrink-0 items-center gap-1.5 self-stretch rounded-organic-lg px-3 text-xs font-semibold transition-colors",
                "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text",
                "disabled:cursor-default disabled:opacity-45",
              )}
              aria-label="Reset time limit"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Reset
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Number of questions
          </label>
          <NumericStepper
            value={questionCount}
            onChange={handleQuestionCountChange}
            min={QUESTION_MIN}
            max={Math.max(QUESTION_MIN, Math.min(QUESTION_MAX, poolAvailable || QUESTION_MAX))}
            step={1}
            suffix="Qs"
            ariaLabel="Number of questions"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loadingSummary && poolAvailable === 0 ? (
        <p className="mt-6 text-sm text-text-muted">
          No incorrect questions yet
          {exam !== "ALL" ? ` for ${exam}` : ""}. Finish a past paper and mark
          answers to build this pool.
        </p>
      ) : null}

      <div className="mt-8">
        <button
          type="button"
          disabled={!canStart}
          onClick={() =>
            onStart({
              mode,
              exam,
              questionCount: Math.min(questionCount, Math.max(1, poolAvailable)),
              timeLimitMinutes: minutes,
            })
          }
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-organic-lg bg-secondary px-5 py-4 text-sm font-semibold text-background transition-opacity",
            "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          {starting ? "Building session…" : "Start mistakes drill"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
