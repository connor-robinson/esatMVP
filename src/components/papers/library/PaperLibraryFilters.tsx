"use client";

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Paper } from "@/types/papers";

/** Shared chrome for search, Filters toggle, and dropdown triggers. */
const filterControlSurface =
  "bg-surface-neutral text-text hover:bg-surface-neutral/90 focus-visible:outline-none";

interface PaperLibraryFiltersProps {
  /** When true, search and filters share one inset panel inside Paper Library. */
  embedded?: boolean;
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
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const updateMenuRect = () => {
    if (triggerRef.current) {
      setMenuRect(triggerRef.current.getBoundingClientRect());
    }
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

  const selected = options.find((o) => o.value === value)?.label ?? placeholder;

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
        <span className="truncate">{selected}</span>
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
                      aria-selected={value === opt.value}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center px-4 py-2.5 text-left font-heading text-sm transition-colors",
                          value === opt.value
                            ? "bg-accent/15 font-semibold text-text"
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

export function PaperLibraryFilters({
  embedded = false,
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
          placeholder="Search exam, paper, or year…"
          className={cn(
            "h-9 w-full rounded-organic-md pl-10 pr-3 font-heading text-sm text-text placeholder:text-text-muted",
            "border-0 outline-none shadow-none ring-0 appearance-none",
            "focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0",
            filterControlSurface,
            "[&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-text)]",
            "[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface-neutral)_inset]",
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
    <div className="space-y-2">
      {toolbar}
      {filterRow}
    </div>
  );
}
