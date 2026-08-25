"use client";

import { useEffect, useState } from "react";
import { X, ArrowRight, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectFilter } from "@/types/questionBank";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import type { SubjectTileConfig } from "./QuestionBankHomeScreen";
import {
  getSubjectSessionPillActiveClass,
  SUBJECT_PILL_INACTIVE,
} from "@/lib/questionBank/subjectColors";

const STEP = 1;
const QUESTION_MIN = 1;
const QUESTION_MAX = 120;
const TIME_MIN = 1;
const TIME_MAX = 180;

export type UiDifficultyLabel = "Easy" | "Medium" | "Hard" | "Extreme";

const ALL_UI_DIFFICULTIES: UiDifficultyLabel[] = [
  "Easy",
  "Medium",
  "Hard",
  "Extreme",
];

interface QuestionBankSessionSettingsModalProps {
  open: boolean;
  originTile: SubjectTileConfig | null;
  siblingTiles: SubjectTileConfig[];
  onClose: () => void;
  onConfirm: (payload: QuestionBankHomeLaunchPayload) => void;
  isMixed?: boolean;
}

function uiDifficultyToApiDifficulty(d: UiDifficultyLabel): string {
  if (d === "Extreme") return "Hard";
  return d;
}

function resolveDifficultiesForApi(
  selected: UiDifficultyLabel[],
): string[] {
  const effective =
    selected.length === 0 ||
    selected.length === ALL_UI_DIFFICULTIES.length
      ? ALL_UI_DIFFICULTIES
      : selected;
  return [...new Set(effective.map(uiDifficultyToApiDifficulty))];
}

const DIFFICULTY_SLIDER_OPTIONS = [
  "Auto",
  ...ALL_UI_DIFFICULTIES,
] as const;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function difficultyIndexFromUi(selected: UiDifficultyLabel[]): number {
  if (selected.length === 0) return 0;
  const first = selected[0]!;
  const index = DIFFICULTY_SLIDER_OPTIONS.indexOf(first);
  return index >= 0 ? index : 0;
}

function uiFromDifficultyIndex(index: number): UiDifficultyLabel[] {
  const option =
    DIFFICULTY_SLIDER_OPTIONS[
      clamp(index, 0, DIFFICULTY_SLIDER_OPTIONS.length - 1)
    ];
  if (!option || option === "Auto") return [];
  return [option];
}

function autoTimeLimitMinutes(questionCount: number): number {
  return clamp(Math.round(questionCount * 1.5), TIME_MIN, TIME_MAX);
}

interface NumericStepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix: string;
  ariaLabel: string;
}

