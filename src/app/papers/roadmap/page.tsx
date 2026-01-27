/**
 * Papers Roadmap page - Linear, unlock-based practice structure
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/shared/PageHeader";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  getRoadmapStages,
  getRoadmapStagesSync,
  type RoadmapStage,
} from "@/lib/papers/roadmapConfig";
import {
  getStageCompletionCount,
  getStageCompletion,
} from "@/lib/papers/roadmapCompletion";
import { RoadmapList } from "@/components/papers/roadmap/RoadmapList";
import { RoadmapTimeline } from "@/components/papers/roadmap/RoadmapTimeline";
import { RoadmapAnalytics } from "@/components/papers/roadmap/RoadmapAnalytics";
import { getSectionForRoadmapPart } from "@/lib/papers/roadmapConfig";
import { deriveTmuaSectionFromQuestion } from "@/lib/papers/sectionMapping";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { getPaper, getQuestions } from "@/lib/supabase/questions";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { PaperSection } from "@/types/papers";
import type { RoadmapPart } from "@/lib/papers/roadmapConfig";

export default function PapersRoadmapPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const { startSession, loadQuestions } = usePaperSessionStore();
  const [stages, setStages] = useState<RoadmapStage[]>([]);
  const [unlockedStages, setUnlockedStages] = useState<Set<string>>(new Set());
  const [completionData, setCompletionData] = useState<
    Map<string, { completed: number; total: number; parts: Map<string, boolean> }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(null);
  const [examPreference, setExamPreference] = useState<'ESAT' | 'TMUA' | null>(null);

  // Load user exam preference
  useEffect(() => {
    async function loadExamPreference() {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch("/api/profile/preferences");
        if (response.ok) {
          const data = await response.json();
          setExamPreference(data.exam_preference || null);
        }
      } catch (error) {
        console.error("[roadmap] Error loading exam preference:", error);
      }
    }
    loadExamPreference();
  }, [session]);

  // Load stages (including dynamic TMUA stages)
  useEffect(() => {
    async function loadStages() {
      try {
        const loadedStages = await getRoadmapStages();
        // Debug: Check for duplicates
        const stageIds = loadedStages.map(s => s.id);
        const duplicates = stageIds.filter((id, index) => stageIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
          console.warn("[roadmap] Duplicate stage IDs found:", duplicates);
        }
        // Debug: Log stages at positions 8 and 26 (0-indexed: 7 and 25)
        if (loadedStages.length > 7) {
          console.log("[roadmap] Stage at position 8 (index 7):", loadedStages[7]?.id, loadedStages[7]?.examName, loadedStages[7]?.year);
        }
        if (loadedStages.length > 25) {
          console.log("[roadmap] Stage at position 26 (index 25):", loadedStages[25]?.id, loadedStages[25]?.examName, loadedStages[25]?.year);
        }
        
        // Filter stages by exam preference if set
        let filteredStages = loadedStages;
        if (examPreference) {
          filteredStages = loadedStages.filter(stage => stage.examName === examPreference);
        }
        
        setStages(filteredStages);
      } catch (error) {
        console.error("[roadmap] Error loading stages:", error);
        // Fallback to sync version if async fails
        const syncStages = getRoadmapStagesSync();
        if (examPreference) {
          const filtered = syncStages.filter(stage => stage.examName === examPreference);
          setStages(filtered);
        } else {
          setStages(syncStages);
        }
      }
    }
    loadStages();
  }, [examPreference]);

  // Load completion data
  useEffect(() => {
    if (stages.length === 0) return; // Wait for stages to load

    async function loadCompletionData() {
      try {
        // 1. Get completion data for each stage
        const completionMap = new Map<
          string,
          { completed: number; total: number; parts: Map<string, boolean> }
        >();

        if (session?.user?.id) {
          // OPTIMIZATION: Load all completed sessions once, then process in memory
          // This avoids hundreds of sequential database queries
          const { loadAllCompletedSessions, getStageCompletionFromSessions } = await import('@/lib/papers/roadmapCompletion');
          const sessionsByPaperName = await loadAllCompletedSessions(session.user.id);

          // Process all stages (now async due to part-level checking)
          for (const stage of stages) {
            const parts = await getStageCompletionFromSessions(session.user.id, sessionsByPaperName, stage);
            
            let completed = 0;
            for (const [_, isCompleted] of parts) {
              if (isCompleted) {
                completed++;
              }
            }

            completionMap.set(stage.id, {
              completed,
              total: parts.size,
              parts,
            });
          }
        } else {
          // No user session - set all stages to 0 completion
          for (const stage of stages) {
            completionMap.set(stage.id, {
              completed: 0,
              total: stage.parts.length,
              parts: new Map<string, boolean>(),
            });
          }
        }

        setCompletionData(completionMap);

        // 2. Determine Unlocked Status and Current Stage
        // Smart unlocking logic:
        // - First stage is always unlocked
        // - Stage N is unlocked if stage N-1 is completed OR if stage N itself is already completed
        // This handles cases where users complete stages out of order (e.g., complete 2019, then 2018, unlocks 2020)
        const unlocked = new Set<string>();
        let currentIndex: number | null = null;

        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const data = completionMap.get(stage.id);
          const isCompleted = (data?.completed || 0) === (data?.total || stage.parts.length) && (data?.total || 0) > 0;

          let isUnlocked = false;
          if (i === 0) {
            // First stage is always unlocked
            isUnlocked = true;
          } else {
            // Stage is unlocked if:
            // 1. Previous stage is completed (normal progression), OR
            // 2. This stage is already completed (handles backward completion)
            const prevStage = stages[i - 1];
            const prevData = completionMap.get(prevStage.id);
            const isPrevCompleted = (prevData?.completed || 0) === (prevData?.total || prevStage.parts.length) && (prevData?.total || 0) > 0;
            
            isUnlocked = isPrevCompleted || isCompleted;
          }

          if (isUnlocked) {
            unlocked.add(stage.id);
            // First incomplete unlocked stage is current
            if (!isCompleted && currentIndex === null) {
              currentIndex = i;
            }
          }
        }

        setUnlockedStages(unlocked);
        setCurrentStageIndex(currentIndex ?? 0);
      } catch (error) {
        console.error("[roadmap] Error loading completion data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCompletionData();
  }, [session?.user?.id, stages]);


  // Handle stage start with selected parts
  const handleStartStage = useCallback(
    async (stage: RoadmapStage, selectedParts: RoadmapPart[]) => {
      try {
        if (selectedParts.length === 0) {
          console.error("[roadmap] No parts selected");
          return;
        }

        // Group selected parts by paper (paperName + examType combination)
        const partsByPaper = new Map<string, typeof selectedParts>();
        selectedParts.forEach(part => {
          const paperKey = `${part.paperName}-${part.examType}`;
          if (!partsByPaper.has(paperKey)) {
            partsByPaper.set(paperKey, []);
          }
          partsByPaper.get(paperKey)!.push(part);
        });

        // For now, use the paper with the most parts (or first if equal)
        // TODO: In future, could support multi-paper sessions
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

        const paper = await getPaper(stage.examName, stage.year, firstPart.paperName, firstPart.examType);

        if (!paper) {
          console.error("[roadmap] Paper not found for stage");
          return;
        }

        // Collect sections from selected parts only
        const allSections = new Set<PaperSection>();
        const paperType = examNameToPaperType(stage.examName) || "NSAA";

        // Handle TMUA differently - use section mapping
        if (paperType === "TMUA") {
          primaryParts.forEach(part => {
            // TMUA uses Paper 1 / Paper 2 as sections
            if (part.paperName === "Paper 1") {
              allSections.add("Paper 1");
            } else if (part.paperName === "Paper 2") {
              allSections.add("Paper 2");
            }
          });
        } else {
          primaryParts.forEach(part => {
            const section = getSectionForRoadmapPart(part, stage.examName);
            allSections.add(section);
          });
        }

        // Get all questions for the primary paper
        const allQuestions = await getQuestions(paper.id);

        // Filter questions to match selected parts from the primary paper only
        let matchingQuestions: typeof allQuestions;

        if (paperType === "TMUA") {
          // For TMUA, filter by section derived from question position
          const totalQuestions = allQuestions.length;
          matchingQuestions = allQuestions.filter((q, index) => {
            const section = deriveTmuaSectionFromQuestion(q, index, totalQuestions);
            return Array.from(allSections).includes(section);
          });
        } else {
          matchingQuestions = allQuestions.filter(q => {
            return primaryParts.some(part => {
              // Check if question matches this part
              const partMatches =
                (q.partLetter === part.partLetter || q.partLetter?.includes(part.partLetter)) &&
                (q.partName === part.partName || q.partName?.includes(part.partName));

              if (!partMatches) return false;

              // Apply question filter if specified (for ENGAA Section 1 Part B)
              if (part.questionFilter && part.questionFilter.length > 0) {
                return part.questionFilter.includes(q.questionNumber);
              }

              return true;
            });
          });
        }

        if (matchingQuestions.length === 0) {
          console.error("[roadmap] No matching questions found for stage");
          return;
        }

        // Get question number range
        const questionNumbers = matchingQuestions.map(q => q.questionNumber).sort((a, b) => a - b);
        const questionStart = questionNumbers[0];
        const questionEnd = questionNumbers[questionNumbers.length - 1];
        const totalQuestions = questionNumbers.length;

        // Calculate time (1.5 min per question, or 75 min per section for TMUA)
        let timeLimitMinutes: number;
        if (paperType === "TMUA") {
          timeLimitMinutes = Array.from(allSections).length * 75;
        } else {
          timeLimitMinutes = Math.ceil(totalQuestions * 1.5);
        }

        // Create variant string
        const variantString = `${stage.year}-${firstPart.paperName}-${firstPart.examType}`;

        // Start session
        startSession({
          paperId: paper.id,
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

        // Load questions and navigate to solve
        await loadQuestions(paper.id);
        router.push("/papers/solve");
      } catch (error) {
        console.error("[roadmap] Error starting stage:", error);
      }
    },
    [router, startSession, loadQuestions]
  );

  // Refresh completion data
  const refreshCompletionData = useCallback(async () => {
    try {
      const completionMap = new Map<
        string,
        { completed: number; total: number; parts: Map<string, boolean> }
      >();

      if (session?.user?.id) {
        // Sync cache with database on refresh (will use cache if valid)
        const { syncWithDatabase } = await import('@/lib/papers/completionCache');
        console.log('[roadmap] Refreshing completion data for user:', session.user.id);
        const completedIds = await syncWithDatabase(session.user.id);
        console.log('[roadmap] Completed part IDs after sync:', completedIds.size, Array.from(completedIds));
        
        for (const stage of stages) {
          console.log('[roadmap] Processing stage:', stage.id, stage.examName, stage.year);
          const count = await getStageCompletionCount(session.user.id, stage);
          const parts = await getStageCompletion(session.user.id, stage);

          console.log('[roadmap] Stage completion:', {
            stageId: stage.id,
            completed: count.completed,
            total: count.total,
            parts: Object.fromEntries(parts)
          });

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
      console.error("[roadmap] Error refreshing completion data:", error);
    }

    setLoading(false);
  }, [session?.user?.id, stages]);

  // Track actual node positions for timeline alignment - MUST be before conditional return
  const [nodePositions, setNodePositions] = useState<number[]>([]);

  const handleNodePositionsUpdate = useCallback((positions: number[]) => {
    setNodePositions(positions);
  }, []);

  if (loading) {
    return (
      <Container>
        <PageHeader title="Practice Roadmap" />
        <div className="py-12 text-center text-white/50">Loading...</div>
      </Container>
    );
  }

  // Prepare timeline nodes data
  const timelineNodes = stages.map((stage, index) => {
    const data = completionData.get(stage.id);
    const completedCount = data?.completed || 0;
    const totalCount = data?.total || stage.parts.length;
    const isUnlocked = unlockedStages.has(stage.id);
    const isCompleted = completedCount === totalCount && totalCount > 0;
    const isCurrent = currentStageIndex === index;

    return {
      stage,
      isCompleted,
      isUnlocked,
      isCurrent,
      completedCount,
      totalCount,
    };
  });

  return (
    <Container>
      {/* Custom Title Section with proper padding */}
      <div className="pt-8 pb-6">
        <h1 className="text-2xl font-semibold uppercase tracking-wider text-white/90">
          Practice Roadmap
        </h1>
      </div>

      {/* Analytics Section - At the top */}
      <RoadmapAnalytics
        stages={stages}
        completionData={completionData}
        currentStageIndex={currentStageIndex}
      />

      {/* Two-column layout: Timeline (left) and Roadmap (right) */}
      <div className="pt-4 pb-8">
        <div className="flex gap-8 lg:gap-12">
          {/* Left: Timeline (15-20% width, hidden on mobile) */}
          <div className="w-[18%] flex-shrink-0 hidden lg:block">
            <div className="sticky top-8">
              <RoadmapTimeline
                stages={stages}
                nodePositions={nodePositions}
                currentStageIndex={currentStageIndex ?? undefined}
              />
            </div>
          </div>

          {/* Right: Roadmap List (80-85% width, full width on mobile) */}
          <div className="flex-1 min-w-0 lg:w-[82%]">
            <RoadmapList
              nodes={timelineNodes}
              completionData={completionData}
              onStartSession={handleStartStage}
              onNodePositionsUpdate={handleNodePositionsUpdate}
              timelineNodePositions={nodePositions}
            />
          </div>
        </div>
      </div>
    </Container>
  );
}

