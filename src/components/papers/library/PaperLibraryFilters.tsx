/**
 * PaperLibraryFilters - Compact filter/search panel for Paper Library
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
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
      if (paper.examType) {
        typeSet.add(paper.examType);
      }
    });

    const examsArr = Array.from(examSet).sort();
    const yearsArr = Array.from(yearSet).sort((a, b) => b - a);
    const typesArr = Array.from(typeSet).sort();

    return { exams: examsArr, years: yearsArr, types: typesArr };
  }, [papers]);

  // Custom Dropdown Component
  const CustomDropdown = ({
    value,
    onChange,
    options,
    placeholder,
    minWidth,
  }: {
    value: string | number | "ALL";
    onChange: (value: string | number | "ALL") => void;
    options: Array<{ value: string | number | "ALL"; label: string }>;
    placeholder: string;
    minWidth?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

    return (
      <div className={cn("relative", minWidth)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 pl-4 pr-10 rounded-lg bg-surface-elevated text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer flex items-center justify-between border border-border"
        >
          <span className="truncate text-left">{selectedLabel}</span>
          <ChevronDown
            className={cn(
              "absolute right-3 w-4 h-4 text-text-muted pointer-events-none transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full mt-2 w-full bg-surface rounded-lg shadow-2xl z-50 overflow-hidden border border-border"
              >
                <div className="max-h-60 overflow-y-auto">
                  {options.map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm transition-all",
                        value === option.value
                          ? "bg-surface-mid text-text"
                          : "text-text-muted hover:bg-surface-subtle hover:text-text"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Card variant="flat" className="p-3 bg-surface-subtle">
      <div className="mb-4">
        <h2 className="text-xl font-mono font-semibold uppercase tracking-wider text-text mb-1">
          Filters
        </h2>
        <p className="text-xs font-mono text-text-subtle">
          Search and filter papers by exam, year, and type to find what you need.
        </p>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by exam, paper, or year..."
            className="w-full h-10 px-4 rounded-lg bg-surface-elevated outline-none border border-border placeholder:text-text-disabled text-text text-sm transition-all focus:border-border-subtle"
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(64, 97, 102, 0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = '';
            }}
          />
        </div>

        {/* Exam filter */}
        <CustomDropdown
          value={examFilter}
          onChange={(value) => onExamFilterChange(value as string | "ALL")}
          options={[
            { value: "ALL", label: "All exams" },
            ...exams.map((exam) => ({ value: exam, label: exam })),
          ]}
          placeholder="All exams"
          minWidth="min-w-[140px]"
        />

        {/* Year filter */}
        <CustomDropdown
          value={yearFilter}
          onChange={(value) => {
            if (value === "ALL") {
              onYearFilterChange("ALL");
            } else {
              onYearFilterChange(value as number);
            }
          }}
          options={[
            { value: "ALL", label: "All years" },
            ...years.map((year) => ({ value: year, label: String(year) })),
          ]}
          placeholder="All years"
          minWidth="min-w-[100px]"
        />

        {/* Type filter */}
        <CustomDropdown
          value={typeFilter}
          onChange={(value) => onTypeFilterChange(value as string | "ALL")}
          options={[
            { value: "ALL", label: "All types" },
            ...types.map((type) => ({ value: type, label: type })),
          ]}
          placeholder="All types"
          minWidth="min-w-[120px]"
        />
      </div>
    </Card>
  );
}
