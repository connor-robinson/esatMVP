/**
 * PaperColumn - Simplified paper item with icons and plus buttons
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Plus, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getExamSectionNumberBadgeClass } from "@/config/colors";
import { SectionsLoadingState } from "./SectionsLoadingState";
import { getQuestions } from "@/lib/supabase/questions";
import { getAvailableSectionsFromParts, mapPartToSection } from "@/lib/papers/sectionMapping";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { Paper, PaperSection, Question } from "@/types/papers";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { getPaperCompletionStatus, getPaperSectionCompletion } from "@/lib/papers/libraryCompletion";

interface PaperColumnProps {
  paper: Paper;
  isSelected: boolean;
  selectedSections: Set<PaperSection>;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  onAddFullPaper: (paper: Paper, sectionsByMain: Map<string, Set<PaperSection>>) => void;
  onAddPaper: (paper: Paper) => void;
  onAddSection?: (paper: Paper, sectionName: string, sections: PaperSection[]) => void;
  allPapers?: Paper[];
}

interface MainSection {
  name: string; // "Section 1", "Section 2", "Paper 1", "Paper 2"
  subjectParts: PaperSection[];
}

// Determine which main section a question belongs to
function getMainSectionForQuestion(
  question: Question,
  paperType: string,
  paperExamType?: string,
  paperName?: string
): "Section 1" | "Section 2" {
  const examTypeLower = (question.examType || paperExamType || "").toLowerCase();
  const partLetter = (question.partLetter || "").toString().toLowerCase();
  const partName = (question.partName || "").toString().toLowerCase();
  const paperNameLower = (question.paperName || paperName || "").toLowerCase();

  const isSection2 = /(^|\s)(section|paper)\s*2\b/.test(examTypeLower) ||
    examTypeLower === "s2" ||
    examTypeLower.includes("sec 2");
  const isSection1 = /(^|\s)(section|paper)\s*1\b/.test(examTypeLower) ||
    examTypeLower === "s1" ||
    examTypeLower.includes("sec 1");

  if (isSection2) return "Section 2";
  if (isSection1) return "Section 1";

  if (/(^|\s)(section|paper)\s*2\b/.test(paperNameLower) || paperNameLower.includes("sec 2")) {
    return "Section 2";
  }
  if (/(^|\s)(section|paper)\s*1\b/.test(paperNameLower) || paperNameLower.includes("sec 1")) {
    return "Section 1";
  }

  if (paperType === "NSAA") {
    const hasMathematics = (partName.includes("mathematics") || partLetter === "a" || partLetter === "1") &&
      !partName.includes("advanced");
    if (hasMathematics) return "Section 1";

    const isSciencePart = partLetter === "b" || partLetter === "c" || partLetter === "d" ||
      partLetter === "2" || partLetter === "3" || partLetter === "4";
    if (isSciencePart && !partName.includes("mathematics")) {
      return "Section 2";
    }
  }

  if (paperType === "ENGAA") {
    if (partLetter === "a" || partLetter === "1") {
      return "Section 1";
    }
    if (partLetter === "b" || partLetter === "2") {
      return "Section 2";
    }

    if (partName.includes("mathematics") && partName.includes("physics") && !partName.includes("advanced")) {
      return "Section 1";
    }
    if (partName.includes("advanced") && partName.includes("mathematics") && partName.includes("physics")) {
      return "Section 2";
    }
  }

  if (paperType === "ESAT") {
    return "Section 1";
  }

  return "Section 1";
}

// Group sections into main sections and subject parts based on actual questions
function groupSectionsIntoMainSections(
  sections: PaperSection[],
  paperType: string,
  examType: string,
  questions: Question[],
  paper?: Paper
): MainSection[] {
  const mainSections: MainSection[] = [];

  if (paperType === "TMUA") {
    const paper1Exists = sections.includes("Paper 1");
    const paper2Exists = sections.includes("Paper 2");

    if (paper1Exists) {
      mainSections.push({ name: "Paper 1", subjectParts: ["Paper 1"] });
    }
    if (paper2Exists) {
      mainSections.push({ name: "Paper 2", subjectParts: ["Paper 2"] });
    }

    if (mainSections.length === 0 && questions.length > 0) {
      mainSections.push({ name: "Paper 1", subjectParts: ["Paper 1"] });
      mainSections.push({ name: "Paper 2", subjectParts: ["Paper 2"] });
    }
  } else if (paperType === "NSAA" || paperType === "ENGAA" || paperType === "ESAT") {
    const section1Parts = new Set<PaperSection>();
    const section2Parts = new Set<PaperSection>();

    questions.forEach((question) => {
      const mainSection = getMainSectionForQuestion(
        question,
        paperType,
        paper?.examType,
        paper?.paperName
      );
      const subjectPart = mapPartToSection(
        { partLetter: question.partLetter, partName: question.partName },
        paperType
      );

      if (mainSection === "Section 1") {
        section1Parts.add(subjectPart);
      } else if (mainSection === "Section 2") {
        section2Parts.add(subjectPart);
      } else {
        section1Parts.add(subjectPart);
      }
    });

    if (section1Parts.size > 0) {
      mainSections.push({
        name: "Section 1",
        subjectParts: Array.from(section1Parts),
      });
    }

    if (section2Parts.size > 0) {
      mainSections.push({
        name: "Section 2",
        subjectParts: Array.from(section2Parts),
      });
    }

    if (mainSections.length === 0 && sections.length > 0) {
      mainSections.push({ name: "Section 1", subjectParts: sections });
    }
  } else {
    if (sections.length > 0) {
      mainSections.push({ name: "Sections", subjectParts: sections });
    }
  }

  return mainSections;
}

export function PaperColumn({
  paper,
  isSelected,
  selectedSections,
  onToggleSection,
  onAddFullPaper,
  onAddPaper,
  onAddSection,
  allPapers = [],
}: PaperColumnProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableSections, setAvailableSections] = useState<PaperSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [paperCompletionStatus, setPaperCompletionStatus] = useState<'none' | 'partial' | 'complete'>('none');
  const [sectionCompletionMap, setSectionCompletionMap] = useState<Map<PaperSection, boolean>>(new Map());
  const [loadingCompletion, setLoadingCompletion] = useState(false);

  const session = useSupabaseSession();
  const sectionNumberBadgeClass = getExamSectionNumberBadgeClass(paper.examName);
  const paperType = examNameToPaperType(paper.examName as any) || "NSAA";

  // Load sections and questions from both Section 1 and Section 2 if they exist
  useEffect(() => {
    const loadData = async () => {
      if (availableSections.length === 0 && !loadingSections) {
        setLoadingSections(true);
        try {
          const siblingPapers = allPapers.filter(
            (p) =>
              p.examName === paper.examName &&
              p.examYear === paper.examYear &&
              p.id !== paper.id &&
              (paperType === "NSAA" ||
                paperType === "ENGAA" ||
                paperType === "ESAT" ||
                paperType === "TMUA")
          );

          const currentQuestions = await getQuestions(paper.id);
          let allQuestions = [...currentQuestions];

          for (const siblingPaper of siblingPapers) {
            try {
              const siblingQuestions = await getQuestions(siblingPaper.id);
              allQuestions = [...allQuestions, ...siblingQuestions];
            } catch (error) {
              console.error(`[PaperColumn] Error loading sibling paper ${siblingPaper.id}:`, error);
            }
          }

          setQuestions(allQuestions);

          const allParts = allQuestions.map((q) => ({
            partLetter: q.partLetter,
            partName: q.partName,
          }));

          const sectionSet = new Set<PaperSection>();
          allParts.forEach((part) => {
            const section = mapPartToSection(part, paperType);
            sectionSet.add(section);
          });

          const allSections = Array.from(sectionSet);
          setAvailableSections(allSections);
        } catch (error) {
          console.error(`[PaperColumn] Error loading data for paper ${paper.id}:`, error);
        } finally {
          setLoadingSections(false);
        }
      }
    };
    loadData();
  }, [paper.id, paper.examName, paper.examYear, paperType, allPapers, availableSections.length, loadingSections]);

  // Group sections into main sections
  const mainSections = useMemo(() => {
    if (availableSections.length === 0 || questions.length === 0) {
      if (availableSections.length > 0) {
        return [{ name: "Section 1", subjectParts: availableSections }];
      }
      return [];
    }

    const grouped = groupSectionsIntoMainSections(availableSections, paperType, paper.examType, questions, paper);

    if (paperType === "TMUA") {
      return grouped;
    }

    return grouped;
  }, [availableSections, paperType, paper.examType, questions, paper]);

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
          console.error('[PaperColumn] Error loading completion status:', error);
        } finally {
          setLoadingCompletion(false);
        }
      };
      loadCompletionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadingCompletion intentionally excluded to prevent infinite loop (effect toggles it)
  }, [availableSections, session?.user?.id, paper]);

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

  const handleAddSectionClick = (sectionName: string, subjectParts: PaperSection[]) => {
    if (onAddSection) {
      onAddSection(paper, sectionName, subjectParts);
    } else {
      // Fallback: add all subjects from this section
      subjectParts.forEach((part) => {
        onToggleSection(paper.id, part);
      });
    }
  };

  return (
    <div className="space-y-1">
      {/* Main paper row */}
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 rounded-lg px-3 transition-colors",
          isSelected ? "bg-surface-neutral" : "bg-surface-elevated hover:bg-surface-neutral"
        )}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text"
          aria-label={isExpanded ? "Collapse sections" : "Expand sections"}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")}
            strokeWidth={2.5}
          />
        </button>

        {/* Title */}
        <div className="flex flex-1 min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-text">
            {paper.examName} {paper.examYear}
          </span>
          {paperCompletionStatus !== "none" && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                paperCompletionStatus === "complete"
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              )}
            >
              <CheckCircle2 className="h-2.5 w-2.5" />
              {paperCompletionStatus === "complete" ? "Complete" : "In Progress"}
            </span>
          )}
        </div>

        {/* Exam type badge */}
        {paper.examType && (
          <span className="inline-flex h-8 shrink-0 items-center rounded-[6px] bg-surface-neutral px-3 text-[10px] uppercase tracking-wide text-text-muted">
            {paper.examType}
          </span>
        )}

        {/* Add button */}
        <button
          type="button"
          onClick={handleAddPaperClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-dark text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
          aria-label="Add paper to session"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Expanded sections */}
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
              ) : mainSections.length === 0 ? (
                <div className="py-2 text-xs text-text-muted">No sections available</div>
              ) : (
                mainSections.map((mainSection) => {
                  const sectionNum =
                    mainSection.name === "Section 1" || mainSection.name === "Paper 1"
                      ? "1"
                      : mainSection.name === "Section 2" || mainSection.name === "Paper 2"
                      ? "2"
                      : null;
                  const allDone =
                    mainSection.subjectParts.length > 0 &&
                    mainSection.subjectParts.every((s) => sectionCompletionMap.get(s));

                  return (
                    <div
                      key={mainSection.name}
                      className="flex h-11 items-center gap-2.5 rounded-lg bg-surface-elevated px-3 transition-colors hover:bg-surface-mid"
                    >
                      {/* Section number badge */}
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

                      <span className="flex-1 min-w-0 truncate text-sm text-text-muted">
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
                        onClick={() => handleAddSectionClick(mainSection.name, mainSection.subjectParts)}
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
