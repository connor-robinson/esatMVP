/**
 * Completion tracking utilities for roadmap
 * Queries paper_sessions to determine completion status for roadmap parts
 * 
 * A part is considered completed if:
 * - There exists a completed session (ended_at IS NOT NULL)
 * - The session's paper_variant matches the part's paper
 * - The session's selected_sections array includes the section for this part
 */

import type { ExamName, ExamType } from '@/types/papers';
import type { RoadmapPart, RoadmapStage } from './roadmapConfig';
import { getSectionForRoadmapPart } from './roadmapConfig';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import {
  constructPaperVariant,
  queryCompletedSessions,
  isSectionInSessions,
  loadAllCompletedSessionsByPaperName,
  isPartCompletedFromSessions,
  checkMultiplePartsCompleted,
} from './completionUtils';
import { getPaper } from '@/lib/supabase/questions';

/**
 * Check if a specific roadmap part is completed by a user
 * Uses part-level checking by examining questions, not just section names
 * 
 * @param userId - User ID to check completion for
 * @param examName - Exam name (e.g., "NSAA", "TMUA")
 * @param year - Exam year
 * @param part - Roadmap part to check
 * @returns true if the part has been completed in any session
 */
export async function isPartCompleted(
  userId: string,
  examName: ExamName,
  year: number,
  part: RoadmapPart
): Promise<boolean> {
  try {
    const paperVariant = constructPaperVariant(year, part.paperName, part.examType);
    const paperTypeName = examNameToPaperType(examName);

    // Query completed sessions matching this paper
    const sessions = await queryCompletedSessions(
      userId,
      paperTypeName,
      examName,
      `${year}-%`
    );

    if (sessions.length === 0) {
      return false;
    }

    // Use part-level checking (checks actual questions, not just section names)
    return await isPartCompletedFromSessions(
      sessions,
      part.partLetter,
      part.partName,
      paperVariant,
      year,
      part.paperName,
      part.examType
    );
  } catch (error) {
    console.error('[roadmapCompletion] Error in isPartCompleted:', error);
    return false;
  }
}

/**
 * Batch load all completed sessions for a user, grouped by paper_name
 * Optimized for roadmap to avoid hundreds of sequential queries
 * 
 * @param userId - User ID to load sessions for
 * @returns Map of paper_name -> sessions array
 */
export async function loadAllCompletedSessions(userId: string): Promise<Map<string, any[]>> {
  return loadAllCompletedSessionsByPaperName(userId);
}

/**
 * Check if a part is completed using pre-loaded sessions (optimized for batch processing)
 * Uses part-level checking by examining questions, not just section names
 * 
 * @param sessions - Pre-loaded sessions to check
 * @param examName - Exam name
 * @param year - Exam year
 * @param part - Roadmap part to check
 * @returns true if the part has been completed
 */
async function checkPartCompletedFromSessions(
  sessions: any[],
  examName: ExamName,
  year: number,
  part: RoadmapPart
): Promise<boolean> {
  const paperVariant = constructPaperVariant(year, part.paperName, part.examType);
  const paperTypeName = examNameToPaperType(examName);

  // Filter sessions by paper type/name
  const relevantSessions = sessions.filter((session) => {
    // Match paper_name (should be PaperType, but check both for compatibility)
    if (session.paper_name !== paperTypeName && session.paper_name !== examName) {
      return false;
    }
    return true;
  });

  // Use part-level checking (checks actual questions, not just section names)
  return await isPartCompletedFromSessions(
    relevantSessions,
    part.partLetter,
    part.partName,
    paperVariant,
    year,
    part.paperName,
    part.examType
  );
}

/**
 * Get completion status for all parts in a stage
 * Note: For better performance, use getStageCompletionFromSessions with pre-loaded sessions
 * 
 * @param userId - User ID to check completion for
 * @param stage - Roadmap stage to check
 * @returns Map of partKey -> isCompleted
 */
export async function getStageCompletion(
  userId: string,
  stage: RoadmapStage
): Promise<Map<string, boolean>> {
  const completionMap = new Map<string, boolean>();

  for (const part of stage.parts) {
    const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
    const completed = await isPartCompleted(
      userId,
      stage.examName,
      stage.year,
      part
    );
    completionMap.set(partKey, completed);
  }

  return completionMap;
}

/**
 * Get completion status for all parts in a stage using pre-loaded sessions
 * This is the FAST version - use this when loading multiple stages
 * Uses part-level checking for accurate completion detection
 * 
 * @param sessionsByPaperName - Pre-loaded sessions grouped by paper_name
 * @param stage - Roadmap stage to check
 * @returns Map of partKey -> isCompleted
 */
