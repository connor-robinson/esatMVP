/**
 * Papers Roadmap page - Linear, unlock-based practice structure
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import { shouldConfirmReplacePaperSession } from '@/lib/papers/activePaperSessionClient';
import { cn } from '@/lib/utils';

const FREE_ROADMAP_ITEMS = 3;

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
      total: stage.parts.length,
      parts: new Map<string, boolean>(),
    });
  }
  return map;
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
    const isCompleted =
      (data?.completed || 0) === (data?.total || stage.parts.length) &&
      (data?.total || 0) > 0;

    let isUnlocked = false;
    if (i === 0) {
      isUnlocked = true;
    } else {
      const prevStage = stages[i - 1];
      const prevData = completionMap.get(prevStage.id);
      const isPrevCompleted =
        (prevData?.completed || 0) ===
          (prevData?.total || prevStage.parts.length) &&
        (prevData?.total || 0) > 0;
      isUnlocked = isPrevCompleted || isCompleted;
    }

    if (isUnlocked) {
      unlocked.add(stage.id);
      if (!isCompleted && currentIndex === null) {
        currentIndex = i;
      }
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
  const { startSession, loadQuestions, setQuestions } = usePaperSessionStore();
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
  const pendingRoadmapStartRef = useRef<{
    stage: RoadmapStage;
    selectedParts: RoadmapPart[];
  } | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(
    INITIAL_UNLOCK.currentIndex,
  );
  const [examPreference, setExamPreference] = useState<'ESAT' | 'TMUA' | null>(
    null,
  );

  // Load user exam preference
  useEffect(() => {
    async function loadExamPreference() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/profile/preferences');
        if (response.ok) {
          const data = await response.json();
          setExamPreference(data.exam_preference || null);
        }
      } catch (error) {
        console.error('[roadmap] Error loading exam preference:', error);
      }
    }
    loadExamPreference();
  }, [session]);

  // Hydrate full stage list (includes TMUA from DB) without blocking first paint
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
                total: stage.parts.length,
                parts: new Map<string, boolean>(),
              });
            }
          }
          return next;
        });
      } catch (error) {
        console.error('[roadmap] Error loading stages:', error);
      }
    }

    void loadStages();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load completion in background (progress rings, unlock state)
  useEffect(() => {
    if (stages.length === 0) return;

    let cancelled = false;

    async function loadCompletionData() {
      setCompletionLoading(true);
      try {
        const completionMap = new Map<string, StageCompletionEntry>();

        if (session?.user?.id) {
          const { getCompletedPartIds, getStageCompletionFromSessions } =
            await import('@/lib/papers/roadmapCompletion');
          const completedPartIds = await getCompletedPartIds(session.user.id);

          for (const stage of stages) {
            const parts = await getStageCompletionFromSessions(
              session.user.id,
              stage,
              completedPartIds,
            );

            let completed = 0;
            for (const [, isCompleted] of parts) {
              if (isCompleted) completed++;
            }

            completionMap.set(stage.id, {
              completed,
              total: parts.size,
              parts,
            });
          }
        } else {
          for (const stage of stages) {
            completionMap.set(stage.id, {
              completed: 0,
              total: stage.parts.length,
              parts: new Map<string, boolean>(),
            });
          }
        }

        if (cancelled) return;

        setCompletionData(completionMap);
        const { unlocked, currentIndex } = computeUnlockState(
          stages,
          completionMap,
        );
        setUnlockedStages(unlocked);
        setCurrentStageIndex(currentIndex);
      } catch (error) {
        console.error('[roadmap] Error loading completion data:', error);
        if (cancelled) return;

        const fallback = buildDefaultCompletion(stages);
        setCompletionData(fallback);
        const { unlocked, currentIndex } = computeUnlockState(stages, fallback);
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
  }, [session?.user?.id, stages]);

  const executeStartStage = useCallback(
    async (stage: RoadmapStage, selectedParts: RoadmapPart[]) => {
      try {
        if (selectedParts.length === 0) {
          console.error('[roadmap] No parts selected');
          return;
        }

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

        console.log('[roadmap] Loading papers for selected parts:', {
          selectedPartsCount: selectedParts.length,
          papersCount: partsByPaper.size,
          paperKeys: Array.from(partsByPaper.keys()),
        });

        for (const [paperKey, parts] of partsByPaper.entries()) {
          const firstPartInPaper = parts[0];
          const paper = await getPaper(
            stage.examName,
            stage.year,
            firstPartInPaper.paperName,
            firstPartInPaper.examType,
          );

          if (!paper) {
            console.error('[roadmap] Paper not found for stage', {
              examName: stage.examName,
              year: stage.year,
              paperName: firstPartInPaper.paperName,
              examType: firstPartInPaper.examType,
              stageId: stage.id,
            });

            // Show user-friendly error message
            alert(
              `Paper not found: ${stage.examName} ${stage.year} ${firstPartInPaper.paperName} (${firstPartInPaper.examType}). Please check if this paper exists in the database.`,
            );
            return;
          }

          console.log('[roadmap] Loaded paper:', {
            paperKey,
            paperId: paper.id,
            paperName: paper.paperName,
            partsCount: parts.length,
            parts: parts.map((p) => `${p.partLetter}: ${p.partName}`),
          });

          allPapers.set(paperKey, paper);
          const questions = await getQuestions(paper.id);
          console.log('[roadmap] Loaded questions from paper:', {
            paperId: paper.id,
            questionsCount: questions.length,
          });
          allQuestionsByPaper.set(paper.id, questions);
        }

        // Get primary paper for session metadata
        const primaryPaper = allPapers.get(primaryPaperKey);
        if (!primaryPaper) {
          console.error('[roadmap] Primary paper not found');
          return;
        }

        // Combine questions from all papers and filter to match ALL selected parts
        let matchingQuestions: Question[] = [];

        console.log('[roadmap] Filtering questions:', {
          allSections: Array.from(allSections),
          paperType,
          totalPapers: allQuestionsByPaper.size,
        });

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
            console.log('[roadmap] Filtering questions for paper:', {
              paperKey,
              paperId: paper.id,
              paperName: paper.paperName,
              questionsCount: questions.length,
              partsToMatch: parts.map(
                (p) => `${p.partLetter}: ${p.partName} (${p.paperName})`,
              ),
            });

            // Log sample questions for debugging Section 2
            if (paper.paperName === 'Section 2' && questions.length > 0) {
              console.log(
                '[roadmap] Sample Section 2 questions:',
                questions.slice(0, 3).map((q) => ({
                  questionNumber: q.questionNumber,
                  partLetter: q.partLetter,
                  partName: q.partName,
                })),
              );
            }

            const filtered = questions.filter((q: Question) => {
              return parts.some((part) => {
                // Normalize strings for comparison (case-insensitive, trimmed)
                const qPartLetter = (q.partLetter || '')
                  .toString()
                  .trim()
                  .toLowerCase();
                const qPartName = (q.partName || '')
                  .toString()
                  .trim()
                  .toLowerCase();
                const partLetter = part.partLetter.trim().toLowerCase();
                const partName = part.partName.trim().toLowerCase();

                // Check if question matches this part (case-insensitive)
                // Since Section 1 and Section 2 are separate papers, all questions in a paper
                // belong to that section, so we just need to match partLetter/partName
                const partLetterMatches =
                  qPartLetter === partLetter ||
                  qPartLetter.includes(partLetter) ||
                  partLetter.includes(qPartLetter);

                const partNameMatches =
                  qPartName === partName ||
                  qPartName.includes(partName) ||
                  partName.includes(qPartName);

                const partMatches = partLetterMatches && partNameMatches;

                if (!partMatches) {
                  // Debug logging for first few non-matching questions
                  if (
                    paper.paperName === 'Section 2' &&
                    questions.indexOf(q) < 3
                  ) {
                    console.log('[roadmap] Section 2 question not matching:', {
                      questionNumber: q.questionNumber,
                      qPartLetter: q.partLetter,
                      qPartName: q.partName,
                      partToMatch: {
                        partLetter: part.partLetter,
                        partName: part.partName,
                      },
                      partLetterMatches,
                      partNameMatches,
                    });
                  }
                  return false;
                }

                // Apply question range filter if specified (for ENGAA Section 1 Part A split)
                if (part.questionRange) {
                  const inRange =
                    q.questionNumber >= part.questionRange.start &&
                    q.questionNumber <= part.questionRange.end;
                  if (!inRange) return false;
                }

                // Apply question filter if specified (for ENGAA Section 1 Part B)
                if (part.questionFilter && part.questionFilter.length > 0) {
                  return part.questionFilter.includes(q.questionNumber);
                }

                return true;
              });
            });

            console.log('[roadmap] Filtered questions for paper:', {
              paperKey,
              beforeCount: questions.length,
              afterCount: filtered.length,
            });

            matchingQuestions = [...matchingQuestions, ...filtered];
          }
        }

        console.log(
          '[roadmap] Total matching questions:',
          matchingQuestions.length,
        );

        if (matchingQuestions.length === 0) {
          console.error('[roadmap] No matching questions found for stage');
          return;
        }

        // Get question number range
        const questionNumbers = matchingQuestions
          .map((q: Question) => q.questionNumber)
          .sort((a: number, b: number) => a - b);
        const questionStart = questionNumbers[0];
        const questionEnd = questionNumbers[questionNumbers.length - 1];
        const totalQuestions = questionNumbers.length;

        // Calculate time (1.48 min per question, or 75 min per section for TMUA)
        let timeLimitMinutes: number;
        if (paperType === 'TMUA') {
          timeLimitMinutes = Array.from(allSections).length * 75;
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
            start: questionStart,
            end: questionEnd,
          },
          selectedSections: Array.from(allSections),
        });

        // If we have questions from multiple papers, set them directly
        // Otherwise, use the standard loadQuestions
        if (allPapers.size > 1) {
          console.log(
            '[roadmap] Multiple papers detected, setting questions directly:',
            {
              papersCount: allPapers.size,
              totalQuestions: matchingQuestions.length,
              sections: Array.from(allSections),
            },
          );
          // Set questions directly since we've already loaded and filtered from all papers
          setQuestions(matchingQuestions);
        } else {
          // Single paper - use standard loading
          console.log('[roadmap] Single paper, using standard loadQuestions');
          await loadQuestions(primaryPaper.id);
        }

        router.push('/past-papers/solve');
      } catch (error) {
        console.error('[roadmap] Error starting stage:', error);
      }
    },
    [router, startSession, loadQuestions, setQuestions],
  );

  const handleStartStage = useCallback(
    async (stage: RoadmapStage, selectedParts: RoadmapPart[]) => {
      if (await shouldConfirmReplacePaperSession()) {
        pendingRoadmapStartRef.current = { stage, selectedParts };
        setReplaceModalOpen(true);
        return;
      }
      await executeStartStage(stage, selectedParts);
    },
    [executeStartStage],
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
      await executeStartStage(pending.stage, pending.selectedParts);
    } finally {
      setReplaceConfirming(false);
      setReplaceModalOpen(false);
    }
  }, [executeStartStage]);

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

        for (const stage of stages) {
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
        for (const stage of stages) {
          completionMap.set(stage.id, {
            completed: 0,
            total: stage.parts.length,
            parts: new Map(),
          });
        }
      }

      setCompletionData(completionMap);
    } catch (error) {
      console.error('[roadmap] Error refreshing completion data:', error);
    }

    setCompletionLoading(false);
  }, [session?.user?.id, stages]);

  // Track actual node positions for timeline alignment - MUST be before conditional return
  const [nodePositions, setNodePositions] = useState<number[]>([]);

  const handleNodePositionsUpdate = useCallback((positions: number[]) => {
    setNodePositions(positions);
  }, []);

  const visibleStages = hasFullAccess
    ? stages
    : stages.slice(0, FREE_ROADMAP_ITEMS);
  const visibleUnlocked = new Set(
    visibleStages.map((s) => s.id).filter((id) => unlockedStages.has(id)),
  );
  const visibleCurrentIndex =
    currentStageIndex !== null && currentStageIndex < visibleStages.length
      ? currentStageIndex
      : 0;

  const timelineNodes = visibleStages.map((stage, index) => {
    const data = completionData.get(stage.id);
    const completedCount = data?.completed || 0;
    const totalCount = data?.total || stage.parts.length;
    const isUnlocked = visibleUnlocked.has(stage.id);
    const isCompleted = completedCount === totalCount && totalCount > 0;
    const isCurrent = visibleCurrentIndex === index;

    return {
      stage,
      isCompleted,
      isUnlocked,
      isCurrent,
      completedCount,
      totalCount,
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
            <div className="sticky top-8 overflow-visible">
              <RoadmapTimeline
                stages={visibleStages}
                nodePositions={nodePositions}
                currentStageIndex={visibleCurrentIndex ?? undefined}
                completedStageIndices={completedStageIndices}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <RoadmapList
              nodes={timelineNodes}
              completionData={completionData}
              completionLoading={completionLoading}
              onStartSession={handleStartStage}
              onNodePositionsUpdate={handleNodePositionsUpdate}
              timelineNodePositions={nodePositions}
            />
            {!hasFullAccess && (
              <div className="mt-10">
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
        isConfirming={replaceConfirming}
      />
    </Container>
  );
}

