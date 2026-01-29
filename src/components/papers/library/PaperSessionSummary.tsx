/**
 * PaperSessionSummary - Redesigned with nested sections and subject dropdowns
 */

"use client";

import { useState, useMemo, useEffect, memo, useRef } from "react";
import { X, Play, Clock, ChevronDown, Check, Edit3, FileText, Plus, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getPaperTypeColor, getSectionColor } from "@/config/colors";
import { getQuestions } from "@/lib/supabase/questions";
import { mapPartToSection, deriveTmuaSectionFromQuestion } from "@/lib/papers/sectionMapping";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { Paper, PaperSection, Question, ExamName } from "@/types/papers";

interface SelectedPaper {
  paper: Paper;
  selectedSections: Map<string, Set<PaperSection>>; // Map<mainSectionName, Set<subject>>
}

interface PaperSessionSummaryProps {
  selectedPapers: SelectedPaper[];
  onRemovePaper: (paperId: number) => void;
  onToggleSection: (paperId: number, section: PaperSection, mainSectionName?: string) => void;
  onReorderPaper: (paperId: number, direction: "up" | "down") => void;
  availableSectionsByPaper: Map<number, PaperSection[]>;
  canStart: boolean;
  onStartSession: () => void;
  allPapers?: Paper[]; // All papers to find sibling sections
}

interface MainSection {
  name: string; // "Section 1", "Section 2", "Paper 1", "Paper 2"
  subjectParts: PaperSection[];
}

interface PaperData {
  mainSections: MainSection[];
  questions: Question[];
  loading: boolean;
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

// Memoized Paper Item Component to prevent unnecessary re-renders
interface PaperItemProps {
  paper: Paper;
  selectedSections: Map<string, Set<PaperSection>>; // Map<mainSectionName, Set<subject>>
  paperData?: PaperData;
  paperExpandedSections: Set<string>;
  onRemovePaper: (paperId: number) => void;
  onToggleSection: (paperId: number, section: PaperSection, mainSectionName?: string) => void;
  onToggleSectionExpanded: (paperId: number, sectionName: string) => void;
}

function PaperItemComponent({
  paper,
  selectedSections,
  paperData,
  paperExpandedSections,
  onRemovePaper,
  onToggleSection,
  onToggleSectionExpanded,
}: PaperItemProps) {
  const loading = !paperData || paperData.loading;
  const mainSections = paperData?.mainSections || [];

  return (
    <div className="space-y-2">
      {/* Main paper row */}
      <div className="flex items-center gap-3 p-3 rounded-lg transition-all h-14 bg-surface-mid hover:bg-surface">
        {/* Exam Name and Year */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-mono font-bold text-text">
            {paper.examName} {paper.examYear}
          </div>
        </div>

        {/* Right: Official/Specimen Tag */}
        {paper.examType && (
          <div className="px-2 py-1 rounded-md bg-surface-elevated text-[10px] uppercase font-mono tracking-wider text-text-subtle mr-2 border border-border">
            {paper.examType}
          </div>
        )}

        {/* Right: Remove button (Plus icon rotated) */}
        <button
          onClick={() => onRemovePaper(paper.id)}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
            "bg-surface-elevated hover:bg-surface text-text-muted hover:text-text"
          )}
          aria-label="Remove paper"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] rotate-45" />
        </button>
      </div>

