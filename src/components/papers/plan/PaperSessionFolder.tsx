/**
 * Paper session folder component - shows selected papers with section selection
 * Similar to SessionFolder but for papers
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Play, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { Paper, PaperSection, ExamName } from "@/types/papers";
import { getAvailableSectionsFromParts } from "@/lib/papers/sectionMapping";
import { getQuestions } from "@/lib/supabase/questions";
import { examNameToPaperType } from "@/lib/papers/paperConfig";

interface SelectedPaper {
  paper: Paper;
  selectedSections: Set<PaperSection>;
}

interface PaperSessionFolderProps {
  selectedPapers: SelectedPaper[];
  onRemovePaper: (paperId: number) => void;
  onUpdateSections: (paperId: number, sections: Set<PaperSection>) => void;
  onStartSession: () => void;
  canStart: boolean;
}

export function PaperSessionFolder({
  selectedPapers,
  onRemovePaper,
  onUpdateSections,
  onStartSession,
  canStart,
}: PaperSessionFolderProps) {
  const [expandedPapers, setExpandedPapers] = useState<Set<number>>(new Set());
  const [availableSections, setAvailableSections] = useState<
    Map<number, PaperSection[]>
  >(new Map());
  const [loadingSections, setLoadingSections] = useState<Set<number>>(
    new Set()
  );

  // Load available sections for each paper
  const loadSectionsForPaper = async (paper: Paper) => {
    if (availableSections.has(paper.id)) return;

    setLoadingSections((prev) => new Set(prev).add(paper.id));

    try {
      // Get questions to determine available parts
      const questions = await getQuestions(paper.id);
      const parts = questions.map((q) => ({
        partLetter: q.partLetter,
        partName: q.partName,
      }));

      const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
      const sections = getAvailableSectionsFromParts(
        parts,
        paperType,
        paper.examYear,
        paper.examType
      );

      setAvailableSections((prev) => {
        const next = new Map(prev);
        next.set(paper.id, sections);
        return next;
      });
    } catch (error) {
      console.error(
        `[PaperSessionFolder] Error loading sections for paper ${paper.id}:`,
        error
      );
    } finally {
      setLoadingSections((prev) => {
        const next = new Set(prev);
        next.delete(paper.id);
        return next;
      });
    }
  };

  // Auto-load sections when paper is added
  useEffect(() => {
    selectedPapers.forEach(({ paper }) => {
      if (!availableSections.has(paper.id)) {
        loadSectionsForPaper(paper);
      }
    });
  }, [selectedPapers]);

  const togglePaperExpansion = (paperId: number) => {
    setExpandedPapers((prev) => {
      const next = new Set(prev);
      if (next.has(paperId)) {
        next.delete(paperId);
      } else {
        next.add(paperId);
      }
      return next;
    });
  };

  const toggleSection = (paperId: number, section: PaperSection) => {
    const selectedPaper = selectedPapers.find((sp) => sp.paper.id === paperId);
    if (!selectedPaper) return;

    const newSections = new Set(selectedPaper.selectedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }

    onUpdateSections(paperId, newSections);
  };

  // Calculate total questions and time estimate
  const sessionStats = useMemo(() => {
    let totalQuestions = 0;
    let totalTimeMinutes = 0;

    selectedPapers.forEach(({ paper, selectedSections }) => {
      if (selectedSections.size === 0) return;

      const sections = availableSections.get(paper.id) || [];
      const sectionsList = Array.from(selectedSections);

      // Rough estimate: assume ~20 questions per section, 1.5 min per question
      const estimatedQuestions = sectionsList.length * 20;
      const estimatedTime = Math.ceil(estimatedQuestions * 1.5);

      totalQuestions += estimatedQuestions;
      totalTimeMinutes += estimatedTime;
    });

    return { totalQuestions, totalTimeMinutes };
  }, [selectedPapers, availableSections]);

  const totalItems = selectedPapers.length;

  return (
    <Card variant="flat" className="p-5 h-full">
      {/* Header (legacy layout, replaced by PaperSessionSummary in library view) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold uppercase tracking-wider text-white/90">
          Practice Session
        </h2>
        <span className="text-sm text-white/50 font-medium">
          {totalItems} {totalItems === 1 ? "paper" : "papers"}
        </span>
      </div>

      {/* Papers list */}
      <div className="min-h-[260px] rounded-2xl p-5 mb-5 bg-white/[0.03] space-y-3">
        {selectedPapers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/40">
            <div className="text-sm">No papers selected</div>
            <div className="text-xs">Add papers from the left panel</div>
          </div>
        ) : (
          selectedPapers.map(({ paper, selectedSections }) => {
            const examColor = getPaperTypeColor(paper.examName);
            const sections = availableSections.get(paper.id) || [];
            const isLoading = loadingSections.has(paper.id);
            const isExpanded = expandedPapers.has(paper.id);
            const hasSections = sections.length > 0;

            return (
              <div
                key={paper.id}
                className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
              >
                {/* Paper header */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white/90 text-sm">
                      {paper.examName} {paper.examYear}
                    </div>
                    <div className="text-xs text-white/50">
                      {paper.paperName} • {paper.examType}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemovePaper(paper.id)}
                    className="p-1 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all flex-shrink-0"
                  >
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>

                {/* Sections selector */}
                {isLoading ? (
                  <div className="text-xs text-white/40">Loading sections...</div>
                ) : hasSections ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-white/70 uppercase tracking-wider">
                      Select Sections ({selectedSections.size}/{sections.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sections.map((section) => {
                        const isSelected = selectedSections.has(section);
                        return (
                          <button
                            key={section}
                            onClick={() => toggleSection(paper.id, section)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
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
                  <div className="text-xs text-white/40">
                    No sections available
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Session stats */}
      {totalItems > 0 && (
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Estimated questions:</span>
            <span className="text-white/90 font-medium">
              ~{sessionStats.totalQuestions}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Estimated time:</span>
            <div className="flex items-center gap-1 text-white/90 font-medium">
              <Clock className="w-4 h-4" />
              {sessionStats.totalTimeMinutes} min
            </div>
          </div>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={onStartSession}
        disabled={!canStart}
        className={cn(
          "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-base transition-all duration-fast ease-signature",
          !canStart
            ? "bg-white/5 text-white/30 cursor-not-allowed"
            : "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary-light interaction-scale"
        )}
      >
        <Play className="h-5 w-5" strokeWidth={2} />
        <span>Start Session</span>
      </button>

      {!canStart && totalItems === 0 && (
        <div className="text-sm text-white/40 text-center mt-2">
          Add at least one paper to start
        </div>
      )}
    </Card>
  );
}

