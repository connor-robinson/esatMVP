/**
 * PaperColumn - Simplified paper item with icons and plus buttons
 */

"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SectionsLoadingState } from "./SectionsLoadingState";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { Paper, PaperSection } from "@/types/papers";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { getPaperSectionCompletion } from "@/lib/papers/libraryCompletion";
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
  const [isAddingPaper, setIsAddingPaper] = useState(false);

  const session = useSupabaseSession();
  const paperType = examNameToPaperType(paper.examName as any) || "NSAA";

  const availableSections = outline?.sections ?? [];
  const mainSections: PaperMainSection[] = outline?.mainSections ?? [];

  useEffect(() => {
    if (!isExpanded || outline) return;

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
  }, [isExpanded, outline, paper.id]);

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
        const sectionMap = await getPaperSectionCompletion(
          session.user!.id,
          paper,
          availableSections,
        );
        if (cancelled) return;

        let completedCount = 0;
        for (const section of availableSections) {
          if (sectionMap.get(section)) completedCount++;
        }
        const status =
          completedCount === 0
            ? "none"
            : completedCount === availableSections.length
              ? "complete"
              : "partial";

        setPaperCompletionStatus(status);
        setSectionCompletionMap(sectionMap);
      } catch (error) {
        console.error("[PaperColumn] Error loading completion status:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isExpanded, availableSections, session?.user?.id, paper]);

  const buildSectionsByMain = (
    sections: PaperMainSection[],
  ): Map<string, Set<PaperSection>> => {
    const sectionsByMain = new Map<string, Set<PaperSection>>();
    sections.forEach((mainSection) => {
      sectionsByMain.set(mainSection.name, new Set(mainSection.subjectParts));
    });
    return sectionsByMain;
  };

  const buildSectionsByMainFromFlat = (
    sections: PaperSection[],
  ): Map<string, Set<PaperSection>> => {
    const sectionsByMain = new Map<string, Set<PaperSection>>();
    if (paperType === "TMUA") {
      for (const section of sections) {
        if (section === "Paper 1" || section === "Paper 2") {
          sectionsByMain.set(section, new Set([section]));
        }
      }
    }
    if (sectionsByMain.size === 0) {
      sectionsByMain.set("Section 1", new Set(sections));
    }
    return sectionsByMain;
  };

  const defaultTmuaSectionsByMain = (): Map<string, Set<PaperSection>> =>
    new Map<string, Set<PaperSection>>([
      ["Paper 1", new Set<PaperSection>(["Paper 1"])],
      ["Paper 2", new Set<PaperSection>(["Paper 2"])],
    ]);

  const handleAddPaperClick = async () => {
    if (isAddingPaper) return;

    if (mainSections.length > 0) {
      onAddFullPaper(paper, buildSectionsByMain(mainSections));
      return;
    }

    if (availableSections.length > 0) {
      onAddFullPaper(paper, buildSectionsByMainFromFlat(availableSections));
      return;
    }

    // Sections are lazy-loaded on expand — fetch (or use TMUA defaults) before adding.
    if (paperType === "TMUA") {
      onAddFullPaper(paper, defaultTmuaSectionsByMain());
      return;
    }

    setIsAddingPaper(true);
    setSectionsError(null);
    try {
      const data = await fetchPaperSectionsOutline(paper.id);
      setOutline(data);

      if (data.mainSections.length > 0) {
        onAddFullPaper(paper, buildSectionsByMain(data.mainSections));
      } else if (data.sections.length > 0) {
        onAddFullPaper(paper, buildSectionsByMainFromFlat(data.sections));
      } else {
        setSectionsError("No sections available for this paper");
      }
    } catch (error) {
      console.error(`[PaperColumn] Error adding paper ${paper.id}:`, error);
      setSectionsError("Failed to load sections");
    } finally {
      setIsAddingPaper(false);
    }
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
          "flex h-14 items-center gap-2.5 rounded-lg border border-border-subtle/40 px-3 transition-colors",
          isSelected ? "bg-surface-neutral" : "bg-surface hover:bg-surface-neutral/60",
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
          onClick={() => void handleAddPaperClick()}
          disabled={isAddingPaper}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-dark text-text-muted transition-colors hover:bg-surface-neutral hover:text-text",
            isAddingPaper && "cursor-wait opacity-70",
          )}
          aria-label="Add paper to session"
          aria-busy={isAddingPaper}
        >
          {isAddingPaper ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2} />
          )}
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
                      className="flex h-11 items-center gap-2.5 rounded-lg border border-border-subtle/30 bg-surface px-3 transition-colors hover:bg-surface-neutral/50"
                    >
                      {sectionNum ? (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-neutral text-xs font-bold text-text-muted">
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
