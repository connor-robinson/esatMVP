"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
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
    <div className="relative min-w-0 flex-1 sm:max-w-[11rem]" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-organic-md bg-surface-mid px-3 text-sm font-medium text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none"
      >
        <span className="truncate">{selected}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          strokeWidth={2.5}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
              className="absolute left-0 top-full z-[9999] mt-1.5 min-w-[160px] overflow-hidden rounded-organic-md bg-surface-elevated shadow-lg"
            >
              {options.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors",
                    value === opt.value
                      ? "bg-accent/10 font-medium text-text"
                      : "text-text-muted hover:bg-surface-subtle hover:text-text",
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeFilterCount = [
    examFilter !== "ALL",
    yearFilter !== "ALL",
    typeFilter !== "ALL",
  ].filter(Boolean).length;

  const clearFilters = () => {
    onExamFilterChange("ALL");
    onYearFilterChange("ALL");
    onTypeFilterChange("ALL");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            strokeWidth={2}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search exam, paper, or year…"
            className={cn(
              "h-8 w-full rounded-organic-md bg-surface-mid pl-9 pr-3 text-sm text-text placeholder:text-text-muted",
              "border-0 outline-none shadow-none ring-0",
              "focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0",
            )}
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-organic-md px-2.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
            "focus-visible:outline-none",
            filtersOpen || activeFilterCount > 0
              ? "bg-surface-neutral text-text"
              : "bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
          )}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 ? (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-background">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              filtersOpen && "rotate-180",
            )}
            strokeWidth={2.5}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Dropdown
                value={examFilter}
                onChange={(v) => onExamFilterChange(v as string | "ALL")}
                options={[
                  { value: "ALL", label: "All exams" },
                  ...exams.map((e) => ({ value: e, label: e })),
                ]}
                placeholder="All exams"
              />
              <Dropdown
                value={yearFilter}
                onChange={(v) =>
                  onYearFilterChange(v === "ALL" ? "ALL" : (v as number))
                }
                options={[
                  { value: "ALL", label: "All years" },
                  ...years.map((y) => ({ value: y, label: String(y) })),
                ]}
                placeholder="All years"
              />
              <Dropdown
                value={typeFilter}
                onChange={(v) => onTypeFilterChange(v as string | "ALL")}
                options={[
                  { value: "ALL", label: "All types" },
                  ...types.map((t) => ({ value: t, label: t })),
                ]}
                placeholder="All types"
              />
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 shrink-0 px-2 text-xs font-medium text-text-muted transition-colors hover:text-text"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
