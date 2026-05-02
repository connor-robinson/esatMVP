"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SubjectFilter, DifficultyFilter, AttemptedFilter, AttemptResultFilter } from "@/types/questionBank";

interface QuestionLibraryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  subjectFilter: SubjectFilter | SubjectFilter[] | "ALL";
  onSubjectFilterChange: (value: SubjectFilter | SubjectFilter[] | "ALL") => void;
  difficultyFilter: DifficultyFilter | DifficultyFilter[] | "ALL";
  onDifficultyFilterChange: (value: DifficultyFilter | DifficultyFilter[] | "ALL") => void;
  attemptedStatusFilter: AttemptedFilter;
  onAttemptedStatusFilterChange: (value: AttemptedFilter) => void;
  attemptResultFilter: AttemptResultFilter | AttemptResultFilter[] | "ALL";
  onAttemptResultFilterChange: (value: AttemptResultFilter | AttemptResultFilter[] | "ALL") => void;
}

const subjects: SubjectFilter[] = ["Math 1", "Math 2", "Physics", "Chemistry", "Biology"];
const difficulties: DifficultyFilter[] = ["Easy", "Medium", "Hard"];
const attemptedStatuses: AttemptedFilter[] = ["Mix", "New", "Attempted"];

function getAttemptResultOptions(status: AttemptedFilter): Array<{ value: "ALL" | string; label: string }> {
  let available: string[] = [];
  if (status === "New") available = ["Unseen"];
  else if (status === "Attempted") available = ["Mixed Results", "Incorrect Before"];
  else available = ["Mixed Results", "Unseen", "Incorrect Before"];
  return [{ value: "ALL", label: "All results" }, ...available.map((r) => ({ value: r, label: r }))];
}

function Dropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  multi = false,
}: {
  value: T | T[] | "ALL";
  onChange: (value: T | T[] | "ALL") => void;
  options: Array<{ value: T | "ALL"; label: string }>;
  placeholder: string;
  multi?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const getLabel = () => {
    if (value === "ALL") return placeholder;
    if (Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1) return options.find((o) => o.value === value[0])?.label ?? placeholder;
      return `${value.length} selected`;
    }
    return options.find((o) => o.value === value)?.label ?? placeholder;
  };

  const isSelected = (optVal: string) => {
    if (optVal === "ALL") return value === "ALL";
    if (Array.isArray(value)) return value.includes(optVal as T);
    return value === optVal;
  };

  const handleClick = (optVal: T | "ALL") => {
    if (optVal === "ALL") {
      onChange("ALL");
    } else if (multi) {
      const arr = Array.isArray(value) ? value : value === "ALL" ? [] : [value as T];
      const next = arr.includes(optVal as T)
        ? arr.filter((v) => v !== optVal)
        : [...arr, optVal as T];
      onChange(next.length > 0 ? next : "ALL");
    } else {
      onChange(optVal as T);
    }
    if (!multi) setIsOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex h-10 items-center gap-2 rounded-lg border border-border-subtle bg-surface-mid px-4 text-sm font-medium text-text transition-colors hover:border-border hover:bg-surface-neutral focus-visible:outline-none"
      >
        <span className="max-w-[140px] truncate">{getLabel()}</span>
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
                  onClick={() => handleClick(opt.value as T | "ALL")}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                    isSelected(String(opt.value))
                      ? "bg-accent/10 font-medium text-text"
                      : "text-text-muted hover:bg-surface-subtle hover:text-text"
                  )}
                >
                  {isSelected(String(opt.value)) && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  )}
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

export function QuestionLibraryFilters({
  searchQuery,
  onSearchChange,
  subjectFilter,
  onSubjectFilterChange,
  difficultyFilter,
  onDifficultyFilterChange,
  attemptedStatusFilter,
  onAttemptedStatusFilterChange,
  attemptResultFilter,
  onAttemptResultFilterChange,
}: QuestionLibraryFiltersProps) {
  const subjectOptions = [
    { value: "ALL" as const, label: "All subjects" },
    ...subjects.map((s) => ({ value: s, label: s })),
  ];

  const difficultyOptions = [
    { value: "ALL" as const, label: "All difficulties" },
    ...difficulties.map((d) => ({ value: d, label: d })),
  ];

  const attemptedOptions = attemptedStatuses.map((s) => ({ value: s, label: s }));

  const resultOptions = getAttemptResultOptions(attemptedStatusFilter);

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-5">
      {/* Header row */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-base font-semibold text-text">Filters</h2>
        <p className="max-w-md text-sm text-text-muted sm:text-right">
          Search and filter questions by ID, subject, difficulty, and attempt status.
        </p>
      </div>

      {/* Inputs row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
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
            placeholder="Search by ID (C_xxxxx) or question content..."
            className="h-10 w-full rounded-lg border border-border-subtle bg-surface-mid pl-9 pr-4 text-sm text-text placeholder:text-text-muted transition-colors focus-visible:border-accent focus-visible:outline-none"
          />
        </div>

        <Dropdown<SubjectFilter>
          value={subjectFilter}
          onChange={(v) => onSubjectFilterChange(v as SubjectFilter | SubjectFilter[] | "ALL")}
          options={subjectOptions}
          placeholder="All subjects"
          multi
        />

        <Dropdown<DifficultyFilter>
          value={difficultyFilter}
          onChange={(v) => onDifficultyFilterChange(v as DifficultyFilter | DifficultyFilter[] | "ALL")}
          options={difficultyOptions}
          placeholder="All difficulties"
          multi
        />

        <Dropdown<AttemptedFilter>
          value={attemptedStatusFilter}
          onChange={(v) => {
            const status = (v === "ALL" ? "Mix" : v) as AttemptedFilter;
            onAttemptedStatusFilterChange(status);
            if (status === "New") onAttemptResultFilterChange(["Unseen"] as AttemptResultFilter[]);
            else if (status === "Attempted") onAttemptResultFilterChange(["Mixed Results"] as AttemptResultFilter[]);
          }}
          options={attemptedOptions}
          placeholder="Mix"
        />

        <Dropdown<AttemptResultFilter>
          value={attemptResultFilter}
          onChange={(v) => onAttemptResultFilterChange(v as AttemptResultFilter | AttemptResultFilter[] | "ALL")}
          options={resultOptions as Array<{ value: AttemptResultFilter | "ALL"; label: string }>}
          placeholder="All results"
          multi
        />
      </div>
    </div>
  );
}
