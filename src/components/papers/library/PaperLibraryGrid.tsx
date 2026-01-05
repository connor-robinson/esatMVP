/**
 * PaperLibraryGrid - Row-based layout grouped by exam
 */

"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Paper, PaperSection } from "@/types/papers";
import { PaperColumn } from "./PaperColumn";
import { getPaperTypeColor } from "@/config/colors";
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
  // Track collapsed exams - all expanded by default
  const [collapsedExams, setCollapsedExams] = useState<Set<string>>(new Set());

  const toggleExam = (examName: string) => {
    setCollapsedExams((prev) => {
      const next = new Set(prev);
      if (next.has(examName)) {
        next.delete(examName);
      } else {
        next.add(examName);
      }
      return next;
    });
  };

  const isExamExpanded = (examName: string) => !collapsedExams.has(examName);
  // Group papers by exam name, deduplicating by exam+year+type (keeping separate cards for Official vs Specimen)
  const papersByExam = useMemo(() => {
    const grouped: Record<string, Paper[]> = {};

    // Create a map to track unique exam+year+type combinations
    // This ensures we only show one paper per exam+year+type combination
    const seenCombinations = new Map<string, Paper>();

    papers.forEach((paper) => {
      // Create a unique key: exam+year+type
      const key = `${paper.examName}-${paper.examYear}-${paper.examType || ""}`;

      // Only keep the first paper we encounter for each exam+year+type combination
      // Prefer papers with a more standard paper_name if available
      if (!seenCombinations.has(key)) {
        seenCombinations.set(key, paper);
      } else {
        const existing = seenCombinations.get(key)!;
        // If we have a duplicate, prefer the one with a more standard paper_name
        // (e.g., prefer "Paper" over "Section 1" or "Section 2" in paper_name)
        const currentName = (paper.paperName || "").toLowerCase();
        const existingName = (existing.paperName || "").toLowerCase();
        
        // Prefer papers with simpler names (like "Paper" or empty) over section-specific names
        if (currentName === "paper" && existingName !== "paper") {
          seenCombinations.set(key, paper);
        } else if (currentName === "" && existingName !== "" && existingName !== "paper") {
          seenCombinations.set(key, paper);
        }
        // Otherwise keep the existing one
      }
    });

    // Group the deduplicated papers by exam name
    seenCombinations.forEach((paper) => {
      if (!grouped[paper.examName]) {
        grouped[paper.examName] = [];
      }
      grouped[paper.examName].push(paper);
    });

    // Sort papers within each exam by year (descending), then by exam type
    Object.keys(grouped).forEach((examName) => {
      grouped[examName].sort((a, b) => {
        if (b.examYear !== a.examYear) {
          return b.examYear - a.examYear;
        }
        // If same year, sort by exam type (Official before Specimen)
        const typeA = (a.examType || "").toLowerCase();
        const typeB = (b.examType || "").toLowerCase();
        if (typeA === "official" && typeB !== "official") return -1;
        if (typeB === "official" && typeA !== "official") return 1;
        return typeA.localeCompare(typeB);
      });
    });

    // Sort exam names alphabetically
    const sortedExams = Object.keys(grouped).sort();

    return { grouped, sortedExams };
  }, [papers]);

  return (
    <Card variant="flat" className="p-5 h-full bg-transparent">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-mono font-semibold uppercase tracking-wider text-white/70">
            Paper Library
          </h2>
          <p className="text-sm font-mono text-white/50 mt-1">
            Browse past papers and add them to your practice session.
          </p>
        </div>
        <div className="text-xs text-white/50">
          {papers.length} result{papers.length === 1 ? "" : "s"}
        </div>
      </div>

      {papers.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-white/40">
          No papers found with the current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {papersByExam.sortedExams.map((examName) => {
            const examPapers = papersByExam.grouped[examName];
            if (!examPapers || examPapers.length === 0) return null;

            const examColor = getPaperTypeColor(examName);

            const isExpanded = isExamExpanded(examName);

            return (
              <div
                key={examName}
                className="rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                }}
              >
                {/* Color-coded header */}
                <button
                  onClick={() => toggleExam(examName)}
                  className="w-full px-6 py-7 flex items-center justify-between bg-white/[0.04] hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )}
                      style={{ color: examColor }}
                      strokeWidth={3}
                    />
                    <h3 className="text-base font-mono font-bold uppercase tracking-wider" style={{ color: examColor }}>
                      {examName} Papers
                    </h3>
                  </div>
                  <div className="text-xs opacity-40 font-mono tracking-tight group-hover:opacity-60 transition-opacity">
                    {examPapers.length} papers available
                  </div>
                </button>

                {/* Papers for this exam */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-2">
                        {examPapers.map((paper) => (
                          <PaperColumn
                            key={paper.id}
                            paper={paper}
                            isSelected={selectedPaperIds.has(paper.id)}
                            selectedSections={selectedSectionsByPaper.get(paper.id) || new Set()}
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
    </Card>
  );
}
