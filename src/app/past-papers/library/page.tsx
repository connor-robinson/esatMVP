/**
 * Papers Library page - Paper Library
 * Browse papers and build a practice session from selected sections.
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { DrillUpgradeBanner } from '@/components/builder/DrillUpgradeBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { fetchPastPaperLibraryOutline } from "@/lib/papers/pastPaperLibraryData";
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import { getQuestions } from '@/lib/supabase/questions';
import { deriveTmuaSectionFromQuestion } from "@/lib/papers/sectionMapping";
import { questionMatchesSelectedSections, parseMainSectionFromLabel } from "@/lib/papers/paperLibrarySections";
import { generateSectionId } from '@/lib/papers/partIdUtils';
import type { Paper, PaperSection, Question, ExamName } from '@/types/papers';
import { PaperLibraryGrid } from '@/components/papers/library/PaperLibraryGrid';
import { PaperSessionSummary } from '@/components/papers/library/PaperSessionSummary';
import { ReplaceActivePaperModal } from '@/components/papers/ReplaceActivePaperModal';
import { shouldConfirmReplacePaperSession } from '@/lib/papers/activePaperSessionClient';
import { isPastPaperLibraryLocked, freePreviewPastPapersLabel } from '@/lib/papers/freePreviewPapers';
import {
  filterSectionsByEsatSubjects,
  filterSubjectPartsByEsatSubjects,
  esatSubjectsForPaperAdd,
} from '@/lib/papers/esatSubjectSectionMapping';
import {
  hasSeenLibraryTutorial,
  markLibraryTutorialSeen,
  resolveLibraryTutorialStep,
} from '@/lib/papers/libraryTutorial';

interface SelectedPaper {
  paper: Paper;
  selectedSections: Map<string, Set<PaperSection>>; // Map<mainSectionName, Set<subject>>
}

const TMUA_SECTIONS = ['Paper 1', 'Paper 2'] as const;
type TmuaSection = (typeof TMUA_SECTIONS)[number];

function paperHasSelectedSubjects(
  sections: Map<string, Set<PaperSection>>,
): boolean {
  for (const subjects of sections.values()) {
    if (subjects.size > 0) return true;
  }
  return false;
}

function mergeMainSectionMaps(
  existing: Map<string, Set<PaperSection>>,
  incoming: Map<string, Set<PaperSection>>,
): Map<string, Set<PaperSection>> {
  const merged = new Map(existing);
  incoming.forEach((subjects, mainSectionName) => {
    const next = new Set(merged.get(mainSectionName) ?? []);
    subjects.forEach((subject) => next.add(subject));
    merged.set(mainSectionName, next);
  });
  return merged;
}

const MAIN_SECTION_ORDER = ['Section 1', 'Section 2', 'Paper 1', 'Paper 2'];

function sortMainSectionEntries(
  sections: Map<string, Set<PaperSection>>,
): Array<[string, Set<PaperSection>]> {
  return [...sections.entries()].sort(([a], [b]) => {
    const ai = MAIN_SECTION_ORDER.indexOf(a);
    const bi = MAIN_SECTION_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function cloneMainSectionMap(
  source: Map<string, Set<PaperSection>>,
): Map<string, Set<PaperSection>> {
  const copy = new Map<string, Set<PaperSection>>();
  source.forEach((subjects, mainSectionName) => {
    copy.set(mainSectionName, new Set(subjects));
  });
  return copy;
}

function resolveAnchorPaperForSession(
  catalog: Paper[],
  selectedSections: Map<string, Set<PaperSection>>,
  fallback: Paper,
): Paper {
  const activeMainSections = sortMainSectionEntries(selectedSections)
    .filter(([, subjects]) => subjects.size > 0)
    .map(([name]) => name);

  for (const mainSection of activeMainSections) {
    const match = catalog.find((p) => {
      const fromPaperName = parseMainSectionFromLabel(p.paperName);
      return fromPaperName === mainSection || p.paperName === mainSection;
    });
    if (match) return match;
  }

  return fallback;
}

function buildSessionPaperVariant(
  year: number,
  examType: string,
  selectedSections: Map<string, Set<PaperSection>>,
  fallbackPaperName: string,
): string {
  const activeMainSections = sortMainSectionEntries(selectedSections)
    .filter(([, subjects]) => subjects.size > 0)
    .map(([name]) => name);
  const paperName =
    activeMainSections.length > 0 ? activeMainSections[0] : fallbackPaperName;
  return `${year}-${paperName}-${examType}`;
}

export default function PapersLibraryPage() {
  const router = useRouter();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const libraryLocked = !subscriptionLoading && !hasFullAccess;
  const treatAsFullAccess = subscriptionLoading || hasFullAccess;
  const { startSession, loadQuestions } = usePaperSessionStore();

  const paperIsLocked = (paper: Paper) =>
    isPastPaperLibraryLocked(paper, treatAsFullAccess);

  // Papers data
  const [papers, setPapers] = useState<Paper[]>([]);
  const [papersLoading, setPapersLoading] = useState(true);
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [customizeAcknowledged, setCustomizeAcknowledged] = useState(false);
  const [userEsatSubjects, setUserEsatSubjects] = useState<string[] | null>(null);

  useEffect(() => {
    setShowTutorial(!hasSeenLibraryTutorial());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/profile/preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (
          data.exam_preference === 'ESAT' &&
          Array.isArray(data.esat_subjects) &&
          data.esat_subjects.length > 0
        ) {
          setUserEsatSubjects(data.esat_subjects);
        }
      })
      .catch(() => {
        /* optional — fall back to adding all sections */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissTutorial = () => {
    markLibraryTutorialSeen();
    setShowTutorial(false);
  };

  useEffect(() => {
    let cancelled = false;
    setPapersLoading(true);
    setError(null);

    void fetchPastPaperLibraryOutline()
      .then((availablePapers) => {
        if (!cancelled) setPapers(availablePapers);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load papers");
        }
      })
      .finally(() => {
        if (!cancelled) setPapersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Add paper to selection
  const handleAddPaper = (paper: Paper) => {
    if (paperIsLocked(paper)) return;
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

  // Add full paper with all main sections (e.g. TMUA Paper 1 + Paper 2, ENGAA Section 1 + 2)
  const handleAddFullPaper = (
    paper: Paper,
    sectionsByMain: Map<string, Set<PaperSection>>,
  ) => {
    if (paperIsLocked(paper)) return;
    const sectionsToAdd = filterSectionsByEsatSubjects(
      sectionsByMain,
      paper,
      subjectsForAdd,
    );
    const existingPaper = selectedPapers.find((sp) => sp.paper.id === paper.id);
    if (existingPaper) {
      handleUpdateSections(
        paper.id,
        mergeMainSectionMaps(existingPaper.selectedSections, sectionsToAdd),
      );
    } else {
      setSelectedPapers((prev) => [
        ...prev,
        { paper, selectedSections: cloneMainSectionMap(sectionsToAdd) },
      ]);
    }
  };

  // Add a specific section (Section 1, Section 2, etc.)
  const handleAddSection = (
    paper: Paper,
    sectionName: string,
    subjectParts: PaperSection[],
  ) => {
    if (paperIsLocked(paper)) return;
    const filteredParts = filterSubjectPartsByEsatSubjects(
      subjectParts,
      paper,
      subjectsForAdd,
    );
    const existingPaper = selectedPapers.find((sp) => sp.paper.id === paper.id);

    if (existingPaper) {
      // Paper already selected, add all subjects from this section
      if (filteredParts.length > 0) {
        const newSections = new Map(existingPaper.selectedSections);
        const sectionSubjects =
          newSections.get(sectionName) || new Set<PaperSection>();
        filteredParts.forEach((subject) => sectionSubjects.add(subject));
        newSections.set(sectionName, sectionSubjects);
        handleUpdateSections(paper.id, newSections);
      }
    } else {
      // Add paper with all subjects from this section
      const newSections = new Map<string, Set<PaperSection>>();
      if (filteredParts.length > 0) {
        newSections.set(sectionName, new Set(filteredParts));
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

    if (!selectedPaper) {
      const paper = papers.find((p) => p.id === paperId);
      if (!paper || !mainSectionName || paperIsLocked(paper)) return;

      const newSections = new Map<string, Set<PaperSection>>();
      newSections.set(mainSectionName, new Set([section]));
      setSelectedPapers((prev) => [
        ...prev,
        { paper, selectedSections: newSections },
      ]);
      return;
    }

    if (!mainSectionName) return;

    const newSections = new Map(selectedPaper.selectedSections);
    const sectionSubjects =
      newSections.get(mainSectionName) || new Set<PaperSection>();

    if (sectionSubjects.has(section)) {
      sectionSubjects.delete(section);
    } else {
      sectionSubjects.add(section);
    }

    if (sectionSubjects.size === 0) {
      newSections.delete(mainSectionName);
    } else {
      newSections.set(mainSectionName, sectionSubjects);
    }

    handleUpdateSections(paperId, newSections);
  };

  const handleClearMainSection = (paperId: number, mainSectionName: string) => {
    const selectedPaper = selectedPapers.find((sp) => sp.paper.id === paperId);
    if (!selectedPaper) return;

    const newSections = new Map(selectedPaper.selectedSections);
    newSections.delete(mainSectionName);
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
    if (!paperHasSelectedSubjects(sections)) {
      setSelectedPapers((prev) => prev.filter((sp) => sp.paper.id !== paperId));
      return;
    }

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

    dismissTutorial();

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

    if (validPapers.some((sp) => paperIsLocked(sp.paper))) {
      alert(`Upgrade to unlock the selected papers, or choose ${freePreviewPastPapersLabel()} to try for free.`);
      return;
    }

    const firstPaper = validPapers[0];
    const paper = firstPaper.paper;

    const runStart = async () => {
      try {
        setIsStartingSession(true);
        setError(null);

        const paperType =
          examNameToPaperType(paper.examName as ExamName) || 'NSAA';
        const mergeSiblings =
          paperType === 'NSAA' ||
          paperType === 'ENGAA' ||
          paperType === 'ESAT' ||
          paperType === 'TMUA';

        const catalog = mergeSiblings
          ? papers.filter(
              (p) =>
                p.examName === paper.examName && p.examYear === paper.examYear,
            )
          : [paper];

        let allQuestions: Question[] = [];
        for (const catalogPaper of catalog) {
          const qs = await getQuestions(catalogPaper.id);
          allQuestions = [...allQuestions, ...qs];
        }

        let filteredQuestions: Question[] = [];
        if (paperType === 'TMUA') {
          const tmuaSubjects = new Set<PaperSection>();
          firstPaper.selectedSections.forEach((subjects) => {
            subjects.forEach((s) => tmuaSubjects.add(s));
          });
          const totalQuestions = allQuestions.length;
          filteredQuestions = allQuestions.filter((q, index) => {
            const section = deriveTmuaSectionFromQuestion(
              q,
              index,
              totalQuestions,
            );
            return tmuaSubjects.has(section);
          });
        } else {
          filteredQuestions = allQuestions.filter((q) =>
            questionMatchesSelectedSections(
              q,
              firstPaper.selectedSections,
              paperType,
              paper,
              catalog,
            ),
          );
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
          let tmuaPaperCount = 0;
          firstPaper.selectedSections.forEach((subjects) => {
            tmuaPaperCount += subjects.size;
          });
          timeLimitMinutes = tmuaPaperCount * 75;
        } else {
          timeLimitMinutes = Math.ceil(filteredQuestions.length * 1.48);
        }

        const anchorPaper = resolveAnchorPaperForSession(
          catalog,
          firstPaper.selectedSections,
          paper,
        );
        const variantString = buildSessionPaperVariant(
          paper.examYear,
          paper.examType || "Official",
          firstPaper.selectedSections,
          anchorPaper.paperName,
        );
        const paperTypeName =
          examNameToPaperType(paper.examName as ExamName) || 'NSAA';

        const selectedSections: PaperSection[] = [];
        const selectedPartIds: string[] = [];
        for (const [mainSectionName, subjects] of sortMainSectionEntries(
          firstPaper.selectedSections,
        )) {
          subjects.forEach((subject) => {
            selectedSections.push(subject);
            selectedPartIds.push(
              generateSectionId(
                paper.examName,
                paper.examYear,
                mainSectionName,
                subject,
                paper.examType,
              ),
            );
          });
        }

        // Must await: startSession sets sessionId/paperId after async in-progress cleanup;
        // loadQuestions reads store state and breaks navigation if it runs too early.
        await startSession({
          paperId: anchorPaper.id,
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
          selectedPartIds:
            selectedPartIds.length > 0 ? selectedPartIds : undefined,
        });

        await loadQuestions(anchorPaper.id);

        const storeAfter = usePaperSessionStore.getState();
        if (storeAfter.questionsError) {
          setError(
            `Could not load "${paper.examName} ${paper.examYear}" (paper #${anchorPaper.id}): ${storeAfter.questionsError}`,
          );
          return;
        }
        if (!storeAfter.questions || storeAfter.questions.length === 0) {
          setError(
            `No questions loaded for "${paper.examName} ${paper.examYear}" (#${anchorPaper.id}). Try different sections or contact support.`,
          );
          return;
        }

        router.push('/past-papers/solve');
      } catch (err) {
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

  const canStart = selectedPapers.some((sp) =>
    paperHasSelectedSubjects(sp.selectedSections),
  );

  const subjectsForAdd = useMemo(
    () =>
      esatSubjectsForPaperAdd(userEsatSubjects, {
        firstPaperOnly: showTutorial && selectedPapers.length === 0,
      }),
    [userEsatSubjects, showTutorial, selectedPapers.length],
  );

  const tutorialStep = useMemo(
    () =>
      resolveLibraryTutorialStep({
        showTutorial,
        hasBasketItems: canStart,
        canStart,
        multipleEsatSubjects: (userEsatSubjects?.length ?? 0) > 1,
        customizeAcknowledged,
      }),
    [showTutorial, canStart, userEsatSubjects, customizeAcknowledged],
  );

  const firstEsatSubject = userEsatSubjects?.[0] ?? null;

  if (error && papers.length === 0 && !papersLoading) {
    return (
      <Container size='lg'>
        <div className='py-16 text-center text-sm text-error'>{error}</div>
      </Container>
    );
  }

  return (
    <Container size='lg' className='py-7 sm:py-9'>
      {libraryLocked ? (
        <DrillUpgradeBanner
          className="mb-5"
          headline="Unlock every past paper"
          subtext={`${freePreviewPastPapersLabel()} are free to try. Upgrade for the full paper library, session builder, and analytics`}
          ctaLabel="View plans"
          href="/pricing"
        />
      ) : null}
      <div className='grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_min(100%,30rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_31rem]'>
        <div>
          <PaperLibraryGrid
            filterSourcePapers={papers}
            papers={filteredPapers}
            papersLoading={papersLoading}
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
            locked={libraryLocked}
            isPaperLocked={paperIsLocked}
            showTutorial={showTutorial}
            tutorialStep={tutorialStep}
            onDismissTutorial={dismissTutorial}
            firstEsatSubject={firstEsatSubject}
          />
        </div>

        <div className='min-w-0 lg:sticky lg:top-7 lg:self-start'>
          <PaperSessionSummary
            selectedPapers={selectedPapers}
            onRemovePaper={handleRemovePaper}
            onToggleSection={(paperId, section, mainSectionName) => {
              const existing = availableSectionsByPaper.get(paperId);
              if (!existing || existing.length === 0) {
                const candidate = Array.from(
                  new Set([...(existing || []), section]),
                ) as PaperSection[];
                registerAvailableSections(paperId, candidate);
              }
              handleToggleSection(paperId, section, mainSectionName);
              if (tutorialStep === "customize") {
                setCustomizeAcknowledged(true);
              }
            }}
            onClearMainSection={handleClearMainSection}
            onReorderPaper={handleReorderPaper}
            availableSectionsByPaper={availableSectionsByPaper}
            canStart={canStart && !isStartingSession}
            onStartSession={handleStartSession}
            allPapers={papers}
            highlightStart={tutorialStep === "start"}
            tutorialStep={tutorialStep}
            onTutorialCustomizeAck={() => setCustomizeAcknowledged(true)}
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
