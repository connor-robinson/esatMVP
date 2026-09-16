"use client";

import { useEffect, useRef, useState } from "react";
import { X, ArrowRight, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectFilter } from "@/types/questionBank";
import type {
  QuestionBankHomeLaunchPayload,
  QuestionBankPlayMode,
  QuestionBankQuestionPool,
} from "@/lib/questionBank/homeLaunch";
import type { SubjectTileConfig } from "./QuestionBankHomeScreen";
import {
  getSubjectSessionPillActiveClass,
  SUBJECT_PILL_INACTIVE,
} from "@/lib/questionBank/subjectColors";
import {
  DIFFICULTY_MIX_BLURBS,
  difficultiesForMixApi,
  type DifficultyMixPreset,
  uiDifficultiesForMix,
} from "@/lib/questionBank/difficultyMix";
import { DifficultyMixSlider } from "@/components/questionBank/DifficultyMixSlider";
import { RoadmapInfoPopover } from "@/components/papers/roadmap/RoadmapInfoPopover";
import {
  fetchLibraryOutline,
  type LibraryOutlineTag,
} from "@/lib/questionBank/libraryData";
import type { LibraryFilters } from "@/lib/questionBank/libraryQueryParams";
import { isVerifiedCurriculumTag } from "@/lib/questionBank/esatTagCanonicalize";
import { UNTAGGED_TOPIC } from "@/lib/questionBank/libraryQueryParams";
import {
  applyExtraTimeMinutes,
  fetchExtraTimePrefs,
  type ExtraTimePrefs,
} from "@/lib/papers/extraTime";

const QUESTION_STEP = 1;
const QUESTION_MIN = 1;
const QUESTION_MAX = 120;
/** 90 seconds per question → half-minute steps (e.g. 45.5 min). */
const TIME_STEP = 0.5;
const TIME_MIN = 0.5;
const TIME_MAX = 180;

const EMPTY_LIBRARY_FILTERS: LibraryFilters = {
  searchQuery: "",
  subjectFilter: "ALL",
  difficultyFilter: "ALL",
  attemptedStatusFilter: "Mix",
  attemptResultFilter: "ALL",
};

export type UiDifficultyLabel = "Easy" | "Medium" | "Hard" | "Extreme";

interface QuestionBankSessionSettingsModalProps {
  open: boolean;
  originTile: SubjectTileConfig | null;
  siblingTiles: SubjectTileConfig[];
  onClose: () => void;
  onConfirm: (payload: QuestionBankHomeLaunchPayload) => void;
  isMixed?: boolean;
  /** Logged-out / free-tier: browse Advanced options without implying a paid start. */
  previewOnly?: boolean;
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

function AdvancedToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 select-none">
      <span className="text-xs font-medium text-text-muted">Advanced</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Advanced options"
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-secondary" : "bg-surface-elevated",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-background shadow-none transition-transform",
            checked ? "translate-x-[1.35rem]" : "translate-x-1",
          )}
        />
      </button>
    </label>
  );
}

