/**
 * PaperColumn - Simplified paper item with icons and plus buttons
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import { getQuestions } from "@/lib/supabase/questions";
import { getAvailableSectionsFromParts, mapPartToSection } from "@/lib/papers/sectionMapping";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { Paper, PaperSection, Question } from "@/types/papers";

interface PaperColumnProps {
  paper: Paper;
  isSelected: boolean;
  selectedSections: Set<PaperSection>;
  onToggleSection: (paperId: number, section: PaperSection) => void;
  onAddFullPaper: (paper: Paper, sections: PaperSection[]) => void;
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

  const paperColor = getPaperTypeColor(paper.examName);
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
              (paperType === "NSAA" || paperType === "ENGAA" || paperType === "ESAT")
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

  const handleAddPaperClick = () => {
    if (availableSections.length > 0) {
      onAddFullPaper(paper, availableSections);
    } else {
      onAddPaper(paper);
    }
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
    <div className="space-y-2">
      {/* Main paper row */}
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg transition-all h-14",
          isSelected
            ? "bg-white/[0.08]"
            : "bg-white/[0.03] hover:bg-white/[0.05]"
        )}
      >
        {/* Left: Dropdown icon for papers */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-white/60 hover:text-white/80 transition-colors"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isExpanded ? "rotate-0" : "-rotate-90"
            )}
            strokeWidth={3}
          />
        </button>

        {/* Exam Name and Year */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-mono font-bold text-white/90">
            {paper.examName} {paper.examYear}
          </div>
        </div>

        {/* Right: Official/Specimen Tag */}
        {paper.examType && (
          <div className="px-2 py-1 rounded-md bg-white/5 text-[10px] uppercase font-mono tracking-wider text-white/30 mr-2 border border-white/5">
            {paper.examType}
          </div>
        )}

        {/* Right: Plus button */}
        <button
          onClick={handleAddPaperClick}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
            "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90",
            "shadow-md shadow-black/20"
          )}
          aria-label="Add paper to session"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Expanded sections - show Section 1 and Section 2 as separate rows */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-2 pl-11 overflow-hidden"
          >
            {loadingSections ? (
              <div className="text-xs text-white/40 py-2">Loading sections...</div>
            ) : mainSections.length === 0 ? (
              <div className="text-xs text-white/40 py-2">No sections available</div>
            ) : (
              mainSections.map((mainSection) => {
                const sectionNumber = mainSection.name === "Section 1" || mainSection.name === "Paper 1" ? "1" :
                  mainSection.name === "Section 2" || mainSection.name === "Paper 2" ? "2" : null;

                return (
                  <div
                    key={mainSection.name}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all h-14",
                      isSelected
                        ? "bg-white/[0.06]"
                        : "bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                  >
                    {/* Left: Number badge for sections */}
                    {sectionNumber ? (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                        style={{ backgroundColor: paperColor }}
                      >
                        {sectionNumber}
                      </div>
                    ) : (
                      <div className="w-8 h-8 flex-shrink-0" />
                    )}

                    {/* Section name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono font-semibold text-white/80">
                        {mainSection.name}
                      </div>
                    </div>

                    {/* Right: Plus button for section */}
                    <button
                      onClick={() => handleAddSectionClick(mainSection.name, mainSection.subjectParts)}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                        "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90",
                        "shadow-md shadow-black/20"
                      )}
                      aria-label={`Add ${mainSection.name} to session`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}
