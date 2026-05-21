"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Paper, PaperSection } from "@/types/papers";
import { PaperColumn } from "./PaperColumn";
import { PaperLibraryFilters } from "./PaperLibraryFilters";
import { getExamAccentBadgeClass, getExamAccentTextClass } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { PaperLibraryFiltersProps } from "./PaperLibraryFilters";

interface PaperLibraryGridProps
  extends Omit<PaperLibraryFiltersProps, "papers"> {
  /** Full catalog for filter dropdown options. */
  filterSourcePapers: Paper[];
  /** Filtered list shown in the grid. */
  papers: Paper[];
  selectedPaperIds: Set<number>;
  selectedSectionsByPaper: Map<number, Set<PaperSection>>;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  onAddFullPaper: (paper: Paper, sections: PaperSection[]) => void;
  onAddPaper: (paper: Paper) => void;
  onAddSection?: (paper: Paper, sectionName: string, sections: PaperSection[]) => void;
}

export function PaperLibraryGrid({
  filterSourcePapers,
  papers,
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

    const sortedExams = Object.keys(grouped).sort();
    return { grouped, sortedExams };
  }, [papers]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-organic-xl bg-surface px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text">
            Paper Library
          </h2>
          <p className="mt-1 text-sm leading-snug text-text-muted">
            Find official past papers, then add them to your session on the right.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-mid px-2.5 py-1 text-[11px] font-semibold tabular-nums text-text-muted">
          {papers.length} shown
        </span>
      </div>

      <PaperLibraryFilters
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

      {papers.length === 0 ? (
        <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-organic-md bg-surface-mid/40 text-sm text-text-muted">
          No papers match the current filters.
        </div>
      ) : (
        <div className="rounded-organic-md bg-surface-mid/30 px-1 py-1 sm:px-2">
          {papersByExam.sortedExams.map((examName, examIndex) => {
            const examPapers = papersByExam.grouped[examName];
            if (!examPapers?.length) return null;

            const accentClass = getExamAccentTextClass(examName);
            const countBadgeClass = getExamAccentBadgeClass(examName);
            const isExpanded = isExamExpanded(examName);

            return (
              <div
                key={examName}
                className={cn(
                  examIndex > 0 && "border-t border-border-subtle/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleExam(examName)}
                  className="group flex w-full items-center justify-between gap-3 rounded-organic-md px-3 py-3 transition-colors hover:bg-surface-mid/60"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
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
                        "truncate text-sm font-semibold uppercase tracking-wide",
                        accentClass,
                      )}
                    >
                      {examName}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums",
                      countBadgeClass,
                    )}
                  >
                    {examPapers.length}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 px-2 pb-2 pt-0.5">
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
                            allPapers={papers}
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
    </div>
  );
}
