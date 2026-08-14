/**
 * PaperColumn - Simplified paper item with icons and plus buttons
 */

"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Check, Loader2, Plus, Lock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getExamAccentLibraryPaperRowClass,
  getExamAccentTextClass,
  getExamSectionNumberBadgeClass,
} from "@/config/colors";
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
  locked?: boolean;
  highlightAdd?: boolean;
}

function PaperAttemptTick({
  examName,
  scope,
  status,
}: {
  examName: string;
  scope: "paper" | "section";
  status: "partial" | "complete";
}) {
  const label =
    status === "complete"
      ? scope === "paper"
        ? "Fully attempted"
        : "This section fully attempted"
      : "Partially attempted";

  return (
    <span className="group/attempt relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <Check
        className={cn("h-3.5 w-3.5", getExamAccentTextClass(examName))}
        strokeWidth={2.75}
        aria-hidden
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[13rem] -translate-x-1/2 rounded-organic-md border border-border-subtle bg-surface-elevated px-2.5 py-1.5 text-center text-[10px] leading-snug text-text-muted opacity-0 shadow-bar-floating transition-opacity duration-150 group-hover/attempt:opacity-100"
      >
        <span className="block font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-text-subtle">
          Clear history in Analytics to remove
        </span>
      </span>
    </span>
  );
}

export function PaperColumn({
  paper,
  isSelected,
  selectedSections,
  onToggleSection,
  onAddFullPaper,
  onAddPaper,
  onAddSection,
  locked = false,
  highlightAdd = false,
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
  const sectionNumberBadgeClass = getExamSectionNumberBadgeClass(paper.examName);
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
    if (!session?.user?.id) return;

    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchPaperSectionsOutline(paper.id);
        if (cancelled) return;
        setOutline((prev) => prev ?? data);
        if (data.sections.length === 0) return;

        const sectionMap = await getPaperSectionCompletion(
          session.user!.id,
          paper,
          data.sections,
        );
        if (cancelled) return;

        let completedCount = 0;
        for (const section of data.sections) {
          if (sectionMap.get(section)) completedCount++;
        }
        const status =
          completedCount === 0
            ? "none"
            : completedCount === data.sections.length
              ? "complete"
              : "partial";

        setPaperCompletionStatus(status);
        setSectionCompletionMap(sectionMap);
      } catch (error) {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, paper.id]);

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
    if (locked || isAddingPaper) return;

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
      setSectionsError("Failed to load sections");
    } finally {
      setIsAddingPaper(false);
    }
  };

  const handleAddSectionClick = (
    sectionName: string,
    subjectParts: PaperSection[],
  ) => {
    if (locked) return;
    if (onAddSection) {
      onAddSection(paper, sectionName, subjectParts);
    } else {
      subjectParts.forEach((part) => {
        onToggleSection(paper.id, part);
      });
    }
  };

  return (
    <div className={cn("space-y-1", locked && "opacity-70")}>
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 rounded-lg px-3 transition-colors",
          getExamAccentLibraryPaperRowClass(paper.examName, isSelected && !locked),
          highlightAdd && !locked && "ring-2 ring-primary/40 ring-offset-2 ring-offset-surface",
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

        <button
          type="button"
          onClick={() => void handleAddPaperClick()}
          disabled={locked || isAddingPaper}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity",
            locked || isAddingPaper
              ? "cursor-default"
              : "cursor-pointer hover:opacity-80",
          )}
          aria-label={
            locked
              ? `${paper.examName} ${paper.examYear} — upgrade to unlock`
              : `Add ${paper.examName} ${paper.examYear} to session`
          }
          aria-busy={isAddingPaper}
        >
          <span
            className={cn(
              "truncate text-sm font-semibold",
              locked ? "text-text-muted" : "text-text",
            )}
          >
            {paper.examName} {paper.examYear}
          </span>
          {paper.examType && (
            <span className="inline-flex h-7 shrink-0 items-center rounded-[6px] bg-surface-neutral px-2.5 text-[10px] uppercase tracking-wide text-text-muted">
              {paper.examType}
            </span>
          )}
        </button>

        <div className="flex w-[4.75rem] shrink-0 items-center justify-end gap-1.5">
          {!locked && paperCompletionStatus !== "none" ? (
            <PaperAttemptTick
              examName={paper.examName}
              scope="paper"
              status={paperCompletionStatus === "complete" ? "complete" : "partial"}
            />
          ) : (
            <span className="h-5 w-5 shrink-0" aria-hidden />
          )}

          {locked ? (
            <Link
              href="/pricing"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-dark text-text-disabled"
              aria-label="Upgrade to unlock this paper"
            >
              <Lock className="h-4 w-4" strokeWidth={2} />
            </Link>
          ) : (
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
          )}
        </div>
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

                      <div className="flex w-[4.75rem] shrink-0 items-center justify-end gap-1.5">
                        {allDone ? (
                          <PaperAttemptTick
                            examName={paper.examName}
                            scope="section"
                            status="complete"
                          />
                        ) : (
                          <span className="h-5 w-5 shrink-0" aria-hidden />
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleAddSectionClick(
                              mainSection.name,
                              mainSection.subjectParts,
                            )
                          }
                          disabled={locked}
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors",
                            locked
                              ? "cursor-not-allowed text-text-disabled"
                              : "hover:bg-surface-mid hover:text-text",
                          )}
                          aria-label={
                            locked
                              ? `Upgrade to unlock ${mainSection.name}`
                              : `Add ${mainSection.name}`
                          }
                        >
                          {locked ? (
                            <Lock className="h-4 w-4" strokeWidth={2} />
                          ) : (
                            <Plus className="h-4 w-4" strokeWidth={2} />
                          )}
                        </button>
                      </div>
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