      {/* Expanded sections */}
      {loading ? (
        <div className="text-xs text-text-disabled py-2 pl-11">Loading sections...</div>
      ) : mainSections.length === 0 ? (
        <div className="text-xs text-text-disabled py-2 pl-11">No sections available</div>
      ) : (
        <div className="space-y-2 pl-11">
          {mainSections
            .filter((mainSection) => {
              // Only show sections that have at least one selected subject in this main section
              const sectionSubjects = selectedSections.get(mainSection.name) || new Set<PaperSection>();
              return mainSection.subjectParts.some((part) => sectionSubjects.has(part));
            })
            .map((mainSection) => {
            const isExpanded = paperExpandedSections.has(mainSection.name);
            const sectionSubjects = selectedSections.get(mainSection.name) || new Set<PaperSection>();
            const selectedCount = mainSection.subjectParts.filter(
              (part) => sectionSubjects.has(part)
            ).length;

            return (
              <div key={mainSection.name} className="space-y-2">
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all h-14",
                    "bg-surface-elevated hover:bg-surface-subtle"
                  )}
                >
                  {/* Left: Chevron for expand/collapse */}
                  <button
                    onClick={() => onToggleSectionExpanded(paper.id, mainSection.name)}
                    className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-text-muted hover:text-text transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )}
                      strokeWidth={3}
                    />
                  </button>

                  {/* Section name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono font-semibold text-text-muted">
                      {mainSection.name}
                    </div>
                    {selectedCount > 0 && (
                      <div className="text-xs text-text-subtle mt-0.5">
                        {selectedCount}/{mainSection.subjectParts.length} selected
                      </div>
                    )}
                  </div>

                  {/* Right: Cancel button to deselect all subjects in this section */}
                  {selectedCount > 0 && (
                    <button
                      onClick={() => {
                        // Deselect all subjects in this section
                        const sectionSubjects = selectedSections.get(mainSection.name) || new Set<PaperSection>();
                        mainSection.subjectParts.forEach((subject) => {
                          if (sectionSubjects.has(subject)) {
                            onToggleSection(paper.id, subject, mainSection.name);
                          }
                        });
                      }}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                        "bg-surface-elevated hover:bg-surface text-text-muted hover:text-text"
                      )}
                      aria-label="Deselect all subjects in this section"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Subject dropdown - shown when expanded */}
                {isExpanded && mainSection.subjectParts.length > 0 && (
                  <div className="pl-11 space-y-1.5">
                    {mainSection.subjectParts.map((subject) => {
                      // Check if this specific subject in this specific main section is selected
                      const sectionSubjects = selectedSections.get(mainSection.name) || new Set<PaperSection>();
                      const isSelected = sectionSubjects.has(subject);
                      const subjectColor = getSectionColor(subject);

                      return (
                        <button
                          key={subject}
                          onClick={() => {
                            // Toggle this specific subject in this specific main section
                            onToggleSection(paper.id, subject, mainSection.name);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left",
                            isSelected
                              ? "bg-surface-mid"
                              : "hover:bg-surface-subtle"
                          )}
                        >
                          {/* Color-coded Checkbox */}
                          <div
                            className={cn(
                              "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all",
                              isSelected
                                ? "border-2"
                                : "bg-surface-elevated border-2 border-border"
                            )}
                            style={{
                              backgroundColor: isSelected ? subjectColor : undefined,
                              borderColor: isSelected ? subjectColor : undefined,
                            }}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-text" />
                            )}
                          </div>

                          {/* Subject name */}
                          <span
                            className={cn(
                              "text-sm font-medium flex-1",
                              isSelected ? "text-text" : "text-text-muted"
                            )}
                          >
                            {subject}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PaperItem = memo(PaperItemComponent);

// Group sections into main sections
function groupSectionsIntoMainSections(
  questions: Question[],
  paperType: string,
  paper: Paper
): MainSection[] {
  const mainSections: MainSection[] = [];

  if (paperType === "TMUA") {
    const paper1Parts = new Set<PaperSection>();
    const paper2Parts = new Set<PaperSection>();

    questions.forEach((q, index) => {
      const section = deriveTmuaSectionFromQuestion(q, index, questions.length);
      if (section === "Paper 1") {
        paper1Parts.add("Paper 1");
      } else if (section === "Paper 2") {
        paper2Parts.add("Paper 2");
      }
    });

    if (paper1Parts.size > 0) {
      mainSections.push({ name: "Paper 1", subjectParts: ["Paper 1"] });
    }
    if (paper2Parts.size > 0) {
      mainSections.push({ name: "Paper 2", subjectParts: ["Paper 2"] });
    }
  } else if (paperType === "NSAA" || paperType === "ENGAA" || paperType === "ESAT") {
    const section1Parts = new Set<PaperSection>();
    const section2Parts = new Set<PaperSection>();

    questions.forEach((question) => {
      const mainSection = getMainSectionForQuestion(
        question,
        paperType,
        paper.examType,
        paper.paperName
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
  }

  return mainSections;
}

export function PaperSessionSummary({
  selectedPapers,
  onRemovePaper,
  onToggleSection,
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
          next.set(paper.id, { mainSections: [], questions: [], loading: true });
        });
        return next;
      });

      // Load data for each new paper
      for (const { paper } of papersToLoad) {
        try {
          // Find sibling papers from all papers
          const siblingPapers = allPapers.filter(
            (p) =>
              p.examName === paper.examName &&
              p.examYear === paper.examYear &&
              p.id !== paper.id
          );

          const currentQuestions = await getQuestions(paper.id);
          let allQuestions = [...currentQuestions];

          for (const siblingPaper of siblingPapers) {
            try {
              const siblingQuestions = await getQuestions(siblingPaper.id);
              allQuestions = [...allQuestions, ...siblingQuestions];
            } catch (error) {
              console.error(`[PaperSessionSummary] Error loading sibling paper ${siblingPaper.id}:`, error);
            }
          }

          const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
          const mainSections = groupSectionsIntoMainSections(allQuestions, paperType, paper);

          // Update only this paper's data
          setPaperData((prev) => {
            const next = new Map(prev);
            next.set(paper.id, {
              mainSections,
              questions: allQuestions,
              loading: false,
            });
            return next;
          });

          // Auto-expand all sections for this newly loaded paper
          setExpandedSections((prev) => {
            const next = new Map(prev);
            const paperSections = new Set<string>();
            mainSections.forEach((section) => {
              paperSections.add(section.name);
            });
            next.set(paper.id, paperSections);
            return next;
          });
        } catch (error) {
          console.error(`[PaperSessionSummary] Error loading data for paper ${paper.id}:`, error);
          setPaperData((prev) => {
            const next = new Map(prev);
            next.set(paper.id, {
              mainSections: [],
              questions: [],
              loading: false,
            });
            return next;
          });
        }
      }
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
      // Count total selected subjects across all main sections
      let totalSelectedSubjects = 0;
      selectedSections.forEach((subjects) => {
        totalSelectedSubjects += subjects.size;
      });
      if (totalSelectedSubjects === 0) return;
      
      // Flatten all selected subjects from all main sections
      const selectedSectionsArray: PaperSection[] = [];
      selectedSections.forEach((subjects, mainSectionName) => {
        subjects.forEach((subject) => selectedSectionsArray.push(subject));
      });
      
      totalSections += selectedSectionsArray.length;
      
      const data = paperData.get(paper.id);
      if (data && !data.loading) {
        const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";

        let filteredQuestions: Question[] = [];
        if (paperType === "TMUA") {
          const totalQuestions = data.questions.length;
          filteredQuestions = data.questions.filter((q, index) => {
            const section = deriveTmuaSectionFromQuestion(q, index, totalQuestions);
            return selectedSectionsArray.includes(section);
          });
        } else {
          filteredQuestions = data.questions.filter((q) => {
            const questionSection = mapPartToSection(
              { partLetter: q.partLetter, partName: q.partName },
              paperType
            );
            return selectedSectionsArray.includes(questionSection);
          });
        }

        totalQuestions += filteredQuestions.length;

        if (paperType === "TMUA") {
          totalTimeMinutes += selectedSectionsArray.length * 75;
        } else {
          totalTimeMinutes += Math.ceil(filteredQuestions.length * 1.5);
        }
      }
    });

    return { totalSections, totalQuestions, totalTimeMinutes };
  }, [selectedPapers, paperData]);

  const totalItems = selectedPapers.length;

  return (
    <Card variant="flat" className="p-5 h-full space-y-4 bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold uppercase tracking-wider text-text-muted">
            Practice Session
          </h2>
          <p className="text-sm font-mono text-text-subtle mt-1">
            Select subjects for each section.
          </p>
        </div>
        <span className="text-sm text-text-subtle font-medium">
          {totalItems} {totalItems === 1 ? "paper" : "papers"}
        </span>
      </div>

      {/* Selected papers */}
      <div className="min-h-[300px] rounded-lg p-4 bg-surface-mid space-y-3 overflow-y-auto">
        {selectedPapers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-text-disabled text-sm">
            <div>No papers selected yet.</div>
            <div className="text-xs">Browse the library to add papers.</div>
          </div>
        ) : (
          selectedPapers.map(({ paper, selectedSections }, index) => (
            <PaperItem
              key={paper.id}
              paper={paper}
              selectedSections={selectedSections}
              paperData={paperData.get(paper.id)}
              paperExpandedSections={expandedSections.get(paper.id) || new Set<string>()}
              onRemovePaper={onRemovePaper}
              onToggleSection={onToggleSection}
              onToggleSectionExpanded={toggleSectionExpanded}
            />
          ))
        )}
      </div>

      {/* Session Name & Stats */}
      {totalItems > 0 && (
        <div className="rounded-lg p-4 bg-surface-mid space-y-4">
          {/* Session Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-text-subtle uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Session Name
            </div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  className="flex-1 border-0 ring-0 outline-none focus:outline-none focus:ring-0 bg-surface-elevated text-text text-sm font-mono"
                  autoFocus
                />
              ) : (
                <>
                  <span className="font-mono font-medium text-text flex-1 text-sm">{sessionName}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
            <div className="space-y-1">
              <div className="text-xs font-mono text-text-subtle uppercase tracking-wider">Subjects</div>
              <div className="text-lg font-mono font-semibold text-text">
                {sessionStats.totalSections}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-text-subtle uppercase tracking-wider">Questions</div>
              <div className="text-lg font-mono font-semibold text-text">
                {sessionStats.totalQuestions > 0 ? sessionStats.totalQuestions : "—"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-text-subtle uppercase tracking-wider">Time</div>
              <div className="flex items-center gap-1.5 text-lg font-mono font-semibold text-text">
                <Clock className="w-4 h-4" />
                {sessionStats.totalTimeMinutes > 0 ? `${sessionStats.totalTimeMinutes}m` : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start session */}
      <button
        type="button"
        onClick={onStartSession}
        disabled={!canStart}
        className={cn(
          "w-full px-6 py-3 rounded-organic-md transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm font-medium",
          !canStart
            ? "bg-surface-elevated text-text-disabled cursor-not-allowed"
            : "bg-primary/60 hover:bg-primary/70 text-white cursor-pointer"
        )}
        style={
          canStart
            ? {
                boxShadow: 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)'
              }
            : undefined
        }
        onMouseEnter={(e) => {
          if (canStart) {
            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 8px 0 rgba(0, 0, 0, 0.7)';
          }
        }}
        onMouseLeave={(e) => {
          if (canStart) {
            e.currentTarget.style.boxShadow = 'inset 0 -4px 0 rgba(0, 0, 0, 0.4), 0 6px 0 rgba(0, 0, 0, 0.6)';
          }
        }}
      >
        <span>Start Practice Session</span>
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </Card>
  );
}

