"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ESAT_MODULES,
  PAST_PAPER_EXAMS,
  PAST_PAPER_YEARS,
  type EsatModule,
  type PastPaperExam,
} from "@/content/pastPapers";

export type PastPaperFilterState = {
  exam: PastPaperExam | "all";
  /** A year as a string, "specimen" for undated papers, or "all". */
  year: string;
  module: EsatModule | "all";
  hasWorkedSolutions: boolean;
};

export const DEFAULT_PAPER_FILTERS: PastPaperFilterState = {
  exam: "all",
  year: "all",
  module: "all",
  hasWorkedSolutions: false,
};

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-[8.5rem] flex-1 items-center gap-2 text-sm">
      <span className="shrink-0 text-[#64748B]">{label}</span>
      <span className="relative min-w-0 flex-1">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none bg-transparent py-1 pr-6 text-sm text-white outline-none [&>option]:bg-[#161D2F] [&>option]:text-white"
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]"
        />
      </span>
    </label>
  );
}

export function PastPaperFilters({
  value,
  onChange,
  resultCount,
  totalCount,
  className,
}: {
  value: PastPaperFilterState;
  onChange: (next: PastPaperFilterState) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}) {
  const set = <K extends keyof PastPaperFilterState>(
    key: K,
    next: PastPaperFilterState[K],
  ) => onChange({ ...value, [key]: next });

  const isFiltered =
    JSON.stringify(value) !== JSON.stringify(DEFAULT_PAPER_FILTERS);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          label="Exam"
          value={value.exam}
          onChange={(next) => set("exam", next as PastPaperFilterState["exam"])}
        >
          <option value="all">All</option>
          {PAST_PAPER_EXAMS.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </Select>

        <Select label="Year" value={value.year} onChange={(next) => set("year", next)}>
          <option value="all">All</option>
          {PAST_PAPER_YEARS.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
          <option value="specimen">Specimen</option>
        </Select>

        <Select
          label="Module"
          value={value.module}
          onChange={(next) => set("module", next as PastPaperFilterState["module"])}
        >
          <option value="all">Any</option>
          {ESAT_MODULES.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-2 text-sm text-[#94A3B8]">
          <input
            type="checkbox"
            checked={value.hasWorkedSolutions}
            onChange={() => set("hasWorkedSolutions", !value.hasWorkedSolutions)}
            className="h-3.5 w-3.5 rounded-sm border-0 bg-white/10 text-[#3B82F6] focus:ring-0"
          />
          Worked answers only
        </label>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3"
        aria-live="polite"
      >
        <p className="text-sm text-[#64748B]">
          {resultCount} of {totalCount}
        </p>
        {isFiltered ? (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_PAPER_FILTERS)}
            className="text-sm text-[#94A3B8] hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
