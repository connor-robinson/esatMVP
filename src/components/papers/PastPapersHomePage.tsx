/**
 * Past Papers Home: practice table (formerly roadmap).
 * All papers are free to sit. Full marking (solutions, mistake review,
 * detailed stats, analytics) requires an upgrade.
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import {
  getRoadmapStages,
  getRoadmapStagesShell,
  type RoadmapStage,
} from '@/lib/papers/roadmapConfig';
import { RoadmapTable } from '@/components/papers/roadmap/RoadmapTable';
import { PastPapersLegacyLinks } from '@/components/papers/PastPapersLegacyLinks';
import { PastPapersPreferenceSurvey } from '@/components/papers/PastPapersPreferenceSurvey';
import { useSubscription } from '@/hooks/useSubscription';
import { getSectionForRoadmapPart } from '@/lib/papers/roadmapConfig';
import { deriveTmuaSectionFromQuestion } from '@/lib/papers/sectionMapping';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { getPaper, getQuestions } from '@/lib/supabase/questions';
import { isEsatCampMockExamType } from '@/lib/papers/esatCampMocks';
import { getAdminEsatMockPapersForSelectedParts } from '@/lib/papers/adminEsatMocks';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import type { PaperSection, Question, Paper } from '@/types/papers';
import type { RoadmapPart } from '@/lib/papers/roadmapConfig';
import { allowLoadingPaint } from '@/lib/papers/allowLoadingPaint';
import { preloadQuestionsAssets } from '@/lib/pearson/preloadQuestionAssets';
import { PearsonPleaseWaitScreen } from '@/components/pearson/PearsonPleaseWaitScreen';
import { applyEsatSubjectsToRoadmapStages } from '@/lib/papers/roadmapEsatFilter';
import type { RoadmapStartOptions } from '@/components/papers/roadmap/StageListCard';
import { questionMatchesRoadmapPart } from '@/lib/papers/roadmapQuestionMatch';
import { generatePartIdFromRoadmapPart } from '@/lib/papers/partIdUtils';
import {
  filterToUniqueQuestionsOnly,
  loadAttemptedQuestionsContext,
  type AttemptedQuestionsContext,
} from '@/lib/papers/roadmapAttemptedQuestions';
import {
  readNewQuestionsOnlyPreference,
  writeNewQuestionsOnlyPreference,
} from '@/lib/papers/roadmapNewQuestionsPreference';
import { PAST_PAPERS_HOME_PATH } from '@/lib/papers/pastPapersUiPreference';
import {
  countDisplayGroupCompletion,
  groupRoadmapPartsForDisplay,
} from '@/lib/papers/roadmapDisplayGroups';
import { fetchUserSessions } from '@/lib/papers/analytics';
import {
  buildRoadmapStageScores,
  type RoadmapStageScore,
} from '@/lib/papers/roadmapStageScores';
import { PastPaperGuestStartModal } from '@/components/papers/PastPaperGuestStartModal';

type StageCompletionEntry = {
  completed: number;
  total: number;
  parts: Map<string, boolean>;
};

function buildDefaultCompletion(stages: RoadmapStage[]): Map<string, StageCompletionEntry> {
  const map = new Map<string, StageCompletionEntry>();
  for (const stage of stages) {
    map.set(stage.id, {
      completed: 0,
      total: groupRoadmapPartsForDisplay(stage.parts).length,
      parts: new Map<string, boolean>(),
    });
  }
  return map;
}

const INITIAL_STAGES = getRoadmapStagesShell();
const INITIAL_COMPLETION = buildDefaultCompletion(INITIAL_STAGES);

export default function PastPapersHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceSurvey = searchParams.get("choose") === "1";
  const [forceSurveyOpen, setForceSurveyOpen] = useState(forceSurvey);
  const session = useSupabaseSession();
  const { hasFullAccess, isLoading: subscriptionLoading } = useSubscription();
  const showMarkingUpgrade = !subscriptionLoading && !hasFullAccess;
  const { startSession, setQuestions } = usePaperSessionStore();

  // Explicit /past-papers (and nav Home) always stays on Home.
  // Saved default only affects the Past Papers nav parent link + layout dropdown.
  const [stages, setStages] = useState<RoadmapStage[]>(INITIAL_STAGES);
  const [completionData, setCompletionData] = useState<
    Map<string, StageCompletionEntry>
  >(() => new Map(INITIAL_COMPLETION));
  const [, setCompletionLoading] = useState(true);
  const [stageScores, setStageScores] = useState<Map<string, RoadmapStageScore>>(
    () => new Map(),
  );
  const [scoresLoading, setScoresLoading] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [pendingGuestStart, setPendingGuestStart] = useState<{
    stage: RoadmapStage;
    selectedParts: RoadmapPart[];
    options: RoadmapStartOptions;
  } | null>(null);
  const [newQuestionsOnly, setNewQuestionsOnly] = useState(
    readNewQuestionsOnlyPreference,
  );
  const attemptedQuestionsRef = useRef<AttemptedQuestionsContext>({
    attemptedKeys: new Set(),
    attemptedDuplicateGroups: new Set(),
  });
  const [examPreference, setExamPreference] = useState<'ESAT' | 'TMUA' | null>(
    null,
  );
  const [userEsatSubjects, setUserEsatSubjects] = useState<string[] | null>(
    null,
  );
  const [showAllPapers, setShowAllPapers] = useState(false);

  const effectiveExamPreference = useMemo((): "ESAT" | "TMUA" | null => {
    if (examPreference) return examPreference;
    if (userEsatSubjects?.length) return "ESAT";
    return null;
  }, [examPreference, userEsatSubjects]);

  const effectiveEsatSubjects = userEsatSubjects;

  const subjectFilteredStages = useMemo(
    () =>
      applyEsatSubjectsToRoadmapStages(
        stages,
        effectiveEsatSubjects,
        effectiveExamPreference,
      ),
    [stages, effectiveEsatSubjects, effectiveExamPreference],
  );

  const subjectFilterRelevant = useMemo(() => {
    if (effectiveExamPreference === "TMUA") return true;
    return (
      effectiveExamPreference === "ESAT" &&
      (effectiveEsatSubjects?.length ?? 0) > 0
    );
  }, [effectiveExamPreference, effectiveEsatSubjects]);

  const displayedStages = useMemo(() => {
    if (!subjectFilterRelevant || showAllPapers) return stages;
    return subjectFilteredStages;
  }, [
    subjectFilterRelevant,
    showAllPapers,
    stages,
    subjectFilteredStages,
  ]);

  const subjectSuggestion = useMemo(() => {
    if (!subjectFilterRelevant) return null;
    return {
      subjects:
        effectiveExamPreference === "ESAT" ? (effectiveEsatSubjects ?? []) : [],
      showingAll: showAllPapers,
      onToggleShowAll: () => setShowAllPapers((v) => !v),
    };
  }, [
    subjectFilterRelevant,
    effectiveExamPreference,
    effectiveEsatSubjects,
    showAllPapers,
  ]);

  // Load user exam preference + ESAT subjects
  useEffect(() => {
    async function loadExamPreference() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/profile/preferences');
        if (response.ok) {
          const data = await response.json();
          setExamPreference(data.exam_preference || null);
          if (
            data.exam_preference === 'ESAT' &&
            Array.isArray(data.esat_subjects) &&
            data.esat_subjects.length > 0
          ) {
            setUserEsatSubjects(data.esat_subjects);
          }
        }
      } catch (error) {
      }
    }
    loadExamPreference();
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttempted() {
      if (!session?.user?.id) {
        attemptedQuestionsRef.current = {
          attemptedKeys: new Set(),
          attemptedDuplicateGroups: new Set(),
        };
        return;
      }

      const ctx = await loadAttemptedQuestionsContext(session.user.id);
      if (!cancelled) {
        attemptedQuestionsRef.current = ctx;
      }
    }

    void loadAttempted();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const handleNewQuestionsOnlyChange = useCallback((enabled: boolean) => {
    setNewQuestionsOnly(enabled);
    writeNewQuestionsOnlyPreference(enabled);
  }, []);

  // Hydrate full stage list
  useEffect(() => {
    let cancelled = false;

    async function loadStages() {
      try {
        const loadedStages = await getRoadmapStages();
        if (cancelled) return;

        setStages(loadedStages);
        setCompletionData((prev) => {
          const next = new Map(prev);
          for (const stage of loadedStages) {
            if (!next.has(stage.id)) {
              next.set(stage.id, {
                completed: 0,
                total: groupRoadmapPartsForDisplay(stage.parts).length,
                parts: new Map<string, boolean>(),
              });
            }
          }
          return next;
        });
      } catch (error) {
      }
    }

    void loadStages();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load completion in background (progress rings, unlock state)
  useEffect(() => {
    if (displayedStages.length === 0) return;

    let cancelled = false;

    async function loadCompletionData() {
      setCompletionLoading(true);
      try {
        const completionMap = new Map<string, StageCompletionEntry>();

        if (session?.user?.id) {
          const { getCompletedPartIds, getStageCompletionFromSessions } =
            await import('@/lib/papers/roadmapCompletion');
          const completedPartIds = await getCompletedPartIds(session.user.id);

          for (const stage of displayedStages) {
            const parts = await getStageCompletionFromSessions(
              session.user.id,
              stage,
              completedPartIds,
            );

            let completed = 0;
            for (const [, isCompleted] of parts) {
              if (isCompleted) completed++;
            }

            const groupCounts = countDisplayGroupCompletion(stage.parts, parts);

            completionMap.set(stage.id, {
              completed: groupCounts.completed,
              total: groupCounts.total,
              parts,
            });
          }
        } else {
          for (const stage of displayedStages) {
            completionMap.set(stage.id, {
              completed: 0,
              total: groupRoadmapPartsForDisplay(stage.parts).length,
              parts: new Map<string, boolean>(),
            });
          }
        }

        if (cancelled) return;

        setCompletionData(completionMap);
      } catch (error) {
        if (cancelled) return;

        const fallback = buildDefaultCompletion(displayedStages);
        setCompletionData(fallback);
      } finally {
        if (!cancelled) setCompletionLoading(false);
      }
    }

    void loadCompletionData();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, displayedStages]);

  // Load predicted / accuracy scores for completed sessions
  useEffect(() => {
    let cancelled = false;

    async function loadScores() {
      if (!session?.user?.id || displayedStages.length === 0) {
        setStageScores(new Map());
        setScoresLoading(false);
        return;
      }

      setScoresLoading(true);
      try {
        const sessions = await fetchUserSessions();
        if (cancelled) return;
        setStageScores(
          buildRoadmapStageScores(displayedStages, sessions),
        );
      } catch {
        if (!cancelled) setStageScores(new Map());
      } finally {
        if (!cancelled) setScoresLoading(false);
      }
    }

    void loadScores();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, displayedStages]);

  const executeStartStage = useCallback(
    async (
      stage: RoadmapStage,
      selectedParts: RoadmapPart[],
      options: RoadmapStartOptions,
    ) => {
      if (selectedParts.length === 0) {
        return;
      }

      setIsStartingSession(true);
      let navigated = false;
      try {
        await allowLoadingPaint();

        // Group selected parts by paper (paperName + examType combination)
        const partsByPaper = new Map<string, typeof selectedParts>();
        selectedParts.forEach((part) => {
          const paperKey = `${part.paperName}-${part.examType}`;
          if (!partsByPaper.has(paperKey)) {
            partsByPaper.set(paperKey, []);
          }
          partsByPaper.get(paperKey)!.push(part);
        });

        // Determine primary paper (for session metadata) - use the one with most parts
        let primaryPaperKey = '';
        let maxParts = 0;
        for (const [key, parts] of partsByPaper.entries()) {
          if (parts.length > maxParts) {
            maxParts = parts.length;
            primaryPaperKey = key;
          }
        }

        const primaryParts = partsByPaper.get(primaryPaperKey) || selectedParts;
        const firstPart = primaryParts[0];

        // Collect sections from ALL selected parts (not just primary)
        const allSections = new Set<PaperSection>();
        const paperType = examNameToPaperType(stage.examName) || 'NSAA';

        // Handle TMUA differently - use section mapping
        if (paperType === 'TMUA') {
          selectedParts.forEach((part) => {
            // TMUA uses Paper 1 / Paper 2 as sections
            if (part.paperName === 'Paper 1') {
              allSections.add('Paper 1');
            } else if (part.paperName === 'Paper 2') {
              allSections.add('Paper 2');
            }
          });
        } else {
          // Collect sections from ALL selected parts across all papers
          selectedParts.forEach((part) => {
            const section = getSectionForRoadmapPart(part, stage.examName);
            allSections.add(section);
          });
        }

        // Load questions from ALL papers that have selected parts
        const allPapers = new Map<string, Paper>();
        const allQuestionsByPaper = new Map<number, Question[]>();


        for (const [paperKey, parts] of partsByPaper.entries()) {
          const firstPartInPaper = parts[0];
          const paper = await getPaper(
            stage.examName,
            stage.year,
            firstPartInPaper.paperName,
            firstPartInPaper.examType,
          );

          if (!paper) {
            alert(
              `Paper not found: ${stage.examName} ${stage.year} ${firstPartInPaper.paperName} (${firstPartInPaper.examType}). Please check if this paper exists in the database.`,
            );
            return;
          }

          allPapers.set(paperKey, paper);

          // ESAT CAMP admin mocks: one Mock A–E label spans module paper IDs.
          // Load only the selected subjects so Math 1 / Math 2 do not cross-match.
          const modulePapers = isEsatCampMockExamType(firstPartInPaper.examType)
            ? getAdminEsatMockPapersForSelectedParts(
                firstPartInPaper.paperName,
                parts,
              )
            : [paper];

          if (
            isEsatCampMockExamType(firstPartInPaper.examType) &&
            modulePapers.length === 0
          ) {
            alert(
              `ESAT CAMP mock modules not found for ${firstPartInPaper.paperName}.`,
            );
            return;
          }

          let combined: Question[] = [];
          for (const modulePaper of modulePapers) {
            const qs = await getQuestions(modulePaper.id);
            combined = [...combined, ...qs];
          }
          allQuestionsByPaper.set(paper.id, combined);
        }

        // Get primary paper for session metadata
        const primaryPaper = allPapers.get(primaryPaperKey);
        if (!primaryPaper) {
          return;
        }

        // Combine questions from all papers and filter to match ALL selected parts
        let matchingQuestions: Question[] = [];


        if (paperType === 'TMUA') {
          // For TMUA, combine questions from all papers and filter by section
          for (const [paperId, questions] of allQuestionsByPaper.entries()) {
            const totalQuestions = questions.length;
            const filtered = questions.filter((q: Question, index: number) => {
              const section = deriveTmuaSectionFromQuestion(
                q,
                index,
                totalQuestions,
              );
              return Array.from(allSections).includes(section);
            });
            matchingQuestions = [...matchingQuestions, ...filtered];
          }
        } else if (
          selectedParts.every((part) => isEsatCampMockExamType(part.examType))
        ) {
          // Admin mocks are already loaded per selected subject paper ID.
          for (const questions of allQuestionsByPaper.values()) {
            matchingQuestions = [...matchingQuestions, ...questions];
          }
        } else {
          // For NSAA/ENGAA, filter questions from all papers to match ALL selected parts
          // Important: For NSAA, Section 1 and Section 2 might be in the same paper or different papers
          // We need to match parts correctly, considering that the same partLetter/partName
          // might exist in both sections, so we need to use the paperName from the roadmap config
          // to distinguish them. However, if they're in the same paper, we rely on the database
          // structure to have them properly distinguished (e.g., via examType or other fields).

          for (const [paperKey, parts] of partsByPaper.entries()) {
            const paper = allPapers.get(paperKey);
            if (!paper) continue;

            const questions = allQuestionsByPaper.get(paper.id) || [];

            // Log sample questions for debugging Section 2
            if (paper.paperName === 'Section 2' && questions.length > 0) {
            }

            const filtered = questions.filter((q: Question) => {
              return parts.some((part) => questionMatchesRoadmapPart(q, part));
            });


            matchingQuestions = [...matchingQuestions, ...filtered];
          }
        }


        const applyUniqueFilter =
          options.newQuestionsOnly && stage.examName === "ENGAA";

        if (applyUniqueFilter) {
          matchingQuestions = filterToUniqueQuestionsOnly(
            matchingQuestions,
            attemptedQuestionsRef.current,
          );
        }

        const seenQuestionIds = new Set<number>();
        matchingQuestions = matchingQuestions.filter((q) => {
          if (seenQuestionIds.has(q.id)) return false;
          seenQuestionIds.add(q.id);
          return true;
        });

        if (matchingQuestions.length === 0) {
          alert(
            applyUniqueFilter
              ? 'No unique questions left in the selected parts. Turn off "Unique questions only" to repeat questions you have already done.'
              : 'No questions matched the selected parts.',
          );
          return;
        }

        matchingQuestions.sort((a, b) => {
          if (a.paperName !== b.paperName) {
            return a.paperName.localeCompare(b.paperName);
          }
          return a.questionNumber - b.questionNumber;
        });

        const selectedPartIds = selectedParts.map((part) =>
          generatePartIdFromRoadmapPart(stage.examName, stage.year, part),
        );

        // Get question number range
        const totalQuestions = matchingQuestions.length;

        // Calculate time (1.48 min per question, or 75 min per section for TMUA).
        // ESAT CAMP modules are fixed 40 minutes each.
        let timeLimitMinutes: number;
        if (paperType === 'TMUA') {
          timeLimitMinutes = Array.from(allSections).length * 75;
        } else if (
          selectedParts.every((part) => part.examType === 'ESAT CAMP')
        ) {
          const moduleCount = new Set(
            matchingQuestions.map((q) => q.paperId),
          ).size;
          timeLimitMinutes = Math.max(1, moduleCount) * 40;
        } else {
          timeLimitMinutes = Math.ceil(totalQuestions * 1.48);
        }

        // Create variant string (use primary paper for metadata)
        const variantString = `${stage.year}-${firstPart.paperName}-${firstPart.examType}`;

        await startSession({
          paperId: primaryPaper.id,
          paperName: paperType,
          paperVariant: variantString,
          sessionName: `${stage.examName} ${stage.year} - ${new Date().toLocaleString()}`,
          timeLimitMinutes,
          questionRange: {
            start: 1,
            end: totalQuestions,
          },
          selectedSections: Array.from(allSections),
          selectedPartIds,
        });

        // Keep the already-filtered set. Reloading by paperId would drop
        // multi-paper ENGAA/NSAA sessions and question-number filters.
        setQuestions(matchingQuestions);

        // Stay on LoadingPage until every question diagram/image is decoded.
        await preloadQuestionsAssets(matchingQuestions);

        navigated = true;
        router.push('/past-papers/solve');
      } catch (error) {
      } finally {
        if (!navigated) setIsStartingSession(false);
      }
    },
    [router, startSession, setQuestions],
  );

  const handleStartStage = useCallback(
    async (
      stage: RoadmapStage,
      selectedParts: RoadmapPart[],
      options: RoadmapStartOptions,
    ) => {
      if (isStartingSession) return;
      if (!session?.user) {
        setPendingGuestStart({ stage, selectedParts, options });
        return;
      }
      await executeStartStage(stage, selectedParts, options);
    },
    [executeStartStage, isStartingSession, session?.user],
  );

  const handleContinueWithoutAccount = useCallback(async () => {
    if (!pendingGuestStart || isStartingSession) return;
    const { stage, selectedParts, options } = pendingGuestStart;
    setPendingGuestStart(null);
    await executeStartStage(stage, selectedParts, options);
  }, [pendingGuestStart, isStartingSession, executeStartStage]);

  const refreshCompletionData = useCallback(async () => {
    if (displayedStages.length === 0) return;

    try {
      const completionMap = new Map<string, StageCompletionEntry>();

      if (session?.user?.id) {
        const { syncWithDatabase } = await import('@/lib/papers/completionCache');
        const { getStageCompletionFromSessions } = await import(
          '@/lib/papers/roadmapCompletion'
        );
        const completedPartIds = await syncWithDatabase(session.user.id);

        for (const stage of displayedStages) {
          const parts = await getStageCompletionFromSessions(
            session.user.id,
            stage,
            completedPartIds,
          );
          const groupCounts = countDisplayGroupCompletion(stage.parts, parts);
          completionMap.set(stage.id, {
            completed: groupCounts.completed,
            total: groupCounts.total,
            parts,
          });
        }
      } else {
        for (const stage of displayedStages) {
          completionMap.set(stage.id, {
            completed: 0,
            total: groupRoadmapPartsForDisplay(stage.parts).length,
            parts: new Map(),
          });
        }
      }

      setCompletionData(completionMap);
    } catch {
      /* keep current completion if refresh fails */
    }
  }, [session?.user?.id, displayedStages]);

  return (
    <Container size="lg" className="overflow-x-clip bg-background pb-16 pt-6 font-sans sm:pb-20 sm:pt-8">
      <RoadmapTable
        stages={displayedStages}
        completionData={completionData}
        stageScores={stageScores}
        scoresLoading={scoresLoading}
        userId={session?.user?.id ?? null}
        newQuestionsOnly={newQuestionsOnly}
        onNewQuestionsOnlyChange={handleNewQuestionsOnlyChange}
        onStartSession={handleStartStage}
        onCompletionChange={refreshCompletionData}
        subjectSuggestion={subjectSuggestion}
        preferredEsatSubjects={effectiveEsatSubjects}
        showFreePill={showMarkingUpgrade}
        layoutControls={
          <PastPapersLegacyLinks
            current="home"
            onRequestSurvey={() => setForceSurveyOpen(true)}
          />
        }
      />

      {isStartingSession ? (
        <PearsonPleaseWaitScreen label="Loading, please wait..." />
      ) : null}

      <PastPaperGuestStartModal
        open={pendingGuestStart != null}
        onClose={() => setPendingGuestStart(null)}
        onContinueWithoutAccount={() => {
          void handleContinueWithoutAccount();
        }}
      />

      <PastPapersPreferenceSurvey
        forceOpen={forceSurveyOpen}
        onClose={() => {
          setForceSurveyOpen(false);
          if (forceSurvey) {
            router.replace(PAST_PAPERS_HOME_PATH);
          }
        }}
      />
    </Container>
  );
}