export function QuestionBankSessionSettingsModal({
  open,
  originTile,
  siblingTiles,
  onClose,
  onConfirm,
  isMixed = false,
  previewOnly = false,
}: QuestionBankSessionSettingsModalProps) {
  const [minutes, setMinutes] = useState(() => autoTimeLimitMinutes(10));
  const [questionCount, setQuestionCount] = useState(10);
  const [subjectKeys, setSubjectKeys] = useState<SubjectFilter[]>([]);
  const [difficultyMix, setDifficultyMix] =
    useState<DifficultyMixPreset>("Auto");
  const [advanced, setAdvanced] = useState(false);
  const [playMode, setPlayMode] = useState<QuestionBankPlayMode>("instant");
  const [questionPool, setQuestionPool] =
    useState<QuestionBankQuestionPool>("all");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicOptions, setTopicOptions] = useState<LibraryOutlineTag[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [extraTimePrefs, setExtraTimePrefs] = useState<ExtraTimePrefs | null>(
    null,
  );
  const [extraTimeOn, setExtraTimeOn] = useState(false);
  const baseMinutesRef = useRef(autoTimeLimitMinutes(10));

  const singleSubject = subjectKeys.length === 1 ? subjectKeys[0] : null;
  const topicFilterEnabled = advanced && Boolean(singleSubject);
  const extraTimePercent =
    extraTimePrefs && extraTimePrefs.enabled && extraTimePrefs.percentage > 0
      ? extraTimePrefs.percentage
      : 0;
  const canUseExtraTime = extraTimePercent > 0;

  const setMinutesFromBase = (base: number, withExtraTime: boolean) => {
    const safeBase = clamp(roundToStep(base, TIME_STEP), TIME_MIN, TIME_MAX);
    baseMinutesRef.current = safeBase;
    if (withExtraTime && extraTimePercent > 0) {
      const adjusted = applyExtraTimeMinutes(safeBase, extraTimePercent);
      setMinutes(clamp(roundToStep(adjusted, TIME_STEP), TIME_MIN, TIME_MAX));
      return;
    }
    setMinutes(safeBase);
  };

  useEffect(() => {
    if (!open || !originTile) return;
    // Regular mode is always a single subject (the tile you opened from).
    setSubjectKeys([originTile.key as SubjectFilter]);
    const initialCount = 10;
    setQuestionCount(initialCount);
    const initialMinutes = autoTimeLimitMinutes(initialCount);
    baseMinutesRef.current = initialMinutes;
    setMinutes(initialMinutes);
    setDifficultyMix(isMixed ? "Medium" : "Auto");
    setAdvanced(Boolean(isMixed));
    setPlayMode("instant");
    setQuestionPool("all");
    setSelectedTopics([]);
    setTopicOptions([]);
    setTopicsError(null);
    setExtraTimeOn(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, originTile?.key, isMixed]);

  useEffect(() => {
    if (!open || !advanced) return;
    let cancelled = false;
    void fetchExtraTimePrefs().then((prefs) => {
      if (!cancelled) setExtraTimePrefs(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, [open, advanced]);

  useEffect(() => {
    if (!open || !advanced || !topicFilterEnabled || !singleSubject) {
      if (!advanced || !topicFilterEnabled) {
        setTopicsLoading(false);
      }
      return;
    }

    let cancelled = false;
    setTopicsLoading(true);
    setTopicsError(null);

    void fetchLibraryOutline(singleSubject, EMPTY_LIBRARY_FILTERS)
      .then((outline) => {
        if (cancelled) return;
        const verified = outline.tags.filter(
          (t) =>
            t.tag !== UNTAGGED_TOPIC &&
            t.count > 1 &&
            isVerifiedCurriculumTag(t.tag, { subject: singleSubject }),
        );
        setTopicOptions(verified);
        setTopicsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTopicOptions([]);
        setTopicsLoading(false);
        setTopicsError("Could not load topics.");
      });

    return () => {
      cancelled = true;
    };
  }, [open, advanced, topicFilterEnabled, singleSubject]);

  useEffect(() => {
    if (!topicFilterEnabled) {
      setSelectedTopics([]);
    }
  }, [topicFilterEnabled]);

  const handleAdvancedChange = (next: boolean) => {
    setAdvanced(next);
    if (!next && originTile) {
      // Leaving advanced: lock back to a single subject; keep difficulty / time.
      setSubjectKeys([originTile.key as SubjectFilter]);
      setSelectedTopics([]);
      setPlayMode("instant");
      setQuestionPool("all");
      if (extraTimeOn) {
        setExtraTimeOn(false);
        setMinutesFromBase(baseMinutesRef.current, false);
      }
    } else if (next && isMixed && originTile) {
      setSubjectKeys(siblingTiles.map((t) => t.key as SubjectFilter));
    }
  };

  const selectPlayMode = (mode: QuestionBankPlayMode) => {
    if (questionPool === "incorrect" && mode === "exam") return;
    setPlayMode(mode);
  };

  const selectQuestionPool = (next: QuestionBankQuestionPool) => {
    if ((next === "incorrect" || next === "mixed") && previewOnly) return;
    setQuestionPool(next);
    if (next === "incorrect") setPlayMode("instant");
  };

  const handleQuestionCountChange = (count: number) => {
    setQuestionCount(count);
    setMinutesFromBase(autoTimeLimitMinutes(count), extraTimeOn);
  };

  const handleMinutesChange = (next: number) => {
    if (extraTimeOn && extraTimePercent > 0) {
      // Treat edits as the post-extra value; keep base in sync for toggle-off.
      const safeNext = clamp(roundToStep(next, TIME_STEP), TIME_MIN, TIME_MAX);
      setMinutes(safeNext);
      baseMinutesRef.current = clamp(
        roundToStep(safeNext / (1 + extraTimePercent / 100), TIME_STEP),
        TIME_MIN,
        TIME_MAX,
      );
      return;
    }
    setMinutesFromBase(next, false);
  };

  const applyAutoTimeLimit = () => {
    setMinutesFromBase(autoTimeLimitMinutes(questionCount), extraTimeOn);
  };

  const toggleExtraTime = () => {
    if (!canUseExtraTime) return;
    const next = !extraTimeOn;
    setExtraTimeOn(next);
    setMinutesFromBase(baseMinutesRef.current, next);
  };

  const selectSubject = (key: SubjectFilter) => {
    if (!advanced) {
      setSubjectKeys([key]);
      return;
    }
    setSubjectKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const toggleTopic = (tag: string) => {
    setSelectedTopics((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleStart = () => {
    if (!originTile || subjectKeys.length === 0) return;
    const pool: QuestionBankQuestionPool =
      advanced && !previewOnly ? questionPool : "all";
    onConfirm({
      testType: originTile.testType,
      subjects: subjectKeys,
      timeLimitMinutes: minutes,
      questionCount,
      difficulties: difficultiesForMixApi(difficultyMix),
      uiDifficulties: uiDifficultiesForMix(difficultyMix),
      difficultyMix,
      topics: topicFilterEnabled ? selectedTopics : [],
      playMode: advanced && pool !== "incorrect" ? playMode : "instant",
      questionPool: pool,
      extraTimeApplied: advanced && extraTimeOn && canUseExtraTime,
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

  const modalTitle = isMixed && advanced ? "Mixed Practice" : "Session Settings";
  const showSubjectToggles = siblingTiles.length > 1;
  const autoBaseMinutes = autoTimeLimitMinutes(questionCount);
  const expectedAutoMinutes =
    extraTimeOn && extraTimePercent > 0
      ? clamp(
          roundToStep(
            applyExtraTimeMinutes(autoBaseMinutes, extraTimePercent),
            TIME_STEP,
          ),
          TIME_MIN,
          TIME_MAX,
        )
      : autoBaseMinutes;
  const isAutoTime = Math.abs(minutes - expectedAutoMinutes) < 0.001;

  const subjectsBlock =
    showSubjectToggles ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {advanced ? "Subjects" : "Subject"}
          </span>
          <span className="text-xs text-text-muted">
            {advanced ? `${subjectKeys.length} selected` : "One subject"}
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
                onClick={() => selectSubject(key)}
                className={cn(
                  "rounded-organic-md px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                  active
                    ? getSubjectSessionPillActiveClass(key)
                    : SUBJECT_PILL_INACTIVE,
                )}
              >
                {t.key}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  const difficultyBlock = (
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
          </RoadmapInfoPopover>
        </div>
        <span
          key={difficultyMix}
          className="text-xs font-medium text-text-muted"
        >
          {DIFFICULTY_MIX_BLURBS[difficultyMix]}
        </span>
      </div>
      <DifficultyMixSlider value={difficultyMix} onChange={setDifficultyMix} />
    </div>
  );

  const playModeBlock = (
    <div className="space-y-3">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Play mode
      </span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => selectPlayMode("instant")}
          className={cn(
            "rounded-organic-lg px-4 py-3 text-sm font-semibold transition-colors",
            playMode === "instant" || questionPool === "incorrect"
              ? "bg-secondary text-background"
              : "bg-surface text-text hover:bg-surface-mid",
          )}
        >
          Practice
        </button>
        <button
          type="button"
          onClick={() => selectPlayMode("exam")}
          disabled={questionPool === "incorrect"}
          className={cn(
            "rounded-organic-lg px-4 py-3 text-sm font-semibold transition-colors",
            playMode === "exam" && questionPool !== "incorrect"
              ? "bg-[#6b4a72] text-white"
              : "bg-surface text-text hover:bg-surface-mid",
            questionPool === "incorrect" &&
              "cursor-not-allowed opacity-45 hover:bg-surface",
          )}
        >
          Exam mode
        </button>
      </div>
    </div>
  );

  const questionPoolBlock = (
    <div className="space-y-3">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Question pool
      </span>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: "all", label: "All" },
            { id: "mixed", label: "Mixed" },
            { id: "incorrect", label: "Incorrect" },
          ] as const
        ).map((option) => {
          const needsAuth = option.id !== "all";
          const active = questionPool === option.id;
          const disabled = needsAuth && previewOnly;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectQuestionPool(option.id)}
              disabled={disabled}
              title={
                disabled
                  ? "Sign in with full access to use this pool"
                  : option.id === "incorrect"
                    ? "Only questions you have gotten wrong at least once"
                    : option.id === "mixed"
                      ? "Blend prior incorrect questions with new ones"
                      : undefined
              }
              className={cn(
                "rounded-organic-lg px-2 py-3 text-sm font-semibold transition-colors sm:px-3",
                active
                  ? "bg-secondary text-background"
                  : "bg-surface text-text hover:bg-surface-mid",
                disabled &&
                  "cursor-not-allowed opacity-45 hover:bg-surface",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const topicsBlock = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Curriculum topics
        </span>
        {topicFilterEnabled && selectedTopics.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelectedTopics([])}
            className="text-xs font-medium text-text-muted hover:text-text"
          >
            Clear ({selectedTopics.length})
          </button>
        ) : null}
      </div>

      {!topicFilterEnabled ? (
        <p className="rounded-organic-lg bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">
          Topic filter needs exactly one subject. Deselect extras in Subjects
          above to filter by curriculum topic.
        </p>
      ) : topicsLoading ? (
        <p className="text-xs text-text-muted">Loading topics…</p>
      ) : topicsError ? (
        <p className="text-xs text-text-muted">{topicsError}</p>
      ) : topicOptions.length === 0 ? (
        <p className="text-xs text-text-muted">
          No verified curriculum topics with more than one question for this
          subject yet.
        </p>
      ) : (
        <div className="flex max-h-[min(28vh,240px)] flex-wrap content-start gap-2 overflow-y-auto overflow-x-hidden">
          {topicOptions.map((topic) => {
            const active = selectedTopics.includes(topic.tag);
            return (
              <button
                key={topic.tag}
                type="button"
                onClick={() => toggleTopic(topic.tag)}
                className={cn(
                  "rounded-organic-md px-3 py-2 text-left text-xs font-medium transition-colors",
                  active
                    ? "bg-secondary text-background"
                    : "bg-surface text-text hover:bg-surface-mid",
                )}
                title={topic.tag}
              >
                <span>{topic.label}</span>
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    active ? "text-background/70" : "text-text-muted",
                  )}
                >
                  {topic.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const timeQuestionsBlock = (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      <div className="space-y-3">
        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Time Limit
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
            onClick={applyAutoTimeLimit}
            disabled={isAutoTime}
            title={`Reset to ${formatStepperValue(expectedAutoMinutes, TIME_STEP)} min (90s per question${extraTimeOn && extraTimePercent > 0 ? ` +${extraTimePercent}%` : ""})`}
            className={cn(
              "flex min-h-14 shrink-0 items-center gap-1.5 self-stretch rounded-organic-lg px-3 text-xs font-semibold transition-colors",
              "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text",
              "disabled:cursor-default disabled:opacity-45 disabled:hover:bg-surface-elevated disabled:hover:text-text-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35",
            )}
            aria-label={`Reset time limit to ${formatStepperValue(expectedAutoMinutes, TIME_STEP)} minutes`}
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
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-settings-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/85"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-[101] flex w-full max-w-[960px] max-h-[min(94vh,920px)] flex-col overflow-hidden rounded-[4px] bg-surface p-8 sm:p-10"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <h2
                id="session-settings-title"
                className="text-lg font-semibold text-text sm:text-xl"
              >
                {modalTitle}
              </h2>
              <p className="text-sm text-text-muted">
                {previewOnly
                  ? "Preview session options. Turn on Advanced for more controls."
                  : "Configure your practice session before you start."}
              </p>
              {previewOnly ? (
                <p className="text-xs text-text-muted">
                  You are not on full access, so Start may open a free preview
                  instead of a full exam/practice session.
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-3 pt-0.5">
              <AdvancedToggle
                checked={advanced}
                onCheckedChange={handleAdvancedChange}
              />
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
                aria-label="Close session settings"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Stable core: stays put when Advanced opens */}
          <div
            className={cn(
              "mt-8 grid gap-6 lg:gap-8",
              showSubjectToggles ? "lg:grid-cols-2" : "grid-cols-1",
            )}
          >
            {subjectsBlock}
            {difficultyBlock}
          </div>
          <div className="mt-8">{timeQuestionsBlock}</div>

          {/* Advanced panel: expands below without reshuffling the core */}
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              advanced ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
            aria-hidden={!advanced}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  "mt-6 space-y-5 rounded-[4px] bg-surface-elevated/55 px-4 py-5 sm:px-5",
                  "transition-opacity duration-300 ease-out",
                  advanced
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text">
                    Advanced options
                  </h3>
                  <span className="text-[11px] text-text-muted">
                    Play style, pool, and topics
                  </span>
                </div>

                <div className="grid grid-cols-2 items-start gap-4 sm:gap-6">
                  {playModeBlock}
                  {questionPoolBlock}
                </div>
                {questionPool === "incorrect" ? (
                  <p className="text-xs leading-relaxed text-text-muted">
                    Any prior wrong attempt counts, even if you later got it
                    right. Unique questions only; stops at how many you have.
                  </p>
                ) : questionPool === "mixed" ? (
                  <p className="text-xs leading-relaxed text-text-muted">
                    About half prior incorrect, half new. Unique questions only.
                  </p>
                ) : null}

                <div className="space-y-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Access arrangements
                  </span>
                  <button
                    type="button"
                    onClick={toggleExtraTime}
                    disabled={!canUseExtraTime}
                    title={
                      canUseExtraTime
                        ? extraTimeOn
                          ? `Remove +${extraTimePercent}% from the time limit`
                          : `Apply +${extraTimePercent}% to the time limit`
                        : "Enable extra time in your profile to use this"
                    }
                    className={cn(
                      "rounded-organic-lg px-4 py-3 text-sm font-semibold transition-colors",
                      extraTimeOn && canUseExtraTime
                        ? "bg-secondary text-background"
                        : "bg-surface text-text hover:bg-surface-mid",
                      !canUseExtraTime &&
                        "cursor-not-allowed opacity-45 hover:bg-surface",
                    )}
                  >
                    {canUseExtraTime
                      ? `Extra time (+${extraTimePercent}%)`
                      : "Extra time"}
                  </button>
                  {extraTimeOn && canUseExtraTime ? (
                    <p className="text-xs leading-relaxed text-text-muted">
                      Time limit includes your +{extraTimePercent}% arrangement.
                      Base time stays {formatStepperValue(baseMinutesRef.current, TIME_STEP)} min.
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-transparent pt-1">
                  {topicsBlock}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex shrink-0 justify-end pt-2">
          <button
            type="button"
            onClick={handleStart}
            className={cn(
              "inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-[4px] px-8 sm:w-auto",
              "bg-secondary text-background text-sm font-semibold shadow-none",
              "hover:bg-secondary/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              advanced &&
                playMode === "exam" &&
                questionPool !== "incorrect" &&
                "bg-[#6b4a72] hover:bg-[#5d3f63]",
            )}
          >
            {advanced && playMode === "exam" && questionPool !== "incorrect"
              ? "Start exam session"
              : questionPool === "incorrect"
                ? "Start incorrect drill"
                : "Start your session"}
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
