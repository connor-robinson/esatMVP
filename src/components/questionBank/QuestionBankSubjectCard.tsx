"use client";

import {
  Atom,
  ClipboardList,
  Clock,
  FlaskConical,
  FunctionSquare,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectKey, SubjectTileConfig } from "@/lib/questionBank/subjectTiles";
import { subjectShortTitle } from "@/lib/questionBank/subjectTiles";

const SUBJECT_ICONS: Record<SubjectKey, LucideIcon> = {
  "Math 1": FunctionSquare,
  "Math 2": FunctionSquare,
  Physics: Atom,
  Chemistry: FlaskConical,
  Biology: Leaf,
  "Paper 1": FunctionSquare,
  "Paper 2": FunctionSquare,
};

const TOPIC_PILL_CLASS: Record<SubjectKey, string> = {
  "Math 1": "bg-maths/20 text-maths",
  "Math 2": "bg-maths/20 text-maths",
  Physics: "bg-physics/20 text-physics",
  Chemistry: "bg-chemistry/20 text-chemistry",
  Biology: "bg-biology/20 text-biology",
  "Paper 1": "bg-maths/20 text-maths",
  "Paper 2": "bg-physics/20 text-physics",
};

interface QuestionBankSubjectCardProps {
  tile: SubjectTileConfig;
  stats: { attempted: number; total: number; loading: boolean };
  onStart: () => void;
}

export function QuestionBankSubjectCard({
  tile,
  stats,
  onStart,
}: QuestionBankSubjectCardProps) {
  const Icon = SUBJECT_ICONS[tile.key];
  const pct =
    stats.total > 0
      ? Math.min(100, Math.round((stats.attempted / stats.total) * 100))
      : 0;
  const mins = stats.total > 0 ? Math.max(1, Math.ceil(stats.total * 1.5)) : 0;
  const canStart = !stats.loading && stats.total > 0;
  const progressLabel = stats.loading
    ? "Loading…"
    : stats.total === 0
      ? "Not started yet"
      : `${stats.attempted} / ${stats.total} attempted · ${pct}%`;

  return (
    <article
      className={cn(
        "flex flex-col rounded-organic-lg bg-surface-elevated p-5 transition-colors",
        "hover:bg-surface-mid/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-organic-md",
            "bg-surface-neutral/60",
          )}
        >
          <Icon className={cn("h-5 w-5", tile.titleClass)} aria-hidden />
        </div>
        <span className="rounded-organic-sm bg-surface-mid px-2.5 py-1 text-xs font-medium text-text-muted">
          {tile.testType}
        </span>
      </div>

      <div className="mt-4">
        <h3 className={cn("text-lg font-semibold leading-snug", tile.titleClass)}>
          {subjectShortTitle(tile)}
        </h3>
        <span
          className={cn(
            "mt-2 inline-block rounded-organic-sm px-2.5 py-1 text-xs font-medium",
            TOPIC_PILL_CLASS[tile.key],
          )}
        >
          {tile.topicCaps}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-text-muted">
        <span className="flex items-center gap-1.5 tabular-nums">
          <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {stats.loading ? "…" : `${stats.total} questions`}
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {stats.loading ? "…" : stats.total === 0 ? "—" : `~${mins} min`}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs text-text-muted">{progressLabel}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-neutral">
          <div
            className={cn("h-full rounded-full transition-[width]", tile.accentBarClass)}
            style={{ width: `${stats.loading ? 0 : pct}%`, opacity: 0.85 }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className={cn(
          "mt-5 w-full rounded-organic-md px-4 py-2.5 text-sm font-semibold transition-opacity",
          "disabled:cursor-not-allowed disabled:opacity-40",
          tile.startBtnClass,
        )}
      >
        {stats.total === 0 && !stats.loading ? "No questions yet" : "Start session"}
      </button>
    </article>
  );
}

export function QuestionBankSubjectCardSkeleton() {
  return (
    <div
      className="flex flex-col rounded-organic-lg bg-surface-elevated p-5 animate-pulse"
      aria-hidden
    >
      <div className="flex justify-between">
        <div className="h-11 w-11 rounded-organic-md bg-surface-neutral/50" />
        <div className="h-6 w-12 rounded-organic-sm bg-surface-neutral/50" />
      </div>
      <div className="mt-4 h-5 w-2/3 rounded bg-surface-neutral/50" />
      <div className="mt-2 h-4 w-1/2 rounded bg-surface-neutral/40" />
      <div className="mt-6 h-3 w-full rounded-full bg-surface-neutral/40" />
      <div className="mt-5 h-10 w-full rounded-organic-md bg-surface-neutral/50" />
    </div>
  );
}

export function QuestionBankComingSoonCard() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-organic-lg bg-surface-elevated/40 px-4 text-center">
      <FunctionSquare className="h-8 w-8 text-text-muted/50" aria-hidden />
      <p className="mt-3 text-sm font-medium text-text-muted">More subjects soon</p>
      <p className="mt-1 max-w-[12rem] text-xs text-text-muted/80">
        Additional exam sections will appear here as they are added
      </p>
    </div>
  );
}
