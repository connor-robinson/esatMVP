"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  SubjectFilter,
  DifficultyFilter,
  AttemptedFilter,
  AttemptResultFilter,
} from "@/types/questionBank";

const filterControlSurface =
  "bg-surface-neutral text-text hover:bg-surface-neutral/90 focus-visible:outline-none";

const subjects: SubjectFilter[] = ["Math 1", "Math 2", "Physics", "Chemistry", "Biology"];
const difficulties: DifficultyFilter[] = ["Easy", "Medium", "Hard"];
const attemptedStatuses: AttemptedFilter[] = ["Mix", "New", "Attempted"];

function getAttemptResultOptions(
  status: AttemptedFilter,
): Array<{ value: "ALL" | string; label: string }> {
  let available: string[] = [];
  if (status === "New") available = ["Unseen"];
  else if (status === "Attempted") available = ["Mixed Results", "Incorrect Before"];
  else available = ["Mixed Results", "Unseen", "Incorrect Before"];
  return [{ value: "ALL", label: "All results" }, ...available.map((r) => ({ value: r, label: r }))];
}

function FilterDropdown<T extends string>({
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
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const updateMenuRect = () => {
    if (triggerRef.current) setMenuRect(triggerRef.current.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuRect();
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);
    return () => {
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

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
      setIsOpen(false);
    }
  };

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-[11rem]" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((v) => {
            const next = !v;
            if (next) queueMicrotask(updateMenuRect);
            return next;
          });
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-organic-md px-3 font-heading text-sm font-medium transition-colors",
          filterControlSurface,
        )}
      >
        <span className="truncate">{getLabel()}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && menuRect ? (
              <>
                <div
                  key="backdrop"
                  className="fixed inset-0 z-[9998]"
                  aria-hidden
                  onClick={() => setIsOpen(false)}
                />
                <motion.ul
                  key="menu"
                  ref={menuRef}
                  role="listbox"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  className="fixed z-[9999] max-h-60 overflow-y-auto rounded-organic-md bg-surface-neutral py-1 shadow-lg"
                  style={{
                    top: menuRect.bottom + 6,
                    left: menuRect.left,
                    minWidth: Math.max(menuRect.width, 160),
                  }}
                >
                  {options.map((opt) => (
                    <li
                      key={String(opt.value)}
                      role="option"
                      aria-selected={isSelected(String(opt.value))}
                    >
                      <button
                        type="button"
                        onClick={() => handleClick(opt.value as T | "ALL")}
                        className={cn(
                          "flex w-full items-center px-4 py-2.5 text-left font-heading text-sm transition-colors",
                          isSelected(String(opt.value))
                            ? "bg-secondary/15 font-semibold text-text"
                            : "text-text-muted hover:bg-surface-mid hover:text-text",
                        )}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              </>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

interface QuestionLibraryFiltersProps {
  embedded?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  subjectFilter: SubjectFilter | SubjectFilter[] | "ALL";
  onSubjectFilterChange: (value: SubjectFilter | SubjectFilter[] | "ALL") => void;
  difficultyFilter: DifficultyFilter | DifficultyFilter[] | "ALL";
  onDifficultyFilterChange: (value: DifficultyFilter | DifficultyFilter[] | "ALL") => void;
  attemptedStatusFilter: AttemptedFilter;
  onAttemptedStatusFilterChange: (value: AttemptedFilter) => void;
  attemptResultFilter: AttemptResultFilter | AttemptResultFilter[] | "ALL";
  onAttemptResultFilterChange: (
    value: AttemptResultFilter | AttemptResultFilter[] | "ALL",
  ) => void;
}

export function QuestionLibraryFilters({
  embedded = false,
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = [
    subjectFilter !== "ALL",
    difficultyFilter !== "ALL",
    attemptedStatusFilter !== "Mix",
    attemptResultFilter !== "ALL",
  ].filter(Boolean).length;

  const clearFilters = () => {
    onSubjectFilterChange("ALL");
    onDifficultyFilterChange("ALL");
    onAttemptedStatusFilterChange("Mix");
    onAttemptResultFilterChange("ALL");
  };

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

  const toolbar = (
    <div className="flex w-full items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          strokeWidth={2}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by ID or question text…"
          className={cn(
            "h-9 w-full rounded-organic-md pl-10 pr-3 font-heading text-sm text-text placeholder:text-text-muted",
            "border-0 outline-none shadow-none ring-0 appearance-none",
            "focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0",
            filterControlSurface,
          )}
        />
      </div>

      <button
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        aria-expanded={filtersOpen}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-organic-md px-3 font-heading text-xs font-semibold transition-colors sm:text-sm",
          filterControlSurface,
          !(filtersOpen || activeFilterCount > 0) && "text-text-muted",
        )}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 ? (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold tabular-nums text-background">
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
  );

  const filterRow = (
    <AnimatePresence initial={false}>
      {filtersOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className={filtersOpen ? "overflow-visible" : "overflow-hidden"}
        >
          <div
            className={cn(
              "flex flex-col gap-3 overflow-visible sm:flex-row sm:flex-wrap sm:items-center",
              embedded ? "pt-3" : "pt-2",
            )}
          >
            <FilterDropdown<SubjectFilter>
              value={subjectFilter}
              onChange={(v) =>
                onSubjectFilterChange(v as SubjectFilter | SubjectFilter[] | "ALL")
              }
              options={subjectOptions}
              placeholder="All subjects"
              multi
            />
            <FilterDropdown<DifficultyFilter>
              value={difficultyFilter}
              onChange={(v) =>
                onDifficultyFilterChange(v as DifficultyFilter | DifficultyFilter[] | "ALL")
              }
              options={difficultyOptions}
              placeholder="All difficulties"
              multi
            />
            <FilterDropdown<AttemptedFilter>
              value={attemptedStatusFilter}
              onChange={(v) => {
                const status = (v === "ALL" ? "Mix" : v) as AttemptedFilter;
                onAttemptedStatusFilterChange(status);
                if (status === "New")
                  onAttemptResultFilterChange(["Unseen"] as AttemptResultFilter[]);
                else if (status === "Attempted")
                  onAttemptResultFilterChange(["Mixed Results"] as AttemptResultFilter[]);
              }}
              options={attemptedOptions}
              placeholder="Mix"
            />
            <FilterDropdown<AttemptResultFilter>
              value={attemptResultFilter}
              onChange={(v) =>
                onAttemptResultFilterChange(
                  v as AttemptResultFilter | AttemptResultFilter[] | "ALL",
                )
              }
              options={resultOptions as Array<{ value: AttemptResultFilter | "ALL"; label: string }>}
              placeholder="All results"
              multi
            />
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 shrink-0 px-2 font-heading text-xs font-medium text-text-muted transition-colors hover:text-text"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (embedded) {
    return (
      <div className="flex w-full flex-col gap-3">
        {toolbar}
        {filterRow}
      </div>
    );
  }

  return (
    <section className="rounded-organic-xl bg-surface px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-2">
        {toolbar}
        {filterRow}
      </div>
    </section>
  );
}
