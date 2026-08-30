"use client";

import { cn } from "@/lib/utils";
import type { DownloadExam } from "@/data/pastPapersDownload";

export type DownloadFilterExam = DownloadExam | "all";
export type DownloadFilterYear = number | "all";

type Props = {
  exam: DownloadFilterExam;
  year: DownloadFilterYear;
  years: readonly number[];
  onExamChange: (exam: DownloadFilterExam) => void;
  onYearChange: (year: DownloadFilterYear) => void;
  fixedExam?: DownloadExam;
  className?: string;
};

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maths/50",
        active
          ? "bg-maths/15 text-text"
          : "text-text-muted hover:bg-surface-elevated hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

export function PastPaperDownloadFilters({
  exam,
  year,
  years,
  onExamChange,
  onYearChange,
  fixedExam,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {!fixedExam ? (
        <div
          role="group"
          aria-label="Filter by exam"
          className="flex flex-wrap items-center gap-1"
        >
          {(["all", "NSAA", "ENGAA"] as const).map((value) => (
            <FilterPill
              key={value}
              active={exam === value}
              onClick={() => onExamChange(value)}
            >
              {value === "all" ? "All" : value}
            </FilterPill>
          ))}
        </div>
      ) : null}

      {years.length > 1 ? (
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <span className="sr-only">Filter by year</span>
          <select
            value={year === "all" ? "all" : String(year)}
            onChange={(event) => {
              const next = event.target.value;
              onYearChange(next === "all" ? "all" : Number(next));
            }}
            className="rounded-lg bg-surface-elevated px-2.5 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-maths/50"
          >
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
