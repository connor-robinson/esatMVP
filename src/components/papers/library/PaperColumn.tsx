/**
 * PaperColumn - Simplified paper item with icons and plus buttons
 */

"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Plus, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getExamSectionNumberBadgeClass } from "@/config/colors";
import { SectionsLoadingState } from "./SectionsLoadingState";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { Paper, PaperSection } from "@/types/papers";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  getPaperCompletionStatus,
  getPaperSectionCompletion,
} from "@/lib/papers/libraryCompletion";
import {
  fetchPaperSectionsOutline,
} from "@/lib/papers/pastPaperLibraryData";
import type {
  PaperMainSection,
  PaperSectionsOutline,
} from "@/lib/papers/paperLibrarySections";

interface PaperColumnProps {
  paper: Paper;
  isSelected: boolean;
  selectedSections: Set<PaperSection>;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  onAddFullPaper: (paper: Paper, sectionsByMain: Map<string, Set<PaperSection>>) => void;
  onAddPaper: (paper: Paper) => void;
  onAddSection?: (paper: Paper, sectionName: string, sections: PaperSection[]) => void;
}

export function PaperColumn({
  paper,
  isSelected,
  selectedSections,
  onToggleSection,
  onAddFullPaper,
  onAddPaper,
  onAddSection,
}: PaperColumnProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [outline, setOutline] = useState<PaperSectionsOutline | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [paperCompletionStatus, setPaperCompletionStatus] = useState<
    "none" | "partial" | "complete"
  >("none");
  const [sectionCompletionMap, setSectionCompletionMap] = useState<
    Map<PaperSection, boolean>
  >(new Map());

  const session = useSupabaseSession();
  const sectionNumberBadgeClass = getExamSectionNumberBadgeClass(paper.examName);
  const paperType = examNameToPaperType(paper.examName as any) || "NSAA";

  const availableSections = outline?.sections ?? [];
  const mainSections: PaperMainSection[] = outline?.mainSections ?? [];

  useEffect(() => {
    if (!isExpanded || outline || loadingSections) return;

    let cancelled = false;
    setLoadingSections(true);
    setSectionsError(null);

    void fetchPaperSectionsOutline(paper.id)
      .then((data) => {
        if (!cancelled) setOutline(data);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`[PaperColumn] Error loading sections for paper ${paper.id}:`, error);
          setSectionsError("Failed to load sections");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSections(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isExpanded, outline, loadingSections, paper.id]);

  useEffect(() => {
    if (
      !isExpanded ||
      availableSections.length === 0 ||
      !session?.user?.id
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const status = await getPaperCompletionStatus(
          session.user!.id,
          paper,
          availableSections,
        );
        const sectionMap = await getPaperSectionCompletion(
          session.user!.id,
          paper,
          availableSections,
        );
        if (!cancelled) {
          setPaperCompletionStatus(status);
          setSectionCompletionMap(sectionMap);
        }
      } catch (error) {
        console.error("[PaperColumn] Error loading completion status:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, availableSections, session?.user?.id, paper]);

  const buildSectionsByMain = (): Map<string, Set<PaperSection>> => {
    const sectionsByMain = new Map<string, Set<PaperSection>>();
    mainSections.forEach((mainSection) => {
      sectionsByMain.set(mainSection.name, new Set(mainSection.subjectParts));
    });
    return sectionsByMain;
  };

  const handleAddPaperClick = () => {
    if (mainSections.length > 0) {
      onAddFullPaper(paper, buildSectionsByMain());
      return;
    }

    if (availableSections.length > 0) {
      const sectionsByMain = new Map<string, Set<PaperSection>>();
      if (paperType === "TMUA") {
        for (const section of availableSections) {
          if (section === "Paper 1" || section === "Paper 2") {
            sectionsByMain.set(section, new Set([section]));
          }
        }
      }
      if (sectionsByMain.size === 0) {
        sectionsByMain.set("Section 1", new Set(availableSections));
      }
      onAddFullPaper(paper, sectionsByMain);
      return;
    }

    onAddPaper(paper);
  };

  const handleAddSectionClick = (
    sectionName: string,
    subjectParts: PaperSection[],
  ) => {
    if (onAddSection) {
      onAddSection(paper, sectionName, subjectParts);
    } else {
      subjectParts.forEach((part) => {
        onToggleSection(paper.id, part);
      });
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 rounded-lg px-3 transition-colors",
          isSelected ? "bg-surface-neutral" : "bg-surface-elevated hover:bg-surface-neutral",
        )}
      >
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text"
          aria-label={isExpanded ? "Collapse sections" : "Expand sections"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded ? "rotate-0" : "-rotate-90",
            )}
            strokeWidth={2.5}
          />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-text">
            {paper.examName} {paper.examYear}
          </span>
          {paperCompletionStatus !== "none" && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                paperCompletionStatus === "complete"
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning",
              )}
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              {paperCompletionStatus === "complete" ? "Complete" : "In Progress"}
            </span>
          )}
        </div>

        {paper.examType && (
          <span className="inline-flex h-8 shrink-0 items-center rounded-[6px] bg-surface-neutral px-3 text-[10px] uppercase tracking-wide text-text-muted">
            {paper.examType}
          </span>
        )}

        <button
          type="button"
          onClick={handleAddPaperClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-dark text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
          aria-label="Add paper to session"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden pl-9"
          >
            <div className="space-y-1 pb-1 pt-0.5">
              {loadingSections ? (
                <SectionsLoadingState />
              ) : sectionsError ? (
                <div className="py-2 text-xs text-error">{sectionsError}</div>
              ) : mainSections.length === 0 ? (
                <div className="py-2 text-xs text-text-muted">No sections available</div>
              ) : (
                mainSections.map((mainSection) => {
                  const sectionNum =
                    mainSection.name === "Section 1" ||
                    mainSection.name === "Paper 1"
                      ? "1"
                      : mainSection.name === "Section 2" ||
                          mainSection.name === "Paper 2"
                        ? "2"
                        : null;
                  const allDone =
                    mainSection.subjectParts.length > 0 &&
                    mainSection.subjectParts.every((s) =>
                      sectionCompletionMap.get(s),
                    );

                  return (
                    <div
                      key={mainSection.name}
                      className="flex h-11 items-center gap-2.5 rounded-lg bg-surface-elevated px-3 transition-colors hover:bg-surface-mid"
                    >
                      {sectionNum ? (
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                            sectionNumberBadgeClass,
                          )}
                        >
                          {sectionNum}
                        </div>
                      ) : (
                        <div className="h-6 w-6 shrink-0" />
                      )}

                      <span className="min-w-0 flex-1 truncate text-sm text-text-muted">
                        {mainSection.name}
                      </span>

                      {allDone && (
                        <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-success">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Complete
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleAddSectionClick(
                            mainSection.name,
                            mainSection.subjectParts,
                          )
                        }
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                        aria-label={`Add ${mainSection.name}`}
                      >
                        <Plus className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
