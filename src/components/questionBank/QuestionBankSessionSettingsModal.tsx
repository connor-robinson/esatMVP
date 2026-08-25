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
import {
  difficultiesForMixApi,
  type DifficultyMixPreset,
  uiDifficultiesForMix,
} from "@/lib/questionBank/difficultyMix";
import { DifficultyMixSlider } from "@/components/questionBank/DifficultyMixSlider";
import { RoadmapInfoPopover } from "@/components/papers/roadmap/RoadmapInfoPopover";

const QUESTION_STEP = 1;
const QUESTION_MIN = 1;
const QUESTION_MAX = 120;
/** 90 seconds per question → half-minute steps (e.g. 45.5 min). */
const TIME_STEP = 0.5;
const TIME_MIN = 0.5;
const TIME_MAX = 180;

export type UiDifficultyLabel = "Easy" | "Medium" | "Hard" | "Extreme";

interface QuestionBankSessionSettingsModalProps {
  open: boolean;
  originTile: SubjectTileConfig | null;
  siblingTiles: SubjectTileConfig[];
  onClose: () => void;
  onConfirm: (payload: QuestionBankHomeLaunchPayload) => void;
  isMixed?: boolean;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundToStep(n: number, step: number): number {
  return Math.round(n / step) * step;
}

/** 90s per question = 1.5 min; keep half-minute precision. */
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

interface NumericStepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  allowDecimals?: boolean;
  suffix: string;
  ariaLabel: string;
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
}: NumericStepperProps) {
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
    const next = clamp(roundToStep(value + delta, step), min, max);
    onChange(next);
  };

  return (
    <div className="flex h-14 items-center justify-between rounded-organic-lg bg-surface-elevated px-1.5">
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={value <= min}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-neutral hover:text-text disabled:opacity-35"
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1">
        <input
          type="text"
          inputMode={allowDecimals ? "decimal" : "numeric"}
          pattern={allowDecimals ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
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
            "w-[4.5rem] border-0 bg-transparent text-center text-2xl font-semibold tabular-nums leading-none text-text sm:text-[1.75rem]",
            "outline-none shadow-none ring-0 focus:border-0 focus:outline-none focus:ring-0",
          )}
          aria-label={ariaLabel}
        />
        <span className="shrink-0 text-sm font-medium text-text-muted">{suffix}</span>
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
  const [difficultyMix, setDifficultyMix] =
    useState<DifficultyMixPreset>("Auto");

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
    setDifficultyMix("Auto");
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
      difficulties: difficultiesForMixApi(difficultyMix),
      uiDifficulties: uiDifficultiesForMix(difficultyMix),
      difficultyMix,
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
  const showSubjectToggles = siblingTiles.length > 1;
  const autoMinutes = autoTimeLimitMinutes(questionCount);

  const isAutoTime = Math.abs(minutes - autoMinutes) < 0.001;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-settings-title"
    >
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-black/85 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[101] flex max-h-[min(92vh,880px)] w-full max-w-[960px] flex-col overflow-hidden rounded-organic-xl",
          "animate-slide-up bg-surface p-8 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:p-10",
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Difficulty
                </span>
                <RoadmapInfoPopover
                  title="How difficulty works"
                  label="Difficulty info"
                  align="left"
                >
                  <p>
                    This is still a mixed session. The slider sets a general
                    difficulty bias, not a single fixed level.
                  </p>
                  <p>
                    Auto keeps an even spread. Easy leans easy with a few medium
                    and rare hard. Medium centres on medium with some easy and
                    hard. Hard is mostly hard with some medium, little easy, and
                    very few extreme-level hard questions.
                  </p>
                </RoadmapInfoPopover>
              </div>
              <span className="text-xs font-semibold text-text">{difficultyMix}</span>
            </div>
            <DifficultyMixSlider
              value={difficultyMix}
              onChange={setDifficultyMix}
            />
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
                    step={TIME_STEP}
                    allowDecimals
                    suffix="min"
                    ariaLabel="Time limit in minutes"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyAutoTimeLimit}
                  disabled={isAutoTime}
                  title={`Reset to ${formatStepperValue(autoMinutes, TIME_STEP)} min (90s per question)`}
                  className={cn(
                    "flex h-14 shrink-0 items-center gap-1.5 rounded-organic-lg px-3 text-xs font-semibold transition-colors",
                    "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text",
                    "disabled:cursor-default disabled:opacity-45 disabled:hover:bg-surface-elevated disabled:hover:text-text-muted",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35",
                  )}
                  aria-label={`Reset time limit to ${formatStepperValue(autoMinutes, TIME_STEP)} minutes`}
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
                step={QUESTION_STEP}
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
