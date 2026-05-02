"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Paper, PaperSection } from "@/types/papers";
import { PaperColumn } from "./PaperColumn";
import { getExamAccentTextClass } from "@/config/colors";
import { cn } from "@/lib/utils";

interface PaperLibraryGridProps {
  papers: Paper[];
  selectedPaperIds: Set<number>;
  selectedSectionsByPaper: Map<number, Set<PaperSection>>;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  onAddFullPaper: (paper: Paper, sections: PaperSection[]) => void;
  onAddPaper: (paper: Paper) => void;
  onAddSection?: (paper: Paper, sectionName: string, sections: PaperSection[]) => void;
}

export function PaperLibraryGrid({
  papers,
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
    <div className="flex h-full flex-col rounded-2xl border border-border-subtle bg-surface px-5 py-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">Paper Library</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Browse past papers and add them to your practice session.
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-xs text-text-muted">
          {papers.length} result{papers.length === 1 ? "" : "s"}
        </span>
      </div>

      {papers.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 items-center justify-center rounded-xl border border-border-subtle bg-surface-mid text-sm text-text-muted">
          No papers match the current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {papersByExam.sortedExams.map((examName) => {
            const examPapers = papersByExam.grouped[examName];
            if (!examPapers?.length) return null;

            const accentClass = getExamAccentTextClass(examName);
            const isExpanded = isExamExpanded(examName);

            return (
              <div
                key={examName}
                className="overflow-hidden rounded-xl border border-border-subtle bg-surface-mid"
              >
                {/* Exam group header */}
                <button
                  type="button"
                  onClick={() => toggleExam(examName)}
                  className="group flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-surface-neutral"
                >
                  <div className="flex items-center gap-2.5">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        accentClass,
                        !isExpanded && "-rotate-90"
                      )}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className={cn("text-sm font-semibold uppercase tracking-wide", accentClass)}>
                      {examName} Papers
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {examPapers.length} paper{examPapers.length === 1 ? "" : "s"} available
                  </span>
                </button>

                {/* Papers inside this exam */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 border-t border-border-subtle p-3">
                        {examPapers.map((paper) => (
                          <PaperColumn
                            key={paper.id}
                            paper={paper}
                            isSelected={selectedPaperIds.has(paper.id)}
                            selectedSections={selectedSectionsByPaper.get(paper.id) ?? new Set()}
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
