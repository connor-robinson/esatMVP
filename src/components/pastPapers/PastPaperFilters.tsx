"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ESAT_MODULES,
  PAST_PAPER_EXAMS,
  PAST_PAPER_YEARS,
  type EsatModule,
  type MappingStatus,
  type PastPaperExam,
  type RelevanceLevel,
} from "@/content/pastPapers";

export type PastPaperFilterState = {
  exam: PastPaperExam | "all";
  /** A year as a string, "specimen" for undated papers, or "all". */
  year: string;
  module: EsatModule | "all";
  relevance: RelevanceLevel | "all";
  mappingStatus: MappingStatus | "all";
  hasAnswerKey: boolean;
  hasWorkedSolutions: boolean;
};

export const DEFAULT_PAPER_FILTERS: PastPaperFilterState = {
  exam: "all",
  year: "all",
  module: "all",
  relevance: "all",
  mappingStatus: "all",
  hasAnswerKey: false,
  hasWorkedSolutions: false,
};

const RELEVANCE_LABELS: Record<RelevanceLevel, string> = {
  high: "Closest to ESAT",
  medium: "Partly relevant",
  low: "Supplementary",
};

const MAPPING_LABELS: Record<MappingStatus, string> = {
  verified: "Checked against the PDF",
  likely: "Probable match",
  unverified: "Not mapped yet",
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
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#93C5FD]">
        {label}
      </span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl bg-white/[0.07] px-3.5 py-2.5 pr-9 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-[#3B82F6] [&>option]:bg-[#161D2F] [&>option]:text-white"
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
        />
      </span>
    </label>
  );
}

function Toggle({
  label,
  pressed,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
        pressed
          ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          : "bg-white/[0.07] text-[#CBD5E1] hover:bg-white/[0.1]",
      )}
    >
      {label}
    </button>
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
    <div className={cn("rounded-2xl bg-[#161D2F] p-5 sm:p-6", className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Exam"
          value={value.exam}
          onChange={(next) => set("exam", next as PastPaperFilterState["exam"])}
        >
          <option value="all">All exams</option>
          {PAST_PAPER_EXAMS.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </Select>

        <Select label="Year" value={value.year} onChange={(next) => set("year", next)}>
          <option value="all">All years</option>
          {PAST_PAPER_YEARS.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
          <option value="specimen">Specimen (undated)</option>
        </Select>

        <Select
          label="ESAT module"
          value={value.module}
          onChange={(next) => set("module", next as PastPaperFilterState["module"])}
        >
          <option value="all">Any module</option>
          {ESAT_MODULES.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </Select>

        <Select
          label="Relevance"
          value={value.relevance}
          onChange={(next) =>
            set("relevance", next as PastPaperFilterState["relevance"])
          }
        >
          <option value="all">Any relevance</option>
          {(Object.keys(RELEVANCE_LABELS) as RelevanceLevel[]).map((level) => (
            <option key={level} value={level}>
              {RELEVANCE_LABELS[level]}
            </option>
          ))}
        </Select>

        <Select
          label="Mapping status"
          value={value.mappingStatus}
          onChange={(next) =>
            set("mappingStatus", next as PastPaperFilterState["mappingStatus"])
          }
        >
          <option value="all">Any status</option>
          {(Object.keys(MAPPING_LABELS) as MappingStatus[]).map((status) => (
            <option key={status} value={status}>
              {MAPPING_LABELS[status]}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#93C5FD]">
            Must include
          </span>
          <div className="flex flex-wrap gap-2">
            <Toggle
              label="Answer key"
              pressed={value.hasAnswerKey}
              onToggle={() => set("hasAnswerKey", !value.hasAnswerKey)}
            />
            <Toggle
              label="Worked answers"
              pressed={value.hasWorkedSolutions}
              onToggle={() => set("hasWorkedSolutions", !value.hasWorkedSolutions)}
            />
          </div>
        </div>
      </div>

      <div
        className="mt-5 flex flex-wrap items-center justify-between gap-3"
        aria-live="polite"
      >
        <p className="text-sm text-[#94A3B8]">
          Showing{" "}
          <span className="font-bold text-white">
            {resultCount} of {totalCount}
          </span>{" "}
          official resources
        </p>
        {isFiltered ? (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_PAPER_FILTERS)}
            className="rounded-xl bg-white/[0.07] px-3.5 py-2 text-sm font-bold text-white outline-none transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
