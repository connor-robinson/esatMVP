/**
 * PaperRow - Horizontal paper row with expandable sections
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Check, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaperTypeColor, getSectionColor } from "@/config/colors";
import { getQuestions } from "@/lib/supabase/questions";
import { getAvailableSectionsFromParts } from "@/lib/papers/sectionMapping";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { Paper, PaperSection, ExamName } from "@/types/papers";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { getPaperCompletionStatus, getPaperSectionCompletion } from "@/lib/papers/libraryCompletion";

interface PaperRowProps {
  paper: Paper;
  isSelected: boolean;
  selectedSections: Set<PaperSection>;
  onToggleSelect: (paper: Paper) => void;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  onAddFullPaper: (paper: Paper, sections: PaperSection[]) => void;
}

export function PaperRow({
  paper,
  isSelected,
  selectedSections,
  onToggleSelect,
  onToggleSection,
  onAddFullPaper,
}: PaperRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableSections, setAvailableSections] = useState<PaperSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [paperCompletionStatus, setPaperCompletionStatus] = useState<'none' | 'partial' | 'complete'>('none');
  const [sectionCompletionMap, setSectionCompletionMap] = useState<Map<PaperSection, boolean>>(new Map());
  const [loadingCompletion, setLoadingCompletion] = useState(false);

  const session = useSupabaseSession();
  const paperColor = getPaperTypeColor(paper.examName);

  // Load sections when expanded
  useEffect(() => {
    if (isExpanded && availableSections.length === 0 && !loadingSections) {
      const loadSections = async () => {
        setLoadingSections(true);
        try {
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
          setAvailableSections(sections);
        } catch (error) {
          console.error(`[PaperRow] Error loading sections for paper ${paper.id}:`, error);
        } finally {
          setLoadingSections(false);
        }
      };
      loadSections();
    }
  }, [isExpanded, paper.id, paper.examName, paper.examYear, paper.examType, availableSections.length, loadingSections]);

  const allSectionsSelected = useMemo(() => {
    return availableSections.length > 0 && availableSections.every(s => selectedSections.has(s));
  }, [availableSections, selectedSections]);

  // Load completion status when sections are available
  useEffect(() => {
    if (availableSections.length > 0 && session?.user?.id && !loadingCompletion) {
      const loadCompletionStatus = async () => {
        setLoadingCompletion(true);
        try {
          const status = await getPaperCompletionStatus(session.user.id, paper, availableSections);
          const sectionMap = await getPaperSectionCompletion(session.user.id, paper, availableSections);
          setPaperCompletionStatus(status);
          setSectionCompletionMap(sectionMap);
        } catch (error) {
          console.error('[PaperRow] Error loading completion status:', error);
        } finally {
          setLoadingCompletion(false);
        }
      };
      loadCompletionStatus();
    }
  }, [availableSections, session?.user?.id, paper, loadingCompletion]);

  const handleAddFullPaper = () => {
    if (availableSections.length > 0) {
      onAddFullPaper(paper, availableSections);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isSelected
          ? "border-2 shadow-sm"
          : "border border-white/10 hover:border-white/20"
      )}
      style={
        isSelected
          ? {
              borderColor: paperColor + "80",
              backgroundColor: paperColor + "08",
            }
          : { backgroundColor: "rgba(16, 18, 22, 0.5)" }
      }
    >
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        {/* Expand/collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 transition-colors"
          aria-label={isExpanded ? "Collapse sections" : "Expand sections"}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Paper info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: paperColor + "CC" }}
            >
              {paper.examName} • {paper.examYear}
            </div>
            <div className="text-sm font-semibold text-white/90">
              {paper.paperName}
            </div>
            <div className="text-xs text-white/50">
              {paper.examType}
            </div>
            {/* Completion status badge for paper */}
            {paperCompletionStatus !== 'none' && (
              <div className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide flex items-center gap-1",
                paperCompletionStatus === 'complete' 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              )}>
                <CheckCircle2 className="w-3 h-3" />
                {paperCompletionStatus === 'complete' ? 'Complete' : 'In Progress'}
              </div>
            )}
          </div>
        </div>

        {/* Add/Selected indicator */}
        <div className="flex items-center gap-2">
          {isSelected && (
            <div className="text-xs text-white/60">
              {selectedSections.size > 0
                ? `${selectedSections.size} section${selectedSections.size === 1 ? "" : "s"} selected`
                : "Added"}
            </div>
          )}
          <button
            onClick={() => onToggleSelect(paper)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isSelected
                ? "text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            )}
            style={
              isSelected
                ? { backgroundColor: paperColor + "40" }
                : undefined
            }
          >
            {isSelected ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>In Session</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded sections */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          {loadingSections ? (
            <div className="text-xs text-white/40 py-4">Loading sections...</div>
          ) : availableSections.length === 0 ? (
            <div className="text-xs text-white/40 py-4">No sections available</div>
          ) : (
            <div className="space-y-3">
              {/* Add full paper button */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 uppercase tracking-wide">
                  Sections ({selectedSections.size}/{availableSections.length})
                </span>
                <button
                  onClick={handleAddFullPaper}
                  disabled={allSectionsSelected}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                    allSectionsSelected
                      ? "bg-white/5 text-white/30 cursor-not-allowed"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {allSectionsSelected ? "All Selected" : "Select All"}
                </button>
              </div>

              {/* Section pills */}
              <div className="flex flex-wrap gap-2">
                {availableSections.map((section) => {
                  const isSelected = selectedSections.has(section);
                  const isCompleted = sectionCompletionMap.get(section);
                  const sectionColor = getSectionColor(section);
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => onToggleSection(paper.id, section)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                        isSelected
                          ? "text-white shadow-sm"
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      )}
                      style={
                        isSelected
                          ? {
                              backgroundColor: sectionColor + "CC",
                            }
                          : undefined
                      }
                    >
                      <span>{section}</span>
                      {isCompleted && (
                        <CheckCircle2 className="w-3 h-3 text-green-400" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


