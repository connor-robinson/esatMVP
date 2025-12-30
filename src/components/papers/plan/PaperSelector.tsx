/**
 * Paper selector component with search and grouping by exam name
 * Similar to TopicSelector
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Paper } from "@/types/papers";
import { PaperCard } from "./PaperCard";

interface PaperSelectorProps {
  papers: Paper[];
  selectedPaperIds: Set<number>; // Set of paper IDs
  onAddPaper: (paper: Paper) => void;
}

export function PaperSelector({
  papers,
  selectedPaperIds,
  onAddPaper,
}: PaperSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  // Toggle exam expansion
  const toggleExam = (examName: string) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      if (next.has(examName)) {
        next.delete(examName);
      } else {
        next.add(examName);
      }
      return next;
    });
  };

  // Filter papers by search query
  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return papers;

    const query = searchQuery.toLowerCase();
    return papers.filter(
      (paper) =>
        paper.examName.toLowerCase().includes(query) ||
        paper.paperName.toLowerCase().includes(query) ||
        paper.examYear.toString().includes(query) ||
        paper.examType.toLowerCase().includes(query)
    );
  }, [papers, searchQuery]);

  // Group papers by exam name
  const groupedByExam = useMemo(() => {
    const grouped: Record<string, Paper[]> = {};

    filteredPapers.forEach((paper) => {
      if (!grouped[paper.examName]) {
        grouped[paper.examName] = [];
      }
      grouped[paper.examName].push(paper);
    });

    // Sort papers within each exam by year (descending) then by paper name
    Object.keys(grouped).forEach((examName) => {
      grouped[examName].sort((a, b) => {
        if (b.examYear !== a.examYear) {
          return b.examYear - a.examYear;
        }
        return a.paperName.localeCompare(b.paperName);
      });
    });

    return grouped;
  }, [filteredPapers]);

  // Auto-expand exams with selected papers
  useMemo(() => {
    const examsWithSelections = new Set<string>();
    filteredPapers.forEach((paper) => {
      if (selectedPaperIds.has(paper.id)) {
        examsWithSelections.add(paper.examName);
      }
    });
    setExpandedExams((prev) => {
      const combined = new Set(prev);
      examsWithSelections.forEach((exam) => combined.add(exam));
      return combined;
    });
  }, [selectedPaperIds, filteredPapers]);

  return (
    <Card variant="flat" className="p-5 h-full">
      {/* Header (legacy selector, unused in new library layout) */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
          Paper Library
        </h2>
        <span className="text-sm text-white/50 font-medium">
          {selectedPaperIds.size}{" "}
          {selectedPaperIds.size === 1 ? "paper" : "papers"} selected
        </span>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search papers..."
          className="w-full h-11 px-4 rounded-xl bg-white/5 outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 placeholder:text-white/40 text-white/90 text-sm transition-all shadow-sm"
        />
      </div>

      {/* Papers by exam */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-hidden pr-1 pb-4 scrollbar-thin">
        {Object.entries(groupedByExam).map(([examName, examPapers]) => {
          if (!examPapers || examPapers.length === 0) return null;
          const isExpanded = expandedExams.has(examName);

          return (
            <div
              key={examName}
              className="rounded-xl bg-white/[0.02] shadow-sm"
            >
              {/* Exam Header - Clickable */}
              <button
                onClick={() => toggleExam(examName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors rounded-t-xl"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white/60" />
                  )}
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/70">
                    {examName}
                  </span>
                </div>
                <span className="text-xs text-white/40">
                  {examPapers.length}{" "}
                  {examPapers.length === 1 ? "paper" : "papers"}
                </span>
              </button>

              {/* Exam Papers - Collapsible */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-3 space-y-2">
                  {examPapers.map((paper) => (
                    <PaperCard
                      key={paper.id}
                      paper={paper}
                      isSelected={selectedPaperIds.has(paper.id)}
                      onAdd={() => onAddPaper(paper)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredPapers.length === 0 && (
          <div className="text-center text-white/40 py-12 text-sm">
            No papers found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </Card>
  );
}