export async function getStageCompletionFromSessions(
  sessionsByPaperName: Map<string, any[]>,
  stage: RoadmapStage
): Promise<Map<string, boolean>> {
  const paperTypeName = examNameToPaperType(stage.examName);
  
  // Get relevant sessions (check both PaperType and ExamName for compatibility)
  const relevantSessions: any[] = [];
  if (sessionsByPaperName.has(paperTypeName)) {
    relevantSessions.push(...sessionsByPaperName.get(paperTypeName)!);
  }
  if (paperTypeName !== stage.examName && sessionsByPaperName.has(stage.examName)) {
    relevantSessions.push(...sessionsByPaperName.get(stage.examName)!);
  }

  // Prepare parts with paper_id for batch checking
  const partsWithPaperId = await Promise.all(
    stage.parts.map(async (part) => {
      const paperVariant = constructPaperVariant(stage.year, part.paperName, part.examType);
      
      // Try to get paper_id from sessions first (faster)
      let paperId: number | null = null;
      for (const session of relevantSessions) {
        const sessionVariant = session.paper_variant || '';
        if (sessionVariant === paperVariant || 
            (sessionVariant.includes(String(stage.year)) && 
             sessionVariant.includes(part.paperName) &&
             sessionVariant.includes(part.examType))) {
          paperId = session.paper_id;
          break;
        }
      }
      
      // If not found in sessions, fetch from database
      if (!paperId) {
        try {
          const paper = await getPaper(stage.examName, stage.year, part.paperName, part.examType);
          paperId = paper?.id || null;
        } catch (error) {
          console.error(`[roadmapCompletion] Error fetching paper for ${stage.examName} ${stage.year} ${part.paperName}:`, error);
        }
      }
      
      return {
        partLetter: part.partLetter,
        partName: part.partName,
        paperVariant,
        year: stage.year,
        paperName: part.paperName,
        examType: part.examType,
        paperId,
      };
    })
  );

  // Use batch checking for better performance
  const completionMap = await checkMultiplePartsCompleted(relevantSessions, partsWithPaperId);
  
  return completionMap;
}

/**
 * Check if a stage is fully completed (all parts done)
 * 
 * @param userId - User ID to check completion for
 * @param stage - Roadmap stage to check
 * @returns true if all parts in the stage are completed
 */
export async function isStageCompleted(
  userId: string,
  stage: RoadmapStage
): Promise<boolean> {
  const completion = await getStageCompletion(userId, stage);
  
  // All parts must be completed
  for (const [_, completed] of completion) {
    if (!completed) {
      return false;
    }
  }

  return completion.size > 0; // At least one part exists
}

/**
 * Get which stages are unlocked for a user
 * A stage is unlocked if:
 * - It's the first stage, OR
 * - All previous stages are completed
 * 
 * @param userId - User ID to check unlock status for
 * @param stages - Array of roadmap stages
 * @returns Set of unlocked stage IDs
 */
export async function getUnlockedStages(
  userId: string,
  stages: RoadmapStage[]
): Promise<Set<string>> {
  const unlocked = new Set<string>();

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    if (i === 0) {
      // First stage is always unlocked
      unlocked.add(stage.id);
    } else {
      // Check if previous stage is completed
      const previousStage = stages[i - 1];
      const previousCompleted = await isStageCompleted(userId, previousStage);
      
      if (previousCompleted) {
        unlocked.add(stage.id);
      } else {
        // If previous stage not completed, stop here
        break;
      }
    }
  }

  return unlocked;
}

/**
 * Get completion count for a stage (X / Y parts completed)
 * 
 * @param userId - User ID to check completion for
 * @param stage - Roadmap stage to check
 * @returns Object with completed count and total count
 */
export async function getStageCompletionCount(
  userId: string,
  stage: RoadmapStage
): Promise<{ completed: number; total: number }> {
  const completion = await getStageCompletion(userId, stage);
  
  let completed = 0;
  for (const [_, isCompleted] of completion) {
    if (isCompleted) {
      completed++;
    }
  }

  return {
    completed,
    total: completion.size,
  };
}

/**
 * Mark a part as completed by creating a minimal session record
 * This allows users to manually mark papers/sections they've done outside the app
 * 
 * @param userId - User ID (not used directly, but required for consistency)
 * @param examName - Exam name
 * @param year - Exam year
 * @param part - Roadmap part to mark as completed
 * @returns true if successfully marked as completed
 */
export async function markPartAsCompleted(
  userId: string,
  examName: ExamName,
  year: number,
  part: RoadmapPart
): Promise<boolean> {
  try {
    const paperVariant = constructPaperVariant(year, part.paperName, part.examType);
    const section = getSectionForRoadmapPart(part, examName);
    
    // Check if already completed
    const alreadyCompleted = await isPartCompleted(userId, examName, year, part);
    if (alreadyCompleted) {
      return true; // Already marked as done
    }

    // Create minimal session record via API
    const sessionId = crypto.randomUUID();
    
    const response = await fetch('/api/papers/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: sessionId,
        paperName: examName,
        paperVariant: paperVariant,
        sessionName: `Manual: ${examName} ${year} ${part.paperName} ${part.partLetter}`,
        questionRange: {
          start: 1,
          end: 1, // Minimal range
        },
        selectedSections: [section],
        timeLimitMinutes: 0,
        startedAt: Date.now(),
        endedAt: Date.now(), // Mark as completed immediately
        deadlineAt: Date.now(),
        questionOrder: [],
        perQuestionSec: [],
        answers: [],
        correctFlags: [],
        guessedFlags: [],
        mistakeTags: [],
        notes: null,
        score: null,
        pinnedInsights: null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[roadmapCompletion] Error marking part as completed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[roadmapCompletion] Error in markPartAsCompleted:', error);
    return false;
  }
}


