"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Check, ChevronDown, ArrowRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectFilter } from "@/types/questionBank";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";
import type { SubjectTileConfig } from "./QuestionBankHomeScreen";

const TIME_PRESETS_MIN = [10, 15, 20, 25, 30, 45, 60];
const QUESTION_STEP = 5;
const QUESTION_MIN = 5;
const QUESTION_MAX = 120;

export type UiDifficultyLabel = "Easy" | "Medium" | "Hard" | "Extreme";

interface QuestionBankSessionSettingsModalProps {
  open: boolean;
  originTile: SubjectTileConfig | null;
  /** Same-exam tiles (click Start on one — can add sibling subjects before launch) */
  siblingTiles: SubjectTileConfig[];
  onClose: () => void;
  onConfirm: (payload: QuestionBankHomeLaunchPayload) => void;
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
}: QuestionBankSessionSettingsModalProps) {
  const [minutes, setMinutes] = useState(20);
  const [questionCount, setQuestionCount] = useState(30);
  const [subjectKeys, setSubjectKeys] = useState<SubjectFilter[]>([]);
  const [difficultyUi, setDifficultyUi] = useState<UiDifficultyLabel>("Easy");

  useEffect(() => {
    if (!open || !originTile) return;
    setSubjectKeys([originTile.key]);
    setMinutes(20);
    setQuestionCount(30);
    setDifficultyUi("Easy");
  }, [open, originTile?.key]);

  const subjectSummaryLabel = useMemo(() => {
    if (!originTile) return "";
    if (subjectKeys.length === 1) {
      return `${originTile.testType === "ESAT" ? "ESAT" : "TMUA"} — ${subjectKeys[0]}`;
    }
    return `${originTile.testType === "ESAT" ? "ESAT" : "TMUA"} — ${subjectKeys.length} subjects`;
  }, [originTile, subjectKeys]);

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
    if (originTile) setSubjectKeys([originTile.key]);
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
        return "border-primary/30 bg-primary/20 text-primary";
    }
  };

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
        <div className="flex items-start justify-between gap-4">
          <h2 id="session-settings-title" className="text-lg font-semibold text-text">
            Session Settings
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
          {subjectSummaryLabel}
        </p>

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

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">Time Limit</label>
            <div className="relative">
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className={cn(
                  "h-11 w-full cursor-pointer appearance-none rounded-organic-lg border border-border-subtle bg-surface-elevated",
                  "pl-3 pr-10 text-sm text-text outline-none ring-0",
                  "focus:border-secondary/35 focus:ring-1 focus:ring-secondary/25",
                )}
              >
                {TIME_PRESETS_MIN.map((m) => (
                  <option key={m} value={m}>
                    {m} mins
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">Number Of Question</label>
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

          <div className="space-y-2 md:col-span-1">
            <span className="block text-xs font-medium text-text-muted">Difficulty Limit</span>
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

        <div className="mt-8 flex flex-col gap-4 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text">
            <span className="font-medium">
              {subjectKeys.length}{" "}
              {subjectKeys.length === 1 ? "subject" : "subjects"} selected
            </span>
            {siblingTiles.length > 1 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={clearAllSubjectsKeepOrigin}
                  className="font-medium text-text-muted underline-offset-4 hover:text-secondary hover:underline"
                >
                  Clear all
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
