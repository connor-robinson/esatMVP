"use client";

import { useEffect, useState } from "react";
import { X, Check, ArrowRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectFilter } from "@/types/questionBank";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import type { SubjectTileConfig } from "./QuestionBankHomeScreen";
import {
  getSubjectPillActiveClass,
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

function difficultyPillClass(d: UiDifficultyLabel, active: boolean): string {
  if (!active) return SUBJECT_PILL_INACTIVE;
  switch (d) {
    case "Easy":
      return "bg-difficulty-pill-easy text-background";
    case "Medium":
      return "bg-difficulty-pill-medium text-background";
    case "Hard":
      return "bg-difficulty-pill-hard text-background";
    case "Extreme":
      return "bg-advanced text-background";
    default:
      return "bg-surface-mid text-text";
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
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
            "w-14 bg-transparent text-center text-sm font-semibold tabular-nums text-text",
            "outline-none focus:outline-none",
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
    setMinutes(20);
    setQuestionCount(30);
    setDifficultiesUi([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, originTile?.key, isMixed]);

  const toggleSubject = (key: SubjectFilter) => {
    setSubjectKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const toggleDifficulty = (d: UiDifficultyLabel) => {
    setDifficultiesUi((prev) => {
      if (prev.length === 0) return [d];
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      return [...prev, d];
    });
  };

  const clearAllSubjectsKeepOrigin = () => {
    if (originTile) setSubjectKeys([originTile.key as SubjectFilter]);
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
  const allDifficultiesSelected = difficultiesUi.length === 0;
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
        className="absolute inset-0 bg-background/75 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[101] flex max-h-[min(92vh,880px)] w-full max-w-[960px] flex-col overflow-hidden rounded-organic-xl",
          "bg-surface p-8 shadow-modal-card sm:p-10",
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

        {/* Subjects */}
        {showSubjectToggles && (
          <div className="mt-8 space-y-3">
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
                      active ? getSubjectPillActiveClass(key) : SUBJECT_PILL_INACTIVE,
                    )}
                  >
                    {t.key}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="mt-8 grid flex-1 gap-8 overflow-y-auto sm:grid-cols-3">
          {/* Time Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Time Limit
              </label>
              <button
                type="button"
                onClick={applyAutoTimeLimit}
                className={cn(
                  "rounded-organic-md px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  minutes === autoMinutes
                    ? "bg-secondary/20 text-secondary"
                    : "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text",
                )}
              >
                Auto ({autoMinutes} min)
              </button>
            </div>
            <NumericStepper
              value={minutes}
              onChange={setMinutes}
              min={TIME_MIN}
              max={TIME_MAX}
              suffix="min"
              ariaLabel="Time limit in minutes"
            />
          </div>

          {/* Number of Questions */}
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted">
              Number Of Questions
            </label>
            <NumericStepper
              value={questionCount}
              onChange={setQuestionCount}
              min={QUESTION_MIN}
              max={QUESTION_MAX}
              suffix="Qs"
              ariaLabel="Number of questions"
            />
          </div>

          {/* Difficulty — multi-select up to 4 */}
          <div className="space-y-3 sm:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Difficulty
              </span>
              <span className="text-[11px] text-text-muted">
                {allDifficultiesSelected ? "All levels" : `${difficultiesUi.length} selected`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ALL_UI_DIFFICULTIES.map((d) => {
                const active = allDifficultiesSelected || difficultiesUi.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDifficulty(d)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-organic-md px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                      difficultyPillClass(d, active),
                    )}
                  >
                    {active && (
                      <Check className="h-3 w-3 shrink-0" strokeWidth={3} />
                    )}
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Tap to filter levels. None selected includes all four.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col gap-5 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text">
            <span className="font-medium">
              {subjectKeys.length}{" "}
              {subjectKeys.length === 1 ? "subject" : "subjects"}
            </span>
            {showSubjectToggles && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={clearAllSubjectsKeepOrigin}
                  className="font-medium text-text-muted underline-offset-4 hover:text-secondary hover:underline"
                >
                  Reset subjects
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleStart}
            className={cn(
              "inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full px-10 py-3.5 sm:w-auto",
              "bg-secondary text-background text-sm font-semibold shadow-glow transition-all hover:brightness-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35",
            )}
          >
            Start your session
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
