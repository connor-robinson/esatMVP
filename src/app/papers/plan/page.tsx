/**
 * Papers Plan page - Paper Library
 * Browse papers and build a practice session from selected sections.
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { getAvailablePapers } from "@/lib/supabase/questions";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import { getQuestions } from "@/lib/supabase/questions";
import { mapPartToSection, deriveTmuaSectionFromQuestion } from "@/lib/papers/sectionMapping";
import type { Paper, PaperSection, Question } from "@/types/papers";
import { PaperLibraryFilters } from "@/components/papers/plan/PaperLibraryFilters";
import { PaperLibraryGrid } from "@/components/papers/plan/PaperLibraryGrid";
import { PaperSessionSummary } from "@/components/papers/plan/PaperSessionSummary";

interface SelectedPaper {
  paper: Paper;
  selectedSections: Set<PaperSection>;
}

const TMUA_SECTIONS = ["Paper 1", "Paper 2"] as const;
type TmuaSection = typeof TMUA_SECTIONS[number];

export default function PapersPlanPage() {
  const router = useRouter();
  const { startSession, loadQuestions } = usePaperSessionStore();

  // Papers data
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Library filters
  const [searchQuery, setSearchQuery] = useState("");
  const [examFilter, setExamFilter] = useState<string | "ALL">("ALL");
  const [yearFilter, setYearFilter] = useState<number | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string | "ALL">("ALL");

  // Selected papers with sections
  const [selectedPapers, setSelectedPapers] = useState<SelectedPaper[]>([]);
  const selectedPaperIds = useMemo(
    () => new Set(selectedPapers.map((sp) => sp.paper.id)),
    [selectedPapers]
  );

  // Sections loaded per paper (used by summary component)
  const [availableSectionsByPaper, setAvailableSectionsByPaper] = useState<
    Map<number, PaperSection[]>
  >(new Map());

  // Session starting state
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Load available papers on mount
  useEffect(() => {
    const loadPapers = async () => {
      setLoading(true);
      setError(null);
      try {
        const availablePapers = await getAvailablePapers();
        setPapers(availablePapers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load papers");
      } finally {
        setLoading(false);
      }
    };

    loadPapers();
  }, []);

  // Add paper to selection
  const handleAddPaper = (paper: Paper) => {
    if (selectedPaperIds.has(paper.id)) {
      // Already selected, remove it
      setSelectedPapers((prev) => prev.filter((sp) => sp.paper.id !== paper.id));
    } else {
      // Add new paper with empty sections
      setSelectedPapers((prev) => [
        ...prev,
        { paper, selectedSections: new Set<PaperSection>() },
      ]);
    }
  };
  const handleToggleSection = (paperId: number, section: PaperSection) => {
    const selectedPaper = selectedPapers.find((sp) => sp.paper.id === paperId);
    if (!selectedPaper) return;

    const newSections = new Set(selectedPaper.selectedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }

    handleUpdateSections(paperId, newSections);
  };

  // Keep track of available sections per paper when session summary discovers them
  const registerAvailableSections = (paperId: number, sections: PaperSection[]) => {
    setAvailableSectionsByPaper((prev) => {
      if (prev.has(paperId)) return prev;
      const next = new Map(prev);
      next.set(paperId, sections);
      return next;
    });
  };

  // Derive filtered papers for grid
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      if (examFilter !== "ALL" && paper.examName !== examFilter) return false;
      if (yearFilter !== "ALL" && paper.examYear !== yearFilter) return false;
      if (typeFilter !== "ALL" && paper.examType !== typeFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        paper.examName.toLowerCase().includes(q) ||
        paper.paperName.toLowerCase().includes(q) ||
        paper.examYear.toString().includes(q) ||
        paper.examType.toLowerCase().includes(q)
      );
    });
  }, [papers, examFilter, yearFilter, typeFilter, searchQuery]);


  // Remove paper from selection
  const handleRemovePaper = (paperId: number) => {
    setSelectedPapers((prev) => prev.filter((sp) => sp.paper.id !== paperId));
  };

  // Update sections for a paper
  const handleUpdateSections = (
    paperId: number,
    sections: Set<PaperSection>
  ) => {
    setSelectedPapers((prev) =>
      prev.map((sp) =>
        sp.paper.id === paperId ? { ...sp, selectedSections: sections } : sp
      )
    );
  };

  // Start session
  const handleStartSession = async () => {
    if (isStartingSession) return;

    // Validate: at least one paper with at least one section
    const validPapers = selectedPapers.filter(
      (sp) => sp.selectedSections.size > 0
    );

    if (validPapers.length === 0) {
      alert("Please select at least one paper with at least one section.");
      return;
    }

    // For now, start with the first valid paper
    // TODO: Support multi-paper sessions in the future
    const firstPaper = validPapers[0];
    const paper = firstPaper.paper;
    const selectedSections = Array.from(firstPaper.selectedSections);

    try {
      setIsStartingSession(true);
      setError(null);

      // Get questions for this paper
      const allQuestions = await getQuestions(paper.id);

      // Filter questions by selected sections
      let filteredQuestions: Question[] = [];
      const paperType = examNameToPaperType(paper.examName) || "NSAA";

      if (paperType === "TMUA") {
        const totalQuestions = allQuestions.length;
        filteredQuestions = allQuestions.filter((q, index) => {
          const section = deriveTmuaSectionFromQuestion(
            q,
            index,
            totalQuestions
          );
          return selectedSections.includes(section);
        });
      } else {
        filteredQuestions = allQuestions.filter((q) => {
          const questionSection = mapPartToSection(
            { partLetter: q.partLetter, partName: q.partName },
            paperType
          );
          return selectedSections.includes(questionSection);
        });
      }

      if (filteredQuestions.length === 0) {
        throw new Error("No questions found for selected sections.");
      }

      // Calculate question range
      const questionNumbers = filteredQuestions
        .map((q) => q.questionNumber)
        .sort((a, b) => a - b);
      const questionStart = questionNumbers[0];
      const questionEnd = questionNumbers[questionNumbers.length - 1];

      // Calculate time limit (1.5 min per question, or 75 min per section for TMUA)
      let timeLimitMinutes: number;
      if (paperType === "TMUA") {
        timeLimitMinutes = selectedSections.length * 75;
      } else {
        timeLimitMinutes = Math.ceil(filteredQuestions.length * 1.5);
      }

      // Create variant string
      const variantString = `${paper.examYear}-${paper.paperName}-${paper.examType}`;
      const paperTypeName = examNameToPaperType(paper.examName) || "NSAA";

      // Start session
      startSession({
        paperId: paper.id,
        paperName: paperTypeName,
        paperVariant: variantString,
        sessionName: `${paper.examName} ${paper.examYear} - ${new Date().toLocaleString()}`,
        timeLimitMinutes,
        questionRange: {
          start: questionStart,
          end: questionEnd,
        },
        selectedSections: selectedSections.length > 0 ? selectedSections : undefined,
      });

      // Load questions and navigate
      await loadQuestions(paper.id);
      router.push("/papers/solve");
    } catch (err) {
      console.error("[plan] Error starting session:", err);
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setIsStartingSession(false);
    }
  };

  const canStart =
    selectedPapers.length > 0 &&
    selectedPapers.some((sp) => sp.selectedSections.size > 0);

  if (loading) {
    return (
      <Container>
        <PageHeader title="Paper Library" />
        <div className="py-12 text-center text-white/50">Loading papers...</div>
      </Container>
    );
  }

  if (error && papers.length === 0) {
    return (
      <Container>
        <PageHeader title="Paper Library" />
        <div className="py-12 text-center text-red-400">{error}</div>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Paper Library"
        description="Browse past papers by exam and year, then build a focused practice session from selected sections."
      />

      {/* Three-column layout: filters • library • session summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1.4fr)_360px] gap-6 py-8">
        {/* Left: Filters */}
        <div>
          <PaperLibraryFilters
            papers={papers}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            examFilter={examFilter}
            onExamFilterChange={setExamFilter}
            yearFilter={yearFilter}
            onYearFilterChange={setYearFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />
        </div>

        {/* Middle: Paper grid */}
        <div>
          <PaperLibraryGrid
            papers={filteredPapers}
            selectedPaperIds={selectedPaperIds}
            onToggleSelect={handleAddPaper}
          />
        </div>

        {/* Right: Session summary */}
        <div>
          <PaperSessionSummary
            selectedPapers={selectedPapers}
            onRemovePaper={handleRemovePaper}
            onToggleSection={(paperId, section) => {
              // Also register sections for stats if not present yet
              const existing = availableSectionsByPaper.get(paperId);
              if (!existing || existing.length === 0) {
                const candidate = Array.from(
                  new Set([
                    ...(existing || []),
                    section,
                  ])
                ) as PaperSection[];
                registerAvailableSections(paperId, candidate);
              }
              handleToggleSection(paperId, section);
            }}
            availableSectionsByPaper={availableSectionsByPaper}
            canStart={canStart && !isStartingSession}
            onStartSession={handleStartSession}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
    </Container>
  );
}
