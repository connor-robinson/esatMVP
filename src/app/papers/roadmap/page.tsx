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
  type RoadmapStage,
} from "@/lib/papers/roadmapConfig";
import {
  getStageCompletionCount,
  getStageCompletion,
} from "@/lib/papers/roadmapCompletion";
import { RoadmapList } from "@/components/papers/roadmap/RoadmapList";
import { StageDetailsModal } from "@/components/papers/roadmap/StageDetailsModal";
import { getSectionForRoadmapPart } from "@/lib/papers/roadmapConfig";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { getPaper, getQuestions } from "@/lib/supabase/questions";
import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { PaperSection } from "@/types/papers";
import type { RoadmapPart } from "@/lib/papers/roadmapConfig";

export default function PapersRoadmapPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const { startSession, loadQuestions } = usePaperSessionStore();
  const [stages] = useState<RoadmapStage[]>(getRoadmapStages());
  const [unlockedStages, setUnlockedStages] = useState<Set<string>>(new Set());
  const [completionData, setCompletionData] = useState<
    Map<string, { completed: number; total: number; parts: Map<string, boolean> }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [currentStageIndex, setCurrentStageIndex] = useState<number | null>(null);
  const [selectedStageForModal, setSelectedStageForModal] = useState<RoadmapStage | null>(null);

  // Load completion data
  useEffect(() => {
    async function loadCompletionData() {
      try {
        // TESTING MODE: Unlock all stages for testing/debugging
        // TODO: Replace with real unlock logic: const unlocked = await getUnlockedStages(session.user.id, stages);
        const allStageIds = new Set(stages.map(s => s.id));
        setUnlockedStages(allStageIds);

        // Get completion data for each stage (only if user is logged in)
        const completionMap = new Map<
          string,
          { completed: number; total: number; parts: Map<string, boolean> }
        >();

        if (session?.user?.id) {
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

        // Determine current stage (first incomplete unlocked stage)
        let currentIndex: number | null = null;
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const isUnlocked = allStageIds.has(stage.id);
          const data = completionMap.get(stage.id);
          const isCompleted = (data?.completed || 0) === (data?.total || stage.parts.length) && (data?.total || 0) > 0;
          
          if (isUnlocked && !isCompleted) {
            currentIndex = i;
            break;
          }
        }
        
        // If all unlocked stages are complete, current is next locked stage
        if (currentIndex === null) {
          for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            if (!allStageIds.has(stage.id)) {
              currentIndex = i;
              break;
            }
          }
        }
        
        // Default to first stage if nothing found
        const finalCurrentIndex = currentIndex ?? 0;
        setCurrentStageIndex(finalCurrentIndex);
      } catch (error) {
        console.error("[roadmap] Error loading completion data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCompletionData();
  }, [session?.user?.id, stages]);


  // Handle node click - open modal
  const handleNodeClick = useCallback((stage: RoadmapStage) => {
    setSelectedStageForModal(stage);
  }, []);

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
        primaryParts.forEach(part => {
          const section = getSectionForRoadmapPart(part, stage.examName);
          allSections.add(section);
        });

        // Get all questions for the primary paper
        const allQuestions = await getQuestions(paper.id);
        
        // Filter questions to match selected parts from the primary paper only
        const matchingQuestions = allQuestions.filter(q => {
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

        if (matchingQuestions.length === 0) {
          console.error("[roadmap] No matching questions found for stage");
          return;
        }

        // Get question number range
        const questionNumbers = matchingQuestions.map(q => q.questionNumber).sort((a, b) => a - b);
        const questionStart = questionNumbers[0];
        const questionEnd = questionNumbers[questionNumbers.length - 1];
        const totalQuestions = questionNumbers.length;

        // Calculate time (1.5 min per question)
        const timeLimitMinutes = Math.ceil(totalQuestions * 1.5);

        // Create variant string
        const variantString = `${stage.year}-${firstPart.paperName}-${firstPart.examType}`;
        const paperType = examNameToPaperType(stage.examName) || "NSAA";

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
      console.error("[roadmap] Error refreshing completion data:", error);
    }
  }, [session?.user?.id, stages]);

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
      <PageHeader title="Practice Roadmap" />

      {/* Vertical List Roadmap */}
      <div className="py-8">
        <RoadmapList
          nodes={timelineNodes}
          completionData={completionData}
          onNodeClick={handleNodeClick}
          onStartSession={handleStartStage}
        />
      </div>

      {/* Stage Details Modal */}
      {selectedStageForModal && (
        <StageDetailsModal
          isOpen={selectedStageForModal !== null}
          onClose={() => setSelectedStageForModal(null)}
          stage={selectedStageForModal}
          userId={session?.user?.id || null}
          completionData={completionData.get(selectedStageForModal.id)?.parts || new Map()}
          onStartSession={handleStartStage}
          onCompletionUpdate={refreshCompletionData}
        />
      )}
    </Container>
  );
}

