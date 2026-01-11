/**
 * PaperLibraryFilters - filter/search panel for Paper Library
 */

"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
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

  return (
    <Card variant="flat" className="p-4 h-full space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-1">
          Filters
        </h2>
        <p className="text-xs text-white/40">
          Browse the paper library and narrow down by exam, year, and type.
        </p>
      </div>

      {/* Search */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/50 uppercase tracking-wide">
          Search
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by exam, paper, or year..."
          className="w-full h-9 px-3 rounded-xl bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/40 text-white/90 text-xs transition-all shadow-sm"
        />
      </div>

      {/* Exam filter */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/50 uppercase tracking-wide">
          Exam
        </label>
        <select
          value={examFilter}
          onChange={(e) =>
            onExamFilterChange(
              (e.target.value || "ALL") as string | "ALL"
            )
          }
          className="w-full h-9 px-3 rounded-xl bg-white/5 text-xs text-white/90 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ALL">All exams</option>
          {exams.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </select>
      </div>

      {/* Year filter */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/50 uppercase tracking-wide">
          Year
        </label>
        <select
          value={yearFilter === "ALL" ? "ALL" : String(yearFilter)}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "ALL" || value === "") {
              onYearFilterChange("ALL");
            } else {
              onYearFilterChange(Number(value));
            }
          }}
          className="w-full h-9 px-3 rounded-xl bg-white/5 text-xs text-white/90 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ALL">All years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Type filter */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/50 uppercase tracking-wide">
          Exam type
        </label>
        <select
          value={typeFilter}
          onChange={(e) =>
            onTypeFilterChange(
              (e.target.value || "ALL") as string | "ALL"
            )
          }
          className="w-full h-9 px-3 rounded-xl bg-white/5 text-xs text-white/90 border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="ALL">All types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}














