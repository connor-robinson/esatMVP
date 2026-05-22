"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, ChevronDown, ArrowRight, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SubjectFilter } from "@/types/questionBank";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import type { SubjectTileConfig } from "@/lib/questionBank/subjectTiles";

const TIME_PRESETS_MIN = [5, 10, 15, 20, 25, 30, 45, 60, 90];
const QUESTION_STEP = 1;
const QUESTION_MIN = 1;
const QUESTION_MAX = 120;

export type UiDifficultyLabel = "Easy" | "Medium" | "Hard" | "Extreme";

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
  const [difficultyUi, setDifficultyUi] = useState<UiDifficultyLabel>("Easy");
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
    setDifficultyUi("Easy");
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
      difficulties: [uiDifficultyToApiDifficulty(difficultyUi)],
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

  const difficulties: UiDifficultyLabel[] = ["Easy", "Medium", "Hard", "Extreme"];

  const difficultyActiveClass = (d: UiDifficultyLabel): string => {
    switch (d) {
      case "Easy":
        return "border-difficulty-easy/35 bg-difficulty-easy/15 text-difficulty-easy";
      case "Medium":
        return "border-warning/35 bg-warning/15 text-warning";
      case "Hard":
        return "border-error/35 bg-error/15 text-error";
      case "Extreme":
        return "border-accent/35 bg-accent/15 text-accent";
      default:
        return "border-secondary/30 bg-secondary/20 text-secondary";
    }
  };

  const modalTitle = isMixed ? "Mixed Practice" : "Session Settings";
  const subjectLabel = isMixed
    ? `${subjectKeys.length} subject${subjectKeys.length !== 1 ? "s" : ""} selected`
    : subjectKeys.length === 1
      ? `${originTile.testType} — ${subjectKeys[0]}`
      : `${originTile.testType} — ${subjectKeys.length} subjects`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
          "relative z-[101] w-full max-w-[920px] overflow-hidden rounded-organic-xl",
          "border border-border-subtle bg-surface p-6 shadow-modal-card",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 id="session-settings-title" className="text-lg font-semibold text-text">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            aria-label="Close session settings"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <p className="mt-3 inline-flex max-w-full rounded-organic-md border border-border-subtle bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-muted">
          {subjectLabel}
        </p>

        {/* Subject toggles */}
        {siblingTiles.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {siblingTiles.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleSubject(t.key as SubjectFilter)}
                className={cn(
                  "rounded-organic-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                  subjectKeys.includes(t.key as SubjectFilter)
                    ? "border-secondary/35 bg-secondary/15 text-secondary"
                    : "border-border-subtle bg-surface-elevated text-text-muted hover:border-border hover:text-text",
                )}
              >
                {t.key}
              </button>
            ))}
          </div>
        )}

        {/* Settings row */}
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {/* Time Limit — custom styled dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">
              Time Limit
            </label>
            <div className="relative" ref={timeLimitRef}>
              <button
                type="button"
                onClick={() => setTimeLimitOpen((v) => !v)}
                className={cn(
                  "flex h-11 w-full items-center justify-between rounded-organic-lg border border-border-subtle bg-surface-elevated px-3 text-sm text-text",
                  "transition-colors hover:bg-surface-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/25",
                  timeLimitOpen && "border-secondary/30 bg-surface-mid",
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
                      className="absolute top-full z-50 mt-1.5 w-full overflow-hidden rounded-organic-md border border-border-subtle bg-surface-mid shadow-modal-card"
                    >
                      <div className="py-1">
                        {TIME_PRESETS_MIN.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setMinutes(m);
                              setTimeLimitOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors",
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

          {/* Number of Questions — continuous stepper */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">
              Number Of Questions
            </label>
            <div className="flex h-11 items-center justify-between rounded-organic-lg border border-border-subtle bg-surface-elevated px-1">
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

          {/* Difficulty */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-text-muted">
              Difficulty Limit
            </span>
            <div className="flex flex-wrap gap-1.5">
              {difficulties.map((d) => {
                const active = difficultyUi === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficultyUi(d)}
                    className={cn(
                      "flex items-center gap-1 rounded-organic-md border px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                      active
                        ? difficultyActiveClass(d)
                        : "border-border-subtle bg-surface-elevated text-text-muted hover:border-border hover:text-text",
                    )}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col gap-4 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text">
            <span className="font-medium">
              {subjectKeys.length}{" "}
              {subjectKeys.length === 1 ? "subject" : "subjects"} selected
            </span>
            {(siblingTiles.length > 1 || isMixed) && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={clearAllSubjectsKeepOrigin}
                  className="font-medium text-text-muted underline-offset-4 hover:text-secondary hover:underline"
                >
                  Reset
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