function NumericStepper({
  value,
  onChange,
  min,
  max,
  suffix,
  ariaLabel,
}: NumericStepperProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    onChange(clamp(parsed, min, max));
  };

  const bump = (delta: number) => {
    onChange(clamp(value + delta, min, max));
  };

  return (
    <div className="flex h-12 items-center justify-between rounded-organic-lg bg-surface-elevated px-1.5">
      <button
        type="button"
        onClick={() => bump(-STEP)}
        disabled={value <= min}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-neutral hover:text-text disabled:opacity-35"
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "w-14 border-0 bg-transparent text-center text-sm font-semibold tabular-nums text-text",
            "outline-none shadow-none ring-0 focus:border-0 focus:outline-none focus:ring-0",
          )}
          aria-label={ariaLabel}
        />
        <span className="shrink-0 text-sm font-medium text-text-muted">{suffix}</span>
      </div>
      <button
        type="button"
        onClick={() => bump(STEP)}
        disabled={value >= max}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-neutral hover:text-text disabled:opacity-35"
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function QuestionBankSessionSettingsModal({
  open,
  originTile,
  siblingTiles,
  onClose,
  onConfirm,
  isMixed = false,
}: QuestionBankSessionSettingsModalProps) {
  const [minutes, setMinutes] = useState(20);
  const [questionCount, setQuestionCount] = useState(30);
  const [subjectKeys, setSubjectKeys] = useState<SubjectFilter[]>([]);
  const [difficultiesUi, setDifficultiesUi] = useState<UiDifficultyLabel[]>([]);

  useEffect(() => {
    if (!open || !originTile) return;
    if (isMixed) {
      setSubjectKeys(siblingTiles.map((t) => t.key as SubjectFilter));
    } else {
      setSubjectKeys([originTile.key as SubjectFilter]);
    }
    const initialCount = 30;
    setQuestionCount(initialCount);
    setMinutes(autoTimeLimitMinutes(initialCount));
    setDifficultiesUi([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, originTile?.key, isMixed]);

  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count);
    setMinutes(autoTimeLimitMinutes(count));
  };

  const toggleSubject = (key: SubjectFilter) => {
    setSubjectKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const setDifficultyFromSlider = (index: number) => {
    setDifficultiesUi(uiFromDifficultyIndex(index));
  };

  const applyAutoTimeLimit = () => {
    setMinutes(autoTimeLimitMinutes(questionCount));
  };

  const handleStart = () => {
    if (!originTile || subjectKeys.length === 0) return;
    onConfirm({
      testType: originTile.testType,
      subjects: subjectKeys,
      timeLimitMinutes: minutes,
      questionCount,
      difficulties: resolveDifficultiesForApi(difficultiesUi),
      uiDifficulties: difficultiesUi,
    });
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open || !originTile) return null;

  const modalTitle = isMixed ? "Mixed Practice" : "Session Settings";
  const difficultyIndex = difficultyIndexFromUi(difficultiesUi);
  const difficultyLabel =
    DIFFICULTY_SLIDER_OPTIONS[difficultyIndex] ?? "Auto";
  const showSubjectToggles = siblingTiles.length > 1;
  const autoMinutes = autoTimeLimitMinutes(questionCount);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-settings-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[101] flex max-h-[min(92vh,880px)] w-full max-w-[960px] flex-col overflow-hidden rounded-organic-xl",
          "bg-surface p-8 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-10",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h2 id="session-settings-title" className="text-lg font-semibold text-text sm:text-xl">
              {modalTitle}
            </h2>
            <p className="text-sm text-text-muted">
              {isMixed
                ? "Choose subjects and session options for mixed practice."
                : "Configure your practice session before you start."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            aria-label="Close session settings"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Subjects + difficulty */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {showSubjectToggles ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Subjects
                </span>
                <span className="text-xs text-text-muted">
                  {subjectKeys.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {siblingTiles.map((t) => {
                  const key = t.key as SubjectFilter;
                  const active = subjectKeys.includes(key);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => toggleSubject(key)}
                      className={cn(
                        "rounded-organic-md px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                        active ? getSubjectSessionPillActiveClass(key) : SUBJECT_PILL_INACTIVE,
                      )}
                    >
                      {t.key}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className={cn("space-y-3", !showSubjectToggles && "lg:col-span-2")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Difficulty
              </span>
              <span className="text-xs font-semibold text-text">{difficultyLabel}</span>
            </div>
            <div className="space-y-2.5 pt-1">
              <input
                type="range"
                min={0}
                max={DIFFICULTY_SLIDER_OPTIONS.length - 1}
                step={1}
                value={difficultyIndex}
                onChange={(e) => setDifficultyFromSlider(Number(e.target.value))}
                aria-label="Difficulty"
                aria-valuetext={difficultyLabel}
                className={cn(
                  "h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-mid",
                  "accent-secondary",
                  "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
                  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                  "[&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:shadow-sm",
                  "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5",
                  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
                  "[&::-moz-range-thumb]:bg-secondary",
                  "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-surface-mid",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35",
                )}
              />
              <div className="flex justify-between gap-1 px-0.5">
                {DIFFICULTY_SLIDER_OPTIONS.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDifficultyFromSlider(index)}
                    className={cn(
                      "min-w-0 flex-1 text-center text-[10px] font-semibold uppercase tracking-wide transition-colors sm:text-xs",
                      index === difficultyIndex
                        ? "text-text"
                        : "text-text-subtle hover:text-text-muted",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Time + questions */}
        <div className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="space-y-3">
              <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Time Limit
              </label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <NumericStepper
                    value={minutes}
                    onChange={setMinutes}
                    min={TIME_MIN}
                    max={TIME_MAX}
                    suffix="min"
                    ariaLabel="Time limit in minutes"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyAutoTimeLimit}
                  disabled={minutes === autoMinutes}
                  title={`Reset to ${autoMinutes} min (1.5× questions)`}
                  className={cn(
                    "flex h-12 shrink-0 items-center gap-1.5 rounded-organic-lg px-3 text-xs font-semibold transition-colors",
                    "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text",
                    "disabled:cursor-default disabled:opacity-45 disabled:hover:bg-surface-elevated disabled:hover:text-text-muted",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35",
                  )}
                  aria-label={`Reset time limit to ${autoMinutes} minutes`}
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Reset
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Number Of Questions
              </label>
              <NumericStepper
                value={questionCount}
                onChange={handleQuestionCountChange}
                min={QUESTION_MIN}
                max={QUESTION_MAX}
                suffix="Qs"
                ariaLabel="Number of questions"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex justify-end pt-2">
          <button
            type="button"
            onClick={handleStart}
            className={cn(
              "inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-organic-lg px-8 sm:w-auto",
              "bg-secondary text-background text-sm font-semibold shadow-glow transition-all duration-fast",
              "hover:brightness-110 active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            )}
          >
            Start your session
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
