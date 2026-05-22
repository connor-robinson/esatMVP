"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, ChevronDown, ArrowRight, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SubjectFilter } from "@/types/questionBank";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import type { SubjectTileConfig } from "./QuestionBankHomeScreen";
import {
  getSubjectPillActiveClass,
  SUBJECT_PILL_INACTIVE,
} from "@/lib/questionBank/subjectColors";

const TIME_PRESETS_MIN = [5, 10, 15, 20, 25, 30, 45, 60, 90];
const QUESTION_STEP = 1;
const QUESTION_MIN = 1;
const QUESTION_MAX = 120;

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
  const [timeLimitOpen, setTimeLimitOpen] = useState(false);
  const timeLimitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timeLimitRef.current && !timeLimitRef.current.contains(e.target as Node)) {
        setTimeLimitOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setTimeLimitOpen(false);
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

  const bumpQuestions = (delta: number) => {
    setQuestionCount((c) =>
      Math.min(QUESTION_MAX, Math.max(QUESTION_MIN, c + delta)),
    );
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
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted">
              Time Limit
            </label>
            <div className="relative" ref={timeLimitRef}>
              <button
                type="button"
                onClick={() => setTimeLimitOpen((v) => !v)}
                className={cn(
                  "flex h-12 w-full items-center justify-between rounded-organic-lg bg-surface-elevated px-4 text-sm text-text",
                  "transition-colors hover:bg-surface-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/25",
                  timeLimitOpen && "bg-surface-mid",
                )}
              >
                <span>{minutes} mins</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-text-muted transition-transform duration-200",
                    timeLimitOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {timeLimitOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setTimeLimitOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                      className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-organic-md bg-surface-mid shadow-modal-card"
                    >
                      <div className="py-1.5">
                        {TIME_PRESETS_MIN.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setMinutes(m);
                              setTimeLimitOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between px-4 py-3 text-sm transition-colors",
                              m === minutes
                                ? "bg-surface-neutral font-medium text-text"
                                : "text-text-muted hover:bg-surface-neutral hover:text-text",
                            )}
                          >
                            {m} mins
                            {m === minutes && (
                              <Check className="h-3.5 w-3.5 text-secondary" strokeWidth={2.5} />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Number of Questions */}
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-text-muted">
              Number Of Questions
            </label>
            <div className="flex h-12 items-center justify-between rounded-organic-lg bg-surface-elevated px-1.5">
              <button
                type="button"
                onClick={() => bumpQuestions(-QUESTION_STEP)}
                disabled={questionCount <= QUESTION_MIN}
                className="flex h-9 w-9 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-neutral hover:text-text disabled:opacity-35"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[5rem] text-center text-sm font-semibold tabular-nums text-text">
                {questionCount} Qs
              </span>
              <button
                type="button"
                onClick={() => bumpQuestions(QUESTION_STEP)}
                disabled={questionCount >= QUESTION_MAX}
                className="flex h-9 w-9 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-neutral hover:text-text disabled:opacity-35"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
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
