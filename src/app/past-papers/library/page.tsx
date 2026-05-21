/**
 * Papers Library page - Paper Library
 * Browse papers and build a practice session from selected sections.
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { getAvailablePapers } from '@/lib/supabase/questions';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import { getQuestions } from '@/lib/supabase/questions';
import {
  mapPartToSection,
  deriveTmuaSectionFromQuestion,
} from '@/lib/papers/sectionMapping';
import type { Paper, PaperSection, Question, ExamName } from '@/types/papers';
import { PaperLibraryGrid } from '@/components/papers/library/PaperLibraryGrid';
import { PaperSessionSummary } from '@/components/papers/library/PaperSessionSummary';
import { ReplaceActivePaperModal } from '@/components/papers/ReplaceActivePaperModal';
import { shouldConfirmReplacePaperSession } from '@/lib/papers/activePaperSessionClient';

interface SelectedPaper {
  paper: Paper;
  selectedSections: Map<string, Set<PaperSection>>; // Map<mainSectionName, Set<subject>>
}

const TMUA_SECTIONS = ['Paper 1', 'Paper 2'] as const;
type TmuaSection = (typeof TMUA_SECTIONS)[number];

export default function PapersLibraryPage() {
  const router = useRouter();
  const { startSession, loadQuestions } = usePaperSessionStore();

  // Papers data
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Library filters
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState<string | 'ALL'>('ALL');
  const [yearFilter, setYearFilter] = useState<number | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string | 'ALL'>('ALL');

  // Selected papers with sections
  const [selectedPapers, setSelectedPapers] = useState<SelectedPaper[]>([]);
  const selectedPaperIds = useMemo(
    () => new Set(selectedPapers.map((sp) => sp.paper.id)),
    [selectedPapers],
  );

  // Map of selected sections by paper ID for grid component
  // Convert Map<mainSection, Set<subject>> to Set<subject> for backward compatibility
  const selectedSectionsByPaper = useMemo(() => {
    const map = new Map<number, Set<PaperSection>>();
    selectedPapers.forEach(({ paper, selectedSections }) => {
      // Flatten all selected subjects from all main sections into a single set
      const allSubjects = new Set<PaperSection>();
      selectedSections.forEach((subjects) => {
        subjects.forEach((subject) => allSubjects.add(subject));
      });
      map.set(paper.id, allSubjects);
    });
    return map;
  }, [selectedPapers]);

  // Sections loaded per paper (used by summary component)
  const [availableSectionsByPaper, setAvailableSectionsByPaper] = useState<
    Map<number, PaperSection[]>
  >(new Map());

  // Session starting state
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceConfirming, setReplaceConfirming] = useState(false);
  const pendingStartRef = useRef<(() => Promise<void>) | null>(null);

  // Load available papers on mount
  useEffect(() => {
    const loadPapers = async () => {
      setLoading(true);
      setError(null);
      try {
        const availablePapers = await getAvailablePapers();
        setPapers(availablePapers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load papers');
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
      setSelectedPapers((prev) =>
        prev.filter((sp) => sp.paper.id !== paper.id),
      );
    } else {
      // Add new paper with empty sections
      setSelectedPapers((prev) => [
        ...prev,
        { paper, selectedSections: new Map<string, Set<PaperSection>>() },
      ]);
    }
  };

  // Add full paper with all sections
  const handleAddFullPaper = (paper: Paper, sections: PaperSection[]) => {
    const existingPaper = selectedPapers.find((sp) => sp.paper.id === paper.id);
    if (existingPaper) {
      // Paper already selected, select all available sections
      // For full paper, we need to determine which main sections these belong to
      // This is a simplified version - in practice, we'd need to load the paper data
      const allSections = new Map<string, Set<PaperSection>>();
      allSections.set('Section 1', new Set(sections));
      handleUpdateSections(paper.id, allSections);
    } else {
      // Add paper with all sections selected
      const allSections = new Map<string, Set<PaperSection>>();
      allSections.set('Section 1', new Set(sections));
      setSelectedPapers((prev) => [
        ...prev,
        { paper, selectedSections: allSections },
      ]);
    }
  };

  // Add a specific section (Section 1, Section 2, etc.)
  const handleAddSection = (
    paper: Paper,
    sectionName: string,
    subjectParts: PaperSection[],
  ) => {
    const existingPaper = selectedPapers.find((sp) => sp.paper.id === paper.id);

    if (existingPaper) {
      // Paper already selected, add all subjects from this section
      if (subjectParts.length > 0) {
        const newSections = new Map(existingPaper.selectedSections);
        const sectionSubjects =
          newSections.get(sectionName) || new Set<PaperSection>();
        subjectParts.forEach((subject) => sectionSubjects.add(subject));
        newSections.set(sectionName, sectionSubjects);
        handleUpdateSections(paper.id, newSections);
      }
    } else {
      // Add paper with all subjects from this section
      const newSections = new Map<string, Set<PaperSection>>();
      if (subjectParts.length > 0) {
        newSections.set(sectionName, new Set(subjectParts));
      }
      setSelectedPapers((prev) => [
        ...prev,
        { paper, selectedSections: newSections },
      ]);
    }
  };

  const handleToggleSection = (
    paperId: number,
    section: PaperSection,
    mainSectionName?: string,
  ) => {
    const selectedPaper = selectedPapers.find((sp) => sp.paper.id === paperId);

    // If paper is not in selection, add it first
    if (!selectedPaper) {
      const paper = papers.find((p) => p.id === paperId);
      if (!paper) return;

      // Add paper with the selected section
      const newSections = new Map<string, Set<PaperSection>>();
      if (mainSectionName) {
        newSections.set(mainSectionName, new Set([section]));
      } else {
        // Fallback: use "Section 1" if no main section name provided
        newSections.set('Section 1', new Set([section]));
      }
      setSelectedPapers((prev) => [
        ...prev,
        { paper, selectedSections: newSections },
      ]);
      return;
    }

    // Use the provided main section name, or default to "Section 1"
    const sectionName = mainSectionName || 'Section 1';
    const newSections = new Map(selectedPaper.selectedSections);
    const sectionSubjects =
      newSections.get(sectionName) || new Set<PaperSection>();

    if (sectionSubjects.has(section)) {
      sectionSubjects.delete(section);
      // If no subjects left in this section, remove the section entry
      if (sectionSubjects.size === 0) {
        newSections.delete(sectionName);
        // If no sections left at all, remove the paper
        if (newSections.size === 0) {
          setSelectedPapers((prev) =>
            prev.filter((sp) => sp.paper.id !== paperId),
          );
          return;
        }
      } else {
        newSections.set(sectionName, sectionSubjects);
      }
    } else {
      sectionSubjects.add(section);
      newSections.set(sectionName, sectionSubjects);
    }

    handleUpdateSections(paperId, newSections);
  };

  // Keep track of available sections per paper when session summary discovers them
  const registerAvailableSections = (
    paperId: number,
    sections: PaperSection[],
  ) => {
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
      if (examFilter !== 'ALL' && paper.examName !== examFilter) return false;
      if (yearFilter !== 'ALL' && paper.examYear !== yearFilter) return false;
      if (typeFilter !== 'ALL' && paper.examType !== typeFilter) return false;

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
    sections: Map<string, Set<PaperSection>>,
  ) => {
    setSelectedPapers((prev) =>
      prev.map((sp) =>
        sp.paper.id === paperId ? { ...sp, selectedSections: sections } : sp,
      ),
    );
  };

  // Reorder paper in selection
  const handleReorderPaper = (paperId: number, direction: 'up' | 'down') => {
    setSelectedPapers((prev) => {
      const index = prev.findIndex((sp) => sp.paper.id === paperId);
      if (index === -1) return prev;

      const newPapers = [...prev];
      if (direction === 'up' && index > 0) {
        [newPapers[index - 1], newPapers[index]] = [
          newPapers[index],
          newPapers[index - 1],
        ];
      } else if (direction === 'down' && index < newPapers.length - 1) {
        [newPapers[index], newPapers[index + 1]] = [
          newPapers[index + 1],
          newPapers[index],
        ];
      }
      return newPapers;
    });
  };

  // Start session (optionally after replace confirmation)
  const handleStartSession = async () => {
    if (isStartingSession) return;

    // Validate: at least one paper with at least one section
    const validPapers = selectedPapers.filter((sp) => {
      let hasSelectedSubjects = false;
      sp.selectedSections.forEach((subjects) => {
        if (subjects.size > 0) hasSelectedSubjects = true;
      });
      return hasSelectedSubjects;
    });

    if (validPapers.length === 0) {
      alert('Please select at least one paper with at least one section.');
      return;
    }

    const firstPaper = validPapers[0];
    const paper = firstPaper.paper;
    const selectedSections: PaperSection[] = [];
    firstPaper.selectedSections.forEach((subjects) => {
      subjects.forEach((subject) => selectedSections.push(subject));
    });

    const runStart = async () => {
      try {
        setIsStartingSession(true);
        setError(null);

        const allQuestions = await getQuestions(paper.id);

        let filteredQuestions: Question[] = [];
        const paperType =
          examNameToPaperType(paper.examName as ExamName) || 'NSAA';

        if (paperType === 'TMUA') {
          const totalQuestions = allQuestions.length;
          filteredQuestions = allQuestions.filter((q, index) => {
            const section = deriveTmuaSectionFromQuestion(
              q,
              index,
              totalQuestions,
            );
            return selectedSections.includes(section);
          });
        } else {
          filteredQuestions = allQuestions.filter((q) => {
            const questionSection = mapPartToSection(
              { partLetter: q.partLetter, partName: q.partName },
              paperType,
            );
            return selectedSections.includes(questionSection);
          });
        }

        if (filteredQuestions.length === 0) {
          throw new Error('No questions found for selected sections.');
        }

        const questionNumbers = filteredQuestions
          .map((q) => q.questionNumber)
          .sort((a, b) => a - b);
        const questionStart = questionNumbers[0];
        const questionEnd = questionNumbers[questionNumbers.length - 1];

        let timeLimitMinutes: number;
        if (paperType === 'TMUA') {
          timeLimitMinutes = selectedSections.length * 75;
        } else {
          timeLimitMinutes = Math.ceil(filteredQuestions.length * 1.48);
        }

        const variantString = `${paper.examYear}-${paper.paperName}-${paper.examType}`;
        const paperTypeName =
          examNameToPaperType(paper.examName as ExamName) || 'NSAA';

        // Must await: startSession sets sessionId/paperId after async in-progress cleanup;
        // loadQuestions reads store state and breaks navigation if it runs too early.
        await startSession({
          paperId: paper.id,
          paperName: paperTypeName,
          paperVariant: variantString,
          sessionName: `${paper.examName} ${paper.examYear} - ${new Date().toLocaleString()}`,
          timeLimitMinutes,
          questionRange: {
            start: questionStart,
            end: questionEnd,
          },
          selectedSections:
            selectedSections.length > 0 ? selectedSections : undefined,
        });

        await loadQuestions(paper.id);

        const storeAfter = usePaperSessionStore.getState();
        if (storeAfter.questionsError) {
          setError(
            `Could not load "${paper.examName} ${paper.examYear}" (paper #${paper.id}): ${storeAfter.questionsError}`,
          );
          return;
        }
        if (!storeAfter.questions || storeAfter.questions.length === 0) {
          setError(
            `No questions loaded for "${paper.examName} ${paper.examYear}" (#${paper.id}). Try different sections or contact support.`,
          );
          return;
        }

        router.push('/past-papers/solve');
      } catch (err) {
        console.error('[library] Error starting session:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to start session. Try another paper or contact support.',
        );
      } finally {
        setIsStartingSession(false);
      }
    };

    if (await shouldConfirmReplacePaperSession()) {
      pendingStartRef.current = runStart;
      setReplaceModalOpen(true);
      return;
    }

    await runStart();
  };

  const handleCancelReplaceSession = () => {
    pendingStartRef.current = null;
    setReplaceModalOpen(false);
    setReplaceConfirming(false);
  };

  const handleConfirmReplaceSession = async () => {
    const fn = pendingStartRef.current;
    pendingStartRef.current = null;
    if (!fn) {
      setReplaceModalOpen(false);
      return;
    }
    setReplaceConfirming(true);
    try {
      await fn();
    } finally {
      setReplaceConfirming(false);
      setReplaceModalOpen(false);
    }
  };

  const canStart =
    selectedPapers.length > 0 &&
    selectedPapers.some((sp) => sp.selectedSections.size > 0);

  if (loading) {
    return (
      <Container size='lg'>
        <div className='py-16 text-center text-sm text-text-muted'>Loading papers…</div>
      </Container>
    );
  }

  if (error && papers.length === 0) {
    return (
      <Container size='lg'>
        <div className='py-16 text-center text-sm text-error'>{error}</div>
      </Container>
    );
  }

  return (
    <Container size='lg' className='py-7 sm:py-9'>
      <div className='grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_min(100%,26.25rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <div>
          <PaperLibraryGrid
            filterSourcePapers={papers}
            papers={filteredPapers}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            examFilter={examFilter}
            onExamFilterChange={setExamFilter}
            yearFilter={yearFilter}
            onYearFilterChange={setYearFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            selectedPaperIds={selectedPaperIds}
            selectedSectionsByPaper={selectedSectionsByPaper}
            onToggleSection={handleToggleSection}
            onAddFullPaper={handleAddFullPaper}
            onAddPaper={handleAddPaper}
            onAddSection={handleAddSection}
          />
        </div>

        <div className='min-w-0 lg:sticky lg:top-7 lg:self-start'>
          <PaperSessionSummary
            selectedPapers={selectedPapers}
            onRemovePaper={handleRemovePaper}
            onToggleSection={(paperId, section) => {
              // Also register sections for stats if not present yet
              const existing = availableSectionsByPaper.get(paperId);
              if (!existing || existing.length === 0) {
                const candidate = Array.from(
                  new Set([...(existing || []), section]),
                ) as PaperSection[];
                registerAvailableSections(paperId, candidate);
              }
              handleToggleSection(paperId, section);
            }}
            onReorderPaper={handleReorderPaper}
            availableSectionsByPaper={availableSectionsByPaper}
            canStart={canStart && !isStartingSession}
            onStartSession={handleStartSession}
            allPapers={papers}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          role='alert'
          className='mt-6 rounded-organic-lg border border-error/30 bg-error/10 p-4 text-sm text-error'
        >
          {error}
        </div>
      )}

      <ReplaceActivePaperModal
        open={replaceModalOpen}
        onCancel={handleCancelReplaceSession}
        onConfirm={handleConfirmReplaceSession}
        isConfirming={replaceConfirming}
      />
    </Container>
  );
}
