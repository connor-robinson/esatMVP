/**
 * PaperSessionSummary - compact summary of selected papers and sections
 */

"use client";

import { useMemo } from "react";
import { X, Play, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { Paper, PaperSection } from "@/types/papers";

interface SelectedPaper {
  paper: Paper;
  selectedSections: Set<PaperSection>;
}

interface PaperSessionSummaryProps {
  selectedPapers: SelectedPaper[];
  onRemovePaper: (paperId: number) => void;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  availableSectionsByPaper: Map<number, PaperSection[]>;
  canStart: boolean;
  onStartSession: () => void;
}

export function PaperSessionSummary({
  selectedPapers,
  onRemovePaper,
  onToggleSection,
  availableSectionsByPaper,
  canStart,
  onStartSession,
}: PaperSessionSummaryProps) {
  const sessionStats = useMemo(() => {
    let totalSections = 0;
    let totalQuestions = 0;
    let totalTimeMinutes = 0;

    selectedPapers.forEach(({ selectedSections }) => {
      const count = selectedSections.size;
      if (count === 0) return;
      totalSections += count;
      const estimatedQuestions = count * 20;
      const estimatedTime = Math.ceil(estimatedQuestions * 1.5);
      totalQuestions += estimatedQuestions;
      totalTimeMinutes += estimatedTime;
    });

    return { totalSections, totalQuestions, totalTimeMinutes };
  }, [selectedPapers]);

  const totalItems = selectedPapers.length;

  return (
    <Card variant="flat" className="p-5 h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
            Practice Session
          </h2>
          <p className="text-xs text-white/45 mt-1">
            Papers and sections you&apos;ll include in this run.
          </p>
        </div>
        <span className="text-sm text-white/50 font-medium">
          {totalItems} {totalItems === 1 ? "paper" : "papers"}
        </span>
      </div>

      {/* Selected papers */}
      <div className="min-h-[220px] rounded-2xl p-4 bg-white/[0.03] space-y-3">
        {selectedPapers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-white/40 text-sm">
            <div>No papers selected yet.</div>
            <div className="text-xs">Browse the library to add papers.</div>
          </div>
        ) : (
          selectedPapers.map(({ paper, selectedSections }) => {
            const examColor = getPaperTypeColor(paper.examName);
            const sections = availableSectionsByPaper.get(paper.id) || [];

            return (
              <div
                key={paper.id}
                className="rounded-xl bg-[#12151c] border border-white/10 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-neutral-100 truncate">
                      {paper.examName} {paper.examYear}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {paper.paperName} • {paper.examType}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemovePaper(paper.id)}
                    className="p-1 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors flex-shrink-0"
                    aria-label="Remove paper from session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sections */}
                {sections.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[11px] text-white/50 uppercase tracking-wide">
                      Sections ({selectedSections.size}/{sections.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sections.map((section) => {
                        const isSelected = selectedSections.has(section);
                        return (
                          <button
                            key={section}
                            type="button"
                            onClick={() => onToggleSection(paper.id, section)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                              isSelected
                                ? "text-white"
                                : "bg-white/5 text-white/60 hover:bg-white/10"
                            )}
                            style={
                              isSelected
                                ? { backgroundColor: examColor + "40" }
                                : undefined
                            }
                          >
                            {section}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-white/40">
                    Sections are still loading or unavailable.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stats */}
      {totalItems > 0 && (
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Total sections selected</span>
            <span className="text-white/90 font-medium">
              {sessionStats.totalSections}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Estimated questions</span>
            <span className="text-white/90 font-medium">
              ~{sessionStats.totalQuestions}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Estimated time</span>
            <span className="flex items-center gap-1 text-white/90 font-medium">
              <Clock className="w-4 h-4" />
              {sessionStats.totalTimeMinutes} min
            </span>
          </div>
        </div>
      )}

      {/* Start session */}
      <button
        type="button"
        onClick={onStartSession}
        disabled={!canStart}
        className={cn(
          "w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-fast ease-signature",
          !canStart
            ? "bg-white/5 text-white/30 cursor-not-allowed"
            : "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary-light interaction-scale"
        )}
      >
        <Play className="w-4 h-4" />
        <span>Start Practice Session</span>
      </button>
    </Card>
  );
}













