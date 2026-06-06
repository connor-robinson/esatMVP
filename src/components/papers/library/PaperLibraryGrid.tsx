"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Paper, PaperSection } from "@/types/papers";
import { PaperColumn } from "./PaperColumn";
import { PaperLibraryFilters } from "./PaperLibraryFilters";
import { getExamAccentTextClass } from "@/config/colors";
import { LibrarySectionLoading } from "@/components/questionBank/library/LibrarySectionLoading";
import { compareLibraryExamGroupNames } from "@/lib/papers/paperConfig";
import { cn } from "@/lib/utils";

interface PaperLibraryGridProps {
  /** Full catalog for filter dropdown options and sibling paper loads. */
  filterSourcePapers: Paper[];
  papers: Paper[];
  papersLoading?: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  examFilter: string | "ALL";
  onExamFilterChange: (value: string | "ALL") => void;
  yearFilter: number | "ALL";
  onYearFilterChange: (value: number | "ALL") => void;
  typeFilter: string | "ALL";
  onTypeFilterChange: (value: string | "ALL") => void;
  selectedPaperIds: Set<number>;
  selectedSectionsByPaper: Map<number, Set<PaperSection>>;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  onAddFullPaper: (paper: Paper, sectionsByMain: Map<string, Set<PaperSection>>) => void;
  onAddPaper: (paper: Paper) => void;
  onAddSection?: (paper: Paper, sectionName: string, sections: PaperSection[]) => void;
}

export function PaperLibraryGrid({
  filterSourcePapers,
  papers,
  papersLoading = false,
  searchQuery,
  onSearchChange,
  examFilter,
  onExamFilterChange,
  yearFilter,
  onYearFilterChange,
  typeFilter,
  onTypeFilterChange,
  selectedPaperIds,
  selectedSectionsByPaper,
  onToggleSection,
  onAddFullPaper,
  onAddPaper,
  onAddSection,
}: PaperLibraryGridProps) {
  const [collapsedExams, setCollapsedExams] = useState<Set<string>>(new Set());

  const toggleExam = (examName: string) =>
    setCollapsedExams((prev) => {
      const next = new Set(prev);
      next.has(examName) ? next.delete(examName) : next.add(examName);
      return next;
    });

  const isExamExpanded = (examName: string) => !collapsedExams.has(examName);

  const papersByExam = useMemo(() => {
    const seenCombinations = new Map<string, Paper>();

    papers.forEach((paper) => {
      const key = `${paper.examName}-${paper.examYear}-${paper.examType ?? ""}`;
      if (!seenCombinations.has(key)) {
        seenCombinations.set(key, paper);
      } else {
        const existing = seenCombinations.get(key)!;
        const curr = (paper.paperName ?? "").toLowerCase();
        const prev = (existing.paperName ?? "").toLowerCase();
        if (curr === "paper" && prev !== "paper") seenCombinations.set(key, paper);
        else if (curr === "" && prev !== "" && prev !== "paper") seenCombinations.set(key, paper);
      }
    });

    const grouped: Record<string, Paper[]> = {};
    seenCombinations.forEach((paper) => {
      if (!grouped[paper.examName]) grouped[paper.examName] = [];
      grouped[paper.examName].push(paper);
    });

    Object.keys(grouped).forEach((examName) => {
      grouped[examName].sort((a, b) => {
        if (b.examYear !== a.examYear) return b.examYear - a.examYear;
        const typeA = (a.examType ?? "").toLowerCase();
        const typeB = (b.examType ?? "").toLowerCase();
        if (typeA === "official" && typeB !== "official") return -1;
        if (typeB === "official" && typeA !== "official") return 1;
        return typeA.localeCompare(typeB);
      });
    });

    const sortedExams = Object.keys(grouped).sort(compareLibraryExamGroupNames);
    return { grouped, sortedExams };
  }, [papers]);

  return (
    <section className="flex h-full flex-col rounded-organic-xl bg-surface px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-xl font-bold leading-none tracking-tight text-text sm:text-[1.35rem]">
            Paper Library
          </h2>
          <span className="shrink-0 font-heading text-xs font-medium leading-none tabular-nums text-text-muted">
            {papersLoading
              ? "…"
              : `${papers.length} result${papers.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <PaperLibraryFilters
          embedded
          papers={filterSourcePapers}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          examFilter={examFilter}
          onExamFilterChange={onExamFilterChange}
          yearFilter={yearFilter}
          onYearFilterChange={onYearFilterChange}
          typeFilter={typeFilter}
          onTypeFilterChange={onTypeFilterChange}
        />
      </div>

      {papersLoading ? (
        <div className="mt-5 border-t border-border-subtle/40 pt-5">
          <LibrarySectionLoading label="Loading papers…" rows={4} />
        </div>
      ) : papers.length === 0 ? (
        <div className="mt-5 flex min-h-[14rem] flex-1 items-center justify-center rounded-organic-md bg-surface-mid/35 px-4 text-sm text-text-muted">
          No papers match the current filters.
        </div>
      ) : (
        <div className="mt-5 space-y-4 border-t border-border-subtle/40 pt-5">
          {papersByExam.sortedExams.map((examName) => {
            const examPapers = papersByExam.grouped[examName];
            if (!examPapers?.length) return null;

            const accentClass = getExamAccentTextClass(examName);
            const isExpanded = isExamExpanded(examName);

            return (
              <div
                key={examName}
                className="overflow-hidden rounded-organic-lg bg-surface-mid/35"
              >
                <button
                  type="button"
                  onClick={() => toggleExam(examName)}
                  className="group flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-surface-mid/70"
                >
                  <div className="flex items-center gap-2.5">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        accentClass,
                        !isExpanded && "-rotate-90",
                      )}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "font-heading text-sm font-semibold uppercase tracking-wide",
                        accentClass,
                      )}
                    >
                      {examName} Papers
                    </span>
                  </div>
                  <span className="font-heading text-xs text-text-muted">
                    {examPapers.length} paper{examPapers.length === 1 ? "" : "s"} available
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 p-4">
                        {examPapers.map((paper) => (
                          <PaperColumn
                            key={paper.id}
                            paper={paper}
                            isSelected={selectedPaperIds.has(paper.id)}
                            selectedSections={
                              selectedSectionsByPaper.get(paper.id) ?? new Set()
                            }
                            onToggleSection={onToggleSection}
                            onAddFullPaper={onAddFullPaper}
                            onAddPaper={onAddPaper}
                            onAddSection={onAddSection}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
