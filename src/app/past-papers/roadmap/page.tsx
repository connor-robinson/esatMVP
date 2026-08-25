/**
 * Papers Roadmap page - Linear, unlock-based practice structure
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeCTA } from '@/components/subscription/UpgradeCTA';
import {
  getRoadmapStages,
  getRoadmapStagesShell,
  type RoadmapStage,
} from '@/lib/papers/roadmapConfig';
import {
  getStageCompletionCount,
  getStageCompletion,
} from '@/lib/papers/roadmapCompletion';
import { RoadmapList } from '@/components/papers/roadmap/RoadmapList';
import { RoadmapTimeline } from '@/components/papers/roadmap/RoadmapTimeline';
import { ROADMAP_TIMELINE_COLUMN_CLASS } from '@/components/papers/roadmap/roadmapTimelineLayout';
import { RoadmapAnalytics } from '@/components/papers/roadmap/RoadmapAnalytics';
import { getSectionForRoadmapPart } from '@/lib/papers/roadmapConfig';
import { deriveTmuaSectionFromQuestion } from '@/lib/papers/sectionMapping';
import { usePaperSessionStore } from '@/store/paperSessionStore';
import { getPaper, getQuestions } from '@/lib/supabase/questions';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import type { PaperSection, Question, Paper } from '@/types/papers';
import type { RoadmapPart } from '@/lib/papers/roadmapConfig';
import { ReplaceActivePaperModal } from '@/components/papers/ReplaceActivePaperModal';
import { LoadingPage } from '@/components/shared/LoadingPage';
import { allowLoadingPaint } from '@/lib/papers/allowLoadingPaint';
import { shouldConfirmReplacePaperSession, resumeInProgressPaperSession } from '@/lib/papers/activePaperSessionClient';
import { isFreePreviewRoadmapStage } from '@/lib/papers/freePreviewPapers';
import { applyEsatSubjectsToRoadmapStages } from '@/lib/papers/roadmapEsatFilter';
import {
  addManualRoadmapUnlock,
  readManualRoadmapUnlocks,
} from '@/lib/papers/roadmapManualUnlock';
import type { RoadmapLockReason, RoadmapStartOptions } from '@/components/papers/roadmap/StageListCard';
import { cn } from '@/lib/utils';
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
import { RoadmapInfoPopover } from '@/components/papers/roadmap/RoadmapInfoPopover';
import {
  countDisplayGroupCompletion,
  groupRoadmapPartsForDisplay,
} from '@/lib/papers/roadmapDisplayGroups';

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

function isStageFullyCompleted(
  stage: RoadmapStage,
  data: StageCompletionEntry | undefined,
): boolean {
  const total =
    data?.total ?? groupRoadmapPartsForDisplay(stage.parts).length;
  const completed = data?.completed ?? 0;
  return total > 0 && completed === total;
}

function computeUnlockState(
  stages: RoadmapStage[],
  completionMap: Map<string, StageCompletionEntry>,
): { unlocked: Set<string>; currentIndex: number | null } {
  const unlocked = new Set<string>();
  let currentIndex: number | null = null;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const data = completionMap.get(stage.id);
    const isCompleted = isStageFullyCompleted(stage, data);

    if (i > 0) {
      const prevStage = stages[i - 1];
      const prevData = completionMap.get(prevStage.id);
      if (!isStageFullyCompleted(prevStage, prevData)) {
        break;
      }
    }

    unlocked.add(stage.id);
    if (!isCompleted && currentIndex === null) {
      currentIndex = i;
    }
  }

  return { unlocked, currentIndex: currentIndex ?? 0 };
}

const INITIAL_STAGES = getRoadmapStagesShell();
const INITIAL_COMPLETION = buildDefaultCompletion(INITIAL_STAGES);
const INITIAL_UNLOCK = computeUnlockState(INITIAL_STAGES, INITIAL_COMPLETION);

export default function PapersRoadmapPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const { hasFullAccess } = useSubscription();
  const { startSession, setQuestions } = usePaperSessionStore();
  const [stages, setStages] = useState<RoadmapStage[]>(INITIAL_STAGES);
  const [unlockedStages, setUnlockedStages] = useState<Set<string>>(
    () => new Set(INITIAL_UNLOCK.unlocked),
  );
  const [completionData, setCompletionData] = useState<
    Map<string, StageCompletionEntry>
  >(() => new Map(INITIAL_COMPLETION));
  const [completionLoading, setCompletionLoading] = useState(true);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceConfirming, setReplaceConfirming] = useState(false);
  const [replaceResuming, setReplaceResuming] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const pendingRoadmapStartRef = useRef<{
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
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(
    INITIAL_UNLOCK.currentIndex,
  );
  const [examPreference, setExamPreference] = useState<'ESAT' | 'TMUA' | null>(
    null,
  );
  const [userEsatSubjects, setUserEsatSubjects] = useState<string[] | null>(
    null,
  );
  const [manualUnlocks, setManualUnlocks] = useState<Set<string>>(() =>
    readManualRoadmapUnlocks(),
  );

  const effectiveExamPreference = useMemo((): "ESAT" | "TMUA" | null => {
    if (examPreference) return examPreference;
    if (userEsatSubjects?.length) return "ESAT";
    return null;
  }, [examPreference, userEsatSubjects]);

  const subjectFilteredStages = useMemo(
    () =>
      applyEsatSubjectsToRoadmapStages(
        stages,
        userEsatSubjects,
        effectiveExamPreference,
      ),
    [stages, userEsatSubjects, effectiveExamPreference],
  );

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
    if (subjectFilteredStages.length === 0) return;

    let cancelled = false;

    async function loadCompletionData() {
      setCompletionLoading(true);
      try {
        const completionMap = new Map<string, StageCompletionEntry>();

        if (session?.user?.id) {
          const { getCompletedPartIds, getStageCompletionFromSessions } =
            await import('@/lib/papers/roadmapCompletion');
          const completedPartIds = await getCompletedPartIds(session.user.id);

          for (const stage of subjectFilteredStages) {
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
          for (const stage of subjectFilteredStages) {
            completionMap.set(stage.id, {
              completed: 0,
              total: groupRoadmapPartsForDisplay(stage.parts).length,
              parts: new Map<string, boolean>(),
            });
          }
        }

        if (cancelled) return;

        setCompletionData(completionMap);
        const { unlocked, currentIndex } = computeUnlockState(
          subjectFilteredStages,
          completionMap,
        );
        setUnlockedStages(unlocked);
        setCurrentStageIndex(currentIndex);
      } catch (error) {
        if (cancelled) return;

        const fallback = buildDefaultCompletion(subjectFilteredStages);
        setCompletionData(fallback);
        const { unlocked, currentIndex } = computeUnlockState(
          subjectFilteredStages,
          fallback,
        );
        setUnlockedStages(unlocked);
        setCurrentStageIndex(currentIndex);
      } finally {
        if (!cancelled) setCompletionLoading(false);
      }
    }

    void loadCompletionData();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, subjectFilteredStages]);

  const handleUnlockStage = useCallback((stageId: string) => {
    setManualUnlocks(addManualRoadmapUnlock(stageId));
  }, []);

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

            // Show user-friendly error message
            alert(
              `Paper not found: ${stage.examName} ${stage.year} ${firstPartInPaper.paperName} (${firstPartInPaper.examType}). Please check if this paper exists in the database.`,
            );
            return;
          }


          allPapers.set(paperKey, paper);
          const questions = await getQuestions(paper.id);
          allQuestionsByPaper.set(paper.id, questions);
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


        if (options.newQuestionsOnly) {
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
            options.newQuestionsOnly
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
        // ESAT CAMP Physics mocks are fixed 40-minute modules.
        let timeLimitMinutes: number;
        if (paperType === 'TMUA') {
          timeLimitMinutes = Array.from(allSections).length * 75;
        } else if (
          selectedParts.every((part) => part.examType === 'ESAT CAMP') &&
          totalQuestions === 27
        ) {
          timeLimitMinutes = 40;
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
      if (
        !hasFullAccess &&
        !isFreePreviewRoadmapStage({
          examName: stage.examName,
          year: stage.year,
        })
      ) {
        return;
      }
      if (await shouldConfirmReplacePaperSession()) {
        pendingRoadmapStartRef.current = { stage, selectedParts, options };
        setReplaceModalOpen(true);
        return;
      }
      await executeStartStage(stage, selectedParts, options);
    },
    [executeStartStage, hasFullAccess, isStartingSession],
  );

  const handleCancelReplaceSession = useCallback(() => {
    pendingRoadmapStartRef.current = null;
    setReplaceModalOpen(false);
    setReplaceConfirming(false);
  }, []);

  const handleConfirmReplaceSession = useCallback(async () => {
    const pending = pendingRoadmapStartRef.current;
    pendingRoadmapStartRef.current = null;
    if (!pending) {
      setReplaceModalOpen(false);
      return;
    }
    setReplaceConfirming(true);
    try {
      await executeStartStage(
        pending.stage,
        pending.selectedParts,
        pending.options,
      );
    } finally {
      setReplaceConfirming(false);
      setReplaceModalOpen(false);
    }
  }, [executeStartStage]);

  const handleResumeSession = useCallback(async () => {
    setReplaceResuming(true);
    try {
      pendingRoadmapStartRef.current = null;
      const resumed = await resumeInProgressPaperSession();
      if (resumed) {
        setReplaceModalOpen(false);
        router.push('/past-papers/solve/resume');
      }
    } finally {
      setReplaceResuming(false);
    }
  }, [router]);

  // Refresh completion data
  const refreshCompletionData = useCallback(async () => {
    try {
      const completionMap = new Map<
        string,
        { completed: number; total: number; parts: Map<string, boolean> }
      >();

      if (session?.user?.id) {
        // Sync cache with database on refresh (will use cache if valid)
        const { syncWithDatabase } =
          await import('@/lib/papers/completionCache');
        const completedIds = await syncWithDatabase(session.user.id);

        for (const stage of subjectFilteredStages) {
          const count = await getStageCompletionCount(session.user.id, stage);
          const parts = await getStageCompletion(session.user.id, stage);

          completionMap.set(stage.id, {
            completed: count.completed,
            total: count.total,
            parts,
          });
        }
      } else {
        // If no user, set all to 0 completion
        for (const stage of subjectFilteredStages) {
          completionMap.set(stage.id, {
            completed: 0,
            total: groupRoadmapPartsForDisplay(stage.parts).length,
            parts: new Map(),
          });
        }
      }

      setCompletionData(completionMap);
    } catch (error) {
    }

    setCompletionLoading(false);
  }, [session?.user?.id, subjectFilteredStages]);

  // Track actual node positions for timeline alignment - MUST be before conditional return
  const [nodePositions, setNodePositions] = useState<number[]>([]);

  const handleNodePositionsUpdate = useCallback((positions: number[]) => {
    setNodePositions(positions);
  }, []);

  const timelineAnchorRef = useRef<HTMLDivElement>(null);

  // Everyone sees the full track. Free users can start free-preview papers;
  // everything else stays greyed/locked (paywall still below).
  const visibleStages = subjectFilteredStages;

  const progressionUnlocked = unlockedStages;
  const visibleUnlocked = new Set<string>();

  for (const stage of visibleStages) {
    const isPreview = isFreePreviewRoadmapStage({
      examName: stage.examName,
      year: stage.year,
    });

    if (hasFullAccess) {
      if (progressionUnlocked.has(stage.id) || manualUnlocks.has(stage.id)) {
        visibleUnlocked.add(stage.id);
      }
    } else if (isPreview) {
      visibleUnlocked.add(stage.id);
    }
  }

  const resolveLockReason = (
    stage: RoadmapStage,
    isUnlocked: boolean,
  ): RoadmapLockReason | null => {
    if (isUnlocked) return null;
    if (
      !hasFullAccess &&
      !isFreePreviewRoadmapStage({
        examName: stage.examName,
        year: stage.year,
      })
    ) {
      return "paywall";
    }
    return "progression";
  };

  const firstIncompleteVisibleIndex = visibleStages.findIndex((stage) => {
    if (!visibleUnlocked.has(stage.id)) return false;
    const data = completionData.get(stage.id);
    const total =
      data?.total ?? groupRoadmapPartsForDisplay(stage.parts).length;
    const completed = data?.completed ?? 0;
    return !(total > 0 && completed === total);
  });

  const visibleCurrentIndex =
    firstIncompleteVisibleIndex >= 0
      ? firstIncompleteVisibleIndex
      : currentStageIndex !== null && currentStageIndex < visibleStages.length
        ? currentStageIndex
        : 0;

  const timelineNodes = visibleStages.map((stage, index) => {
    const data = completionData.get(stage.id);
    const completedCount = data?.completed || 0;
    const totalCount =
      data?.total ?? groupRoadmapPartsForDisplay(stage.parts).length;
    const isUnlocked = visibleUnlocked.has(stage.id);
    const isCompleted = completedCount === totalCount && totalCount > 0;
    const isCurrent = isUnlocked && !isCompleted && visibleCurrentIndex === index;
    const lockReason = resolveLockReason(stage, isUnlocked);

    return {
      stage,
      isCompleted,
      isUnlocked,
      isCurrent,
      completedCount,
      totalCount,
      lockReason,
    };
  });

  const completedStageIndices = new Set(
    timelineNodes
      .map((node, index) => (node.isCompleted ? index : -1))
      .filter((index) => index >= 0),
  );

  return (
    <Container size="lg" className="overflow-x-clip bg-background pb-16 pt-6 font-sans sm:pb-20 sm:pt-8">
      <RoadmapAnalytics
        stages={visibleStages}
        completionData={completionData}
        currentStageIndex={visibleCurrentIndex}
        completionLoading={completionLoading}
      />

      {/* Two-column layout: Timeline (left) and Roadmap (right) */}
      <div className="pb-10 pt-2">
        <div className="flex w-full min-w-0 gap-6 overflow-x-clip lg:gap-8">
          <div className={cn("relative z-10 hidden shrink-0 lg:block", ROADMAP_TIMELINE_COLUMN_CLASS)}>
            <div ref={timelineAnchorRef} className="sticky top-8 overflow-visible">
              <RoadmapTimeline
                stages={visibleStages}
                nodePositions={nodePositions}
                currentStageIndex={visibleCurrentIndex ?? undefined}
                completedStageIndices={completedStageIndices}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-end gap-2 px-1">
              <span className="text-xs font-medium text-text-subtle">
                Unique questions only
              </span>
              <RoadmapInfoPopover title="Unique questions only">
                <p>
                  When on, sessions only include questions you have not tried
                  before.
                </p>
                <p>
                  Some ENGAA papers overlap with NSAA because certain years
                  used the same question banks. If you have already done the
                  matching NSAA question, we skip it here too.
                </p>
              </RoadmapInfoPopover>
              <button
                type="button"
                role="switch"
                aria-checked={newQuestionsOnly}
                aria-label="Unique questions only"
                onClick={() => handleNewQuestionsOnlyChange(!newQuestionsOnly)}
                className={cn(
                  'relative h-6 w-10 shrink-0 rounded-full transition-colors duration-fast ease-signature',
                  newQuestionsOnly ? 'bg-accent' : 'bg-surface-neutral',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-fast ease-signature',
                    newQuestionsOnly ? 'left-[18px]' : 'left-0.5',
                  )}
                />
              </button>
            </div>
            <RoadmapList
              nodes={timelineNodes}
              completionData={completionData}
              completionLoading={completionLoading}
              onStartSession={handleStartStage}
              newQuestionsOnly={newQuestionsOnly}
              onNewQuestionsOnlyChange={handleNewQuestionsOnlyChange}
              onUnlockStage={hasFullAccess ? handleUnlockStage : undefined}
              onNodePositionsUpdate={handleNodePositionsUpdate}
              timelineNodePositions={nodePositions}
              timelineAnchorRef={timelineAnchorRef}
            />
            {!hasFullAccess && (
              <div className="mt-4 -translate-y-2 sm:mt-5 sm:-translate-y-3">
                <UpgradeCTA feature="the full roadmap" />
              </div>
            )}
          </div>
        </div>
      </div>

      <ReplaceActivePaperModal
        open={replaceModalOpen}
        onCancel={handleCancelReplaceSession}
        onConfirm={handleConfirmReplaceSession}
        onResume={handleResumeSession}
        isConfirming={replaceConfirming}
        isResuming={replaceResuming}
      />

      {isStartingSession ? (
        <LoadingPage variant="session" message="Loading your paper" />
      ) : null}
    </Container>
  );
}

