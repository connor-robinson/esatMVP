/**
 * PaperSessionSummary - Redesigned with nested sections and subject dropdowns
 */

"use client";

import { useState, useMemo, useEffect, memo, useRef } from "react";
import {
  X,
  Clock,
  ChevronDown,
  Check,
  Edit3,
  FileText,
  Plus,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getPaperTypeColor, getSectionColor } from "@/config/colors";
import { getQuestionPartsForPaperIds } from "@/lib/supabase/questions";
import type { QuestionPartRow } from "@/lib/supabase/questions";
import { deriveTmuaSectionFromQuestion } from "@/lib/papers/sectionMapping";
import { fetchPaperSectionsOutline } from "@/lib/papers/pastPaperLibraryData";
import { questionMatchesSelectedSections } from "@/lib/papers/paperLibrarySections";
import type { PaperMainSection } from "@/lib/papers/paperLibrarySections";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { Paper, PaperSection, ExamName } from "@/types/papers";
import { SectionsLoadingState } from "./SectionsLoadingState";

function paperHasSelectedSubjects(
  sections: Map<string, Set<PaperSection>>,
): boolean {
  for (const subjects of sections.values()) {
    if (subjects.size > 0) return true;
  }
  return false;
}

const panelClass = "rounded-2xl bg-surface px-5 py-5";

interface SelectedPaper {
  paper: Paper;
  selectedSections: Map<string, Set<PaperSection>>; // Map<mainSectionName, Set<subject>>
}

interface PaperSessionSummaryProps {
  selectedPapers: SelectedPaper[];
  onRemovePaper: (paperId: number) => void;
  onToggleSection: (paperId: number, section: PaperSection, mainSectionName?: string) => void;
  onClearMainSection: (paperId: number, mainSectionName: string) => void;
  onReorderPaper: (paperId: number, direction: "up" | "down") => void;
  availableSectionsByPaper: Map<number, PaperSection[]>;
  canStart: boolean;
  onStartSession: () => void;
  allPapers?: Paper[]; // All papers to find sibling sections
}

interface PaperData {
  mainSections: PaperMainSection[];
  partRows: QuestionPartRow[];
  loading: boolean;
  catalog: Paper[];
}

// Memoized Paper Item Component to prevent unnecessary re-renders
interface PaperItemProps {
  paper: Paper;
  selectedSections: Map<string, Set<PaperSection>>; // Map<mainSectionName, Set<subject>>
  paperData?: PaperData;
  paperExpandedSections: Set<string>;
  onRemovePaper: (paperId: number) => void;
  onToggleSection: (paperId: number, section: PaperSection, mainSectionName?: string) => void;
  onClearMainSection: (paperId: number, mainSectionName: string) => void;
  onToggleSectionExpanded: (paperId: number, sectionName: string) => void;
}

