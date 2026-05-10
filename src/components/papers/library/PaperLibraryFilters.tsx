"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Paper } from "@/types/papers";

interface PaperLibraryFiltersProps {
  papers: Paper[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  examFilter: string | "ALL";
  onExamFilterChange: (value: string | "ALL") => void;
  yearFilter: number | "ALL";
  onYearFilterChange: (value: number | "ALL") => void;
  typeFilter: string | "ALL";
  onTypeFilterChange: (value: string | "ALL") => void;
}

function Dropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string | number | "ALL";
  onChange: (value: string | number | "ALL") => void;
  options: Array<{ value: string | number | "ALL"; label: string }>;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex h-10 items-center gap-2 rounded-lg bg-surface-mid px-4 text-sm font-medium text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none"
      >
        <span>{selected}</span>
        <ChevronDown
          className={cn(
            "h-[14px] w-[14px] shrink-0 text-text-muted transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          strokeWidth={2.5}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
              className="absolute left-0 top-full z-[9999] mt-1.5 min-w-[160px] overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
            >
              {options.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={cn(
                    "flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors",
                    value === opt.value
                      ? "bg-accent/10 font-medium text-text"
                      : "text-text-muted hover:bg-surface-subtle hover:text-text"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PaperLibraryFilters({
  papers,
  searchQuery,
  onSearchChange,
  examFilter,
  onExamFilterChange,
  yearFilter,
  onYearFilterChange,
  typeFilter,
  onTypeFilterChange,
}: PaperLibraryFiltersProps) {
  const { exams, years, types } = useMemo(() => {
    const examSet = new Set<string>();
    const yearSet = new Set<number>();
    const typeSet = new Set<string>();

    papers.forEach((paper) => {
      examSet.add(paper.examName);
      yearSet.add(paper.examYear);
      if (paper.examType) typeSet.add(paper.examType);
    });

    return {
      exams: Array.from(examSet).sort(),
      years: Array.from(yearSet).sort((a, b) => b - a),
      types: Array.from(typeSet).sort(),
    };
  }, [papers]);

  return (
    <div className="rounded-organic-lg bg-surface px-5 py-5">
      {/* Header row */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-base font-semibold text-text">Filters</h2>
        <p className="max-w-md text-sm text-text-muted sm:text-right">
          Search and filter papers by exam, year, and type to find what you need.
        </p>
      </div>

      {/* Inputs row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={2}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by exam, paper, or year..."
            className="h-10 w-full rounded-lg bg-surface-elevated pl-9 pr-4 text-sm text-text placeholder:text-text-muted transition-colors focus-visible:outline-none"
          />
        </div>

        {/* Dropdowns */}
        <Dropdown
          value={examFilter}
          onChange={(v) => onExamFilterChange(v as string | "ALL")}
          options={[{ value: "ALL", label: "All exams" }, ...exams.map((e) => ({ value: e, label: e }))]}
          placeholder="All exams"
        />
        <Dropdown
          value={yearFilter}
          onChange={(v) => onYearFilterChange(v === "ALL" ? "ALL" : (v as number))}
          options={[{ value: "ALL", label: "All years" }, ...years.map((y) => ({ value: y, label: String(y) }))]}
          placeholder="All years"
        />
        <Dropdown
          value={typeFilter}
          onChange={(v) => onTypeFilterChange(v as string | "ALL")}
          options={[{ value: "ALL", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))]}
          placeholder="All types"
        />
      </div>
    </div>
  );
}
