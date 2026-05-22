"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaperType, ESATSubject, TMUASubject } from "@/types/review";

const ESAT_SUBJECTS: ESATSubject[] = [
  "Math 1",
  "Math 2",
  "Physics",
  "Chemistry",
  "Biology",
];
const TMUA_SUBJECTS: TMUASubject[] = ["Paper 1", "Paper 2"];

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Extreme"] as const;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "pending_review", label: "Pending review" },
  { value: "needs_revision", label: "Needs revision" },
  { value: "approved", label: "Approved" },
  { value: "deleted", label: "Deleted" },
  { value: "rejected", label: "Rejected" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "updated_desc", label: "Updated · newest" },
  { value: "created_desc", label: "Created · newest" },
  { value: "created_asc", label: "Created · oldest" },
  { value: "diagrams_first", label: "Diagrams first" },
];

export type DashboardFilterState = {
  paperType: PaperType;
  sort: string;
  subjects: string[];
  difficulties: string[];
  statuses: string[];
  hasVideoOnly: boolean;
  /** schema_reclass_review_tier is set (prefix/id change review). */
  schemaReclassOnly: boolean;
};

type ReviewDashboardFiltersProps = {
  state: DashboardFilterState;
  onPaperType: (type: PaperType) => void;
  onSort: (sort: string) => void;
  onToggleSubject: (subject: string) => void;
  onToggleDifficulty: (d: string) => void;
  onToggleStatus: (s: string) => void;
  onToggleHasVideo: () => void;
  onToggleSchemaReclass: () => void;
  onClear: () => void;
  lookupError: string | null;
  onClearLookupError: () => void;
  onJumpToQuestion: (raw: string) => void | Promise<void>;
};