function PaperItemComponent({
  paper,
  selectedSections,
  paperData,
  paperExpandedSections,
  onRemovePaper,
  onToggleSection,
  onClearMainSection,
  onToggleSectionExpanded,
}: PaperItemProps) {
  const loading = !paperData || paperData.loading;
  const mainSections = paperData?.mainSections || [];
  const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
  const isTmuaPaper = paperType === "TMUA";

  const visibleSections = mainSections.filter((mainSection) => {
    const sectionSubjects = selectedSections.get(mainSection.name) || new Set<PaperSection>();
    return mainSection.subjectParts.some((part) => sectionSubjects.has(part));
  });

  if (!loading && !paperHasSelectedSubjects(selectedSections)) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-organic-md bg-surface-mid/70">
      {/* Paper level */}
      <div className="flex h-14 items-center gap-3 bg-surface-mid px-3 transition-colors hover:bg-surface-mid/90">
        <div className="min-w-0 flex-1">
          <div className="font-heading text-base font-bold text-text">
            {paper.examName} {paper.examYear}
          </div>
        </div>

        {paper.examType ? (
          <span className="mr-1 shrink-0 rounded-md border border-border-subtle/60 bg-surface-elevated px-2 py-1 font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            {paper.examType}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => onRemovePaper(paper.id)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
          aria-label="Remove paper"
        >
          <Plus className="h-3.5 w-3.5 rotate-45 stroke-[2.5]" />
        </button>
      </div>

      {loading ? (
        <div className="border-t border-border-subtle/40 bg-surface-elevated/60 px-3 py-2">
          <SectionsLoadingState />
        </div>
      ) : visibleSections.length === 0 ? null : (
        visibleSections.map((mainSection) => {
          const isExpanded =
            !isTmuaPaper && paperExpandedSections.has(mainSection.name);
          const sectionSubjects = selectedSections.get(mainSection.name) || new Set<PaperSection>();
          const selectedCount = mainSection.subjectParts.filter((part) =>
            sectionSubjects.has(part),
          ).length;
          const showSubjectRows =
            !isTmuaPaper && isExpanded && mainSection.subjectParts.length > 0;

          return (
            <div
              key={mainSection.name}
              className="border-t border-border-subtle/40 bg-surface-elevated"
            >
              <div className="flex h-14 items-center gap-3 px-3">
                {isTmuaPaper ? (
                  <div className="h-8 w-8 shrink-0" aria-hidden />
                ) : (
                  <button
                    type="button"
                    onClick={() => onToggleSectionExpanded(paper.id, mainSection.name)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text"
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? `Collapse ${mainSection.name}`
                        : `Expand ${mainSection.name}`
                    }
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded ? "rotate-0" : "-rotate-90",
                      )}
                      strokeWidth={3}
                    />
                  </button>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-heading text-sm font-semibold text-text">
                    {mainSection.name}
                  </div>
                  {!isTmuaPaper && selectedCount > 0 ? (
                    <div className="mt-0.5 font-heading text-xs text-text-subtle">
                      {selectedCount}/{mainSection.subjectParts.length} selected
                    </div>
                  ) : null}
                </div>

                {selectedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onClearMainSection(paper.id, mainSection.name)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-mid/80 text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
                    aria-label={`Remove ${mainSection.name} from session`}
                  >
                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                ) : null}
              </div>

              {showSubjectRows
                ? mainSection.subjectParts.map((subject, subjectIndex) => {
                    const isSelected = sectionSubjects.has(subject);
                    const subjectColor = getSectionColor(subject);

                    return (
                      <button
                        key={`${mainSection.name}-${subject}`}
                        type="button"
                        onClick={() => onToggleSection(paper.id, subject, mainSection.name)}
                        className={cn(
                          "flex w-full items-center gap-3 border-t border-border-subtle/35 px-3 py-2.5 text-left font-heading transition-colors hover:bg-surface-mid/50",
                          subjectIndex === mainSection.subjectParts.length - 1 && "pb-3",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all",
                            isSelected ? "border-2" : "border-2 border-border bg-surface-mid",
                          )}
                          style={{
                            backgroundColor: isSelected ? subjectColor : undefined,
                            borderColor: isSelected ? subjectColor : undefined,
                          }}
                        >
                          {isSelected ? <Check className="h-3 w-3 text-background" /> : null}
                        </div>

                        <span
                          className={cn(
                            "flex-1 text-sm font-medium",
                            isSelected ? "text-text" : "text-text-muted",
                          )}
                        >
                          {subject}
                        </span>
                      </button>
                    );
                  })
                : null}
            </div>
          );
        })
      )}
    </div>
  );
}

const PaperItem = memo(PaperItemComponent);