export function ReviewDashboardFilters({
  state,
  onPaperType,
  onSort,
  onToggleSubject,
  onToggleDifficulty,
  onToggleStatus,
  onToggleHasVideo,
  onToggleSchemaReclass,
  onClear,
  lookupError,
  onClearLookupError,
  onJumpToQuestion,
}: ReviewDashboardFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [jumpBusy, setJumpBusy] = useState(false);

  const subjectPool: string[] =
    state.paperType === "TMUA"
      ? [...TMUA_SUBJECTS]
      : state.paperType === "ESAT"
        ? [...ESAT_SUBJECTS]
        : [...ESAT_SUBJECTS, ...TMUA_SUBJECTS];

  const pill = (active: boolean) =>
    cn(
      "px-3 py-2 rounded-organic-md text-xs font-mono transition-all border",
      active
        ? "bg-primary/30 text-primary-light border-primary/50"
        : "bg-white/5 text-white/60 hover:bg-white/10 border-white/10"
    );

  const activeFilterCount =
    (state.paperType !== "All" ? 1 : 0) +
    (state.sort !== "updated_desc" ? 1 : 0) +
    state.subjects.length +
    state.difficulties.length +
    state.statuses.length +
    (state.hasVideoOnly ? 1 : 0) +
    (state.schemaReclassOnly ? 1 : 0);

  const submitJump = async () => {
    if (jumpBusy) return;
    setJumpBusy(true);
    try {
      await onJumpToQuestion(jumpInput);
    } finally {
      setJumpBusy(false);
    }
  };

  return (
    <div className="rounded-organic-lg border border-white/10 bg-white/[0.03] p-4 space-y-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-2 text-left min-w-0 group"
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? (
            <ChevronDown
              className="w-4 h-4 text-white/50 shrink-0 group-hover:text-white/70"
              strokeWidth={2.5}
              aria-hidden
            />
          ) : (
            <ChevronRight
              className="w-4 h-4 text-white/50 shrink-0 group-hover:text-white/70"
              strokeWidth={2.5}
              aria-hidden
            />
          )}
          <div>
            <h2 className="text-sm font-mono text-white/70 uppercase tracking-wide">
              Filter &amp; sort
            </h2>
            {!filtersOpen && (
              <p className="text-xs font-mono text-white/40 mt-0.5">
                {activeFilterCount > 0
                  ? `${activeFilterCount} active — expand to edit`
                  : "Collapsed — expand to show filters"}
              </p>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-mono text-white/45 hover:text-primary-light underline-offset-2 hover:underline shrink-0"
        >
          Clear all
        </button>
      </div>

      {filtersOpen ? (
        <div className="space-y-4 border-t border-white/10 pt-4">
      <div>
        <label className="text-xs font-mono text-white/50 mb-2 block">Exam</label>
        <div className="flex flex-wrap gap-2">
          {(["All", "TMUA", "ESAT"] as PaperType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onPaperType(type)}
              className={pill(state.paperType === type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-mono text-white/50 mb-2 block">Sort</label>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSort(opt.value)}
              className={pill(state.sort === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-mono text-white/50 mb-2 block">
          Subject
          {state.subjects.length > 0 ? ` (${state.subjects.length})` : ""}
        </label>
        <div className="flex flex-wrap gap-2">
          {subjectPool.map((subject) => {
            const on = state.subjects.includes(subject);
            return (
              <button
                key={subject}
                type="button"
                onClick={() => onToggleSubject(subject)}
                className={pill(on)}
              >
                {subject}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-mono text-white/50 mb-2 block">
          Difficulty
          {state.difficulties.length > 0 ? ` (${state.difficulties.length})` : ""}
        </label>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onToggleDifficulty(d)}
              className={pill(state.difficulties.includes(d))}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-mono text-white/50 mb-2 block">
          Status
          {state.statuses.length > 0 ? ` (${state.statuses.length})` : ""}
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onToggleStatus(value)}
              className={pill(state.statuses.includes(value))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-mono text-white/50 mb-2 block">Media</label>
        <button
          type="button"
          onClick={onToggleHasVideo}
          className={pill(state.hasVideoOnly)}
        >
          Walkthrough video attached
        </button>
      </div>

      <div>
        <label className="text-xs font-mono text-white/50 mb-2 block">
          Schema reclassification
        </label>
        <button
          type="button"
          onClick={onToggleSchemaReclass}
          className={pill(state.schemaReclassOnly)}
        >
          Only questions with schema changes
        </button>
      </div>
        </div>
      ) : null}

      <div className="border-t border-white/10 pt-4 space-y-2">
        <label className="text-xs font-mono text-white/50 block" htmlFor="review-dashboard-jump">
          Open in reviewer
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none"
              strokeWidth={2.2}
              aria-hidden
            />
            <input
              id="review-dashboard-jump"
              type="search"
              value={jumpInput}
              onChange={(e) => {
                setJumpInput(e.target.value);
                if (lookupError) onClearLookupError();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitJump();
              }}
              placeholder="Question UUID or walkthrough code (e.g. AB12)"
              autoComplete="off"
              className="w-full pl-10 pr-3 py-2.5 rounded-organic-md bg-white/5 border border-white/10 text-sm font-mono text-white/90 placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/40"
            />
          </div>
          <button
            type="button"
            onClick={() => void submitJump()}
            disabled={jumpBusy || !jumpInput.trim()}
            className={cn(
              "sm:w-auto w-full px-4 py-2.5 rounded-organic-md text-sm font-mono font-medium border transition-colors shrink-0",
              jumpBusy || !jumpInput.trim()
                ? "border-white/10 bg-white/5 text-white/35 cursor-not-allowed"
                : "border-primary/45 bg-primary/15 text-primary-light hover:bg-primary/25"
            )}
          >
            {jumpBusy ? "…" : "Go"}
          </button>
        </div>
        {lookupError ? (
          <p className="text-xs font-mono text-[#ef7d7d]/90 leading-snug">{lookupError}</p>
        ) : (
          <p className="text-xs font-mono text-white/35 leading-snug">
            Jump straight to the queue tab for that row (full UUID from the list, or the 4-character
            iPad walkthrough code).
          </p>
        )}
      </div>
    </div>
  );
}