export function PaperSessionSummary({
  selectedPapers,
  onRemovePaper,
  onToggleSection,
  onClearMainSection,
  onReorderPaper,
  availableSectionsByPaper,
  canStart,
  onStartSession,
  allPapers = [],
}: PaperSessionSummaryProps) {
  const [sessionName, setSessionName] = useState("Practice Session");
  const [isEditingName, setIsEditingName] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Map<number, Set<string>>>(new Map());
  const [paperData, setPaperData] = useState<Map<number, PaperData>>(new Map());
  const loadedPaperIdsRef = useRef<Set<number>>(new Set());

  // Load paper data (questions and sections) - only for new papers
  useEffect(() => {
    (async () => {
      // Only load data for papers that haven't been loaded yet
      const papersToLoad = selectedPapers.filter(({ paper }) => !loadedPaperIdsRef.current.has(paper.id));
      
      if (papersToLoad.length === 0) return;

      // Mark papers as being loaded
      papersToLoad.forEach(({ paper }) => {
        loadedPaperIdsRef.current.add(paper.id);
      });

      // Set loading state for new papers
      setPaperData((prev) => {
        const next = new Map(prev);
        papersToLoad.forEach(({ paper }) => {
          next.set(paper.id, {
            mainSections: [],
            partRows: [],
            loading: true,
            catalog: [paper],
          });
        });
        return next;
      });

      // Load data for each new paper (outline + part metadata only — no question images)
      await Promise.all(
        papersToLoad.map(async ({ paper }) => {
          try {
            const siblingPapers = allPapers.filter(
              (p) =>
                p.examName === paper.examName &&
                p.examYear === paper.examYear,
            );
            const catalog = siblingPapers.some((p) => p.id === paper.id)
              ? siblingPapers
              : [...siblingPapers, paper];
            const paperIds = catalog.map((p) => p.id);

            const outline = await fetchPaperSectionsOutline(paper.id);
            const partRows =
              outline.partRows ??
              (await getQuestionPartsForPaperIds(paperIds));

            setPaperData((prev) => {
              const next = new Map(prev);
              next.set(paper.id, {
                mainSections: outline.mainSections,
                partRows,
                loading: false,
                catalog,
              });
              return next;
            });

            setExpandedSections((prev) => {
              const next = new Map(prev);
              const paperSections = new Set<string>();
              outline.mainSections.forEach((section) => {
                paperSections.add(section.name);
              });
              next.set(paper.id, paperSections);
              return next;
            });
          } catch (error) {
            console.error(
              `[PaperSessionSummary] Error loading data for paper ${paper.id}:`,
              error,
            );
            setPaperData((prev) => {
              const next = new Map(prev);
              next.set(paper.id, {
                mainSections: [],
                partRows: [],
                loading: false,
                catalog: [paper],
              });
              return next;
            });
          }
        }),
      );
    })();
  }, [selectedPapers, allPapers]);

  // Clean up loaded papers ref and data when papers are removed
  useEffect(() => {
    const currentPaperIds = new Set(selectedPapers.map(({ paper }) => paper.id));
    loadedPaperIdsRef.current.forEach((paperId) => {
      if (!currentPaperIds.has(paperId)) {
        loadedPaperIdsRef.current.delete(paperId);
      }
    });
    // Clean up paper data for removed papers
    setPaperData((prev) => {
      const next = new Map(prev);
      next.forEach((_, paperId) => {
        if (!currentPaperIds.has(paperId)) {
          next.delete(paperId);
        }
      });
      return next;
    });
    // Clean up expanded sections for removed papers
    setExpandedSections((prev) => {
      const next = new Map(prev);
      next.forEach((_, paperId) => {
        if (!currentPaperIds.has(paperId)) {
          next.delete(paperId);
        }
      });
      return next;
    });
  }, [selectedPapers]);

  // Auto-expand sections for papers that have data loaded but aren't expanded yet
  useEffect(() => {
    setExpandedSections((prev) => {
      const next = new Map(prev);
      let changed = false;

      selectedPapers.forEach(({ paper }) => {
        const data = paperData.get(paper.id);
        if (data && !data.loading && data.mainSections.length > 0) {
          const currentExpanded = next.get(paper.id) || new Set<string>();
          const allSectionNames = new Set(data.mainSections.map((s) => s.name));
          
          // Check if all sections are already expanded
          const allExpanded = data.mainSections.every((s) => currentExpanded.has(s.name));
          
          if (!allExpanded) {
            // Expand all sections
            next.set(paper.id, allSectionNames);
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [selectedPapers, paperData]);

  // Note: Removed auto-select logic - papers should be added with explicit sections

  const toggleSectionExpanded = (paperId: number, sectionName: string) => {
    setExpandedSections((prev) => {
      const next = new Map(prev);
      const paperSections = next.get(paperId) || new Set<string>();
      const newPaperSections = new Set(paperSections);
      
      if (newPaperSections.has(sectionName)) {
        newPaperSections.delete(sectionName);
      } else {
        newPaperSections.add(sectionName);
      }
      
      next.set(paperId, newPaperSections);
      return next;
    });
  };

  const sessionStats = useMemo(() => {
    let totalSections = 0;
    let totalQuestions = 0;
    let totalTimeMinutes = 0;

    selectedPapers.forEach(({ paper, selectedSections }) => {
      let totalSelectedSubjects = 0;
      selectedSections.forEach((subjects) => {
        totalSelectedSubjects += subjects.size;
      });
      if (totalSelectedSubjects === 0) return;

      const data = paperData.get(paper.id);
      if (data && !data.loading) {
        const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";

        let filteredQuestionCount = 0;
        if (paperType === "TMUA") {
          const tmuaSubjects = new Set<PaperSection>();
          selectedSections.forEach((subjects) => {
            subjects.forEach((s) => tmuaSubjects.add(s));
          });
          totalSections += tmuaSubjects.size;
          const questionCount = data.partRows.length;
          filteredQuestionCount = data.partRows.filter((row, index) => {
            const section = deriveTmuaSectionFromQuestion(
              row as Parameters<typeof deriveTmuaSectionFromQuestion>[0],
              index,
              questionCount,
            );
            return tmuaSubjects.has(section);
          }).length;
          totalTimeMinutes += tmuaSubjects.size * 75;
        } else {
          selectedSections.forEach((subjects) => {
            totalSections += subjects.size;
          });
          filteredQuestionCount = data.partRows.filter((row) =>
            questionMatchesSelectedSections(
              row,
              selectedSections,
              paperType,
              paper,
              data.catalog,
            ),
          ).length;
          totalTimeMinutes += Math.ceil(filteredQuestionCount * 1.48);
        }

        totalQuestions += filteredQuestionCount;
      } else {
        selectedSections.forEach((subjects) => {
          totalSections += subjects.size;
        });
      }
    });

    return { totalSections, totalQuestions, totalTimeMinutes };
  }, [selectedPapers, paperData]);

  const basketPapers = useMemo(
    () =>
      selectedPapers.filter((sp) =>
        paperHasSelectedSubjects(sp.selectedSections),
      ),
    [selectedPapers],
  );

  const totalItems = basketPapers.length;

  const itemCountLabel =
    totalItems === 0
      ? "Empty"
      : `${totalItems} ${totalItems === 1 ? "paper" : "papers"}`;

  return (
    <aside
      className="flex min-h-[28rem] flex-col overflow-hidden rounded-organic-xl bg-surface shadow-sm sm:min-h-[30rem] lg:min-h-[32rem]"
      aria-label="Practice session basket"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border-subtle/50 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-[1.35rem]">
            Session basket
          </h2>
          <p className="mt-1 font-heading text-sm text-text-muted">
            Papers you add appear here.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 font-heading text-[11px] font-semibold tabular-nums",
            totalItems > 0
              ? "bg-maths/15 text-maths"
              : "bg-surface-mid text-text-muted",
          )}
        >
          {itemCountLabel}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-4 sm:px-5 sm:py-5">
        <div
          className={cn(
            "space-y-2 overflow-y-auto rounded-organic-md bg-surface-mid/45 p-3",
            totalItems === 0
              ? "min-h-[16rem] flex-1 sm:min-h-[18rem]"
              : "min-h-[14rem] max-h-[min(52vh,26rem)] flex-1 sm:min-h-[16rem] sm:max-h-[min(58vh,28rem)]",
          )}
        >
          {basketPapers.length === 0 ? (
            <div className="flex min-h-[14rem] flex-1 flex-col items-center justify-center gap-2.5 px-3 py-6 text-center sm:min-h-[16rem]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-elevated text-text-muted">
                <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-heading text-sm font-medium text-text">Basket is empty</p>
              <p className="max-w-[13rem] text-xs leading-relaxed text-text-muted">
                Add papers from the library to build your session.
              </p>
            </div>
          ) : (
            basketPapers.map(({ paper, selectedSections }) => (
              <PaperItem
                key={paper.id}
                paper={paper}
                selectedSections={selectedSections}
                paperData={paperData.get(paper.id)}
                paperExpandedSections={expandedSections.get(paper.id) || new Set<string>()}
                onRemovePaper={onRemovePaper}
                onToggleSection={onToggleSection}
                onClearMainSection={onClearMainSection}
                onToggleSectionExpanded={toggleSectionExpanded}
              />
            ))
          )}
        </div>
      </div>

      <footer className="mt-auto space-y-4 border-t border-border-subtle/50 bg-surface-mid/30 px-5 py-4 sm:px-6">
        {totalItems > 0 ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Session name
              </div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <Input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                    className="flex-1 border-0 bg-surface-elevated font-heading text-sm text-text ring-0 outline-none focus:outline-none focus:ring-0"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="flex-1 truncate font-heading text-sm font-medium text-text">
                      {sessionName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="rounded-organic-sm p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
                      aria-label="Edit session name"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-t border-border-subtle/40 pt-3">
              <div>
                <dt className="font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                  Subjects
                </dt>
                <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-text">
                  {sessionStats.totalSections}
                </dd>
              </div>
              <div>
                <dt className="font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                  Questions
                </dt>
                <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-text">
                  {sessionStats.totalQuestions > 0 ? sessionStats.totalQuestions : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-heading text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                  Time
                </dt>
                <dd className="mt-0.5 flex items-center gap-1 font-heading text-lg font-semibold tabular-nums text-text">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
                  {sessionStats.totalTimeMinutes > 0 ? `${sessionStats.totalTimeMinutes}m` : "—"}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="font-heading text-center text-xs text-text-muted">
            Add at least one paper and subject to start.
          </p>
        )}

        <button
          type="button"
          onClick={onStartSession}
          disabled={!canStart}
          aria-disabled={!canStart}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-organic-md py-3 font-heading text-sm font-semibold transition-colors duration-fast focus-visible:outline-none",
            canStart
              ? "cursor-pointer bg-maths text-background hover:bg-maths/85 dark:text-white"
              : "cursor-not-allowed bg-surface-neutral text-text-disabled shadow-none hover:bg-surface-neutral",
            "disabled:cursor-not-allowed disabled:bg-surface-neutral disabled:text-text-disabled disabled:hover:bg-surface-neutral",
          )}
        >
          Start Practice Session
          <ArrowRight
            className={cn("h-4 w-4 shrink-0", !canStart && "opacity-70")}
            strokeWidth={2.5}
            aria-hidden
          />
        </button>
      </footer>
    </aside>
  );
}

