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
import { generatePartIdFromRoadmapPart } from './partIdUtils';
import { getRoadmapPartKey } from './roadmapPartKey';
import { countDisplayGroupCompletion } from './roadmapDisplayGroups';
import {
  isPartIdCompleted,
  getCompletedPartIds,
  markPartIdsAsCompleted,
  invalidateCache,
  setCachedCompletedIds,
  getCachedCompletedIds,
  syncWithDatabase,
} from './completionCache';

export { getCompletedPartIds } from './completionCache';

function removePartIdsFromCache(userId: string, partIds: string[]): void {
  const cached = getCachedCompletedIds(userId);
  if (!cached) {
    invalidateCache(userId);
    return;
  }
  const next = new Set(cached);
  for (const id of partIds) next.delete(id);
  setCachedCompletedIds(userId, next);
}

/**
 * Check if a specific roadmap part is completed by a user
 * Uses part ID tracking for efficient completion detection
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
    // Generate part ID
    const partId = generatePartIdFromRoadmapPart(examName, year, part);
    
    // Check using part ID (uses cache first, then database)
    const completed = await isPartIdCompleted(userId, partId);
    
    return completed;
  } catch (error) {
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
    const partKey = getRoadmapPartKey(part);
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
 * Get completion status for all parts in a stage using cached part IDs.
 * Pass `completedPartIds` from a single getCompletedPartIds() when loading many stages.
 */
export async function getStageCompletionFromSessions(
  userId: string,
  stage: RoadmapStage,
  completedPartIds?: Set<string>,
): Promise<Map<string, boolean>> {
  const ids = completedPartIds ?? (await getCompletedPartIds(userId));
  
  // Generate part IDs and check completion
  const completionMap = new Map<string, boolean>();
  
  for (const part of stage.parts) {
    const partId = generatePartIdFromRoadmapPart(stage.examName, stage.year, part);
    const partKey = getRoadmapPartKey(part);
    const isCompleted = ids.has(partId);
    
    completionMap.set(partKey, isCompleted);
  }
  
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
  return countDisplayGroupCompletion(stage.parts, completion, getRoadmapPartKey);
}

/**
 * Mark a part as completed by creating a minimal session record.
 * Allows users to manually mark papers/sections they've done outside the app.
 */
export async function markPartAsCompleted(
  userId: string,
  examName: ExamName,
  year: number,
  part: RoadmapPart
): Promise<boolean> {
  try {
    const partId = generatePartIdFromRoadmapPart(examName, year, part);
    const alreadyCompleted = await isPartIdCompleted(userId, partId);
    if (alreadyCompleted) {
      return true;
    }

    const paperVariant = constructPaperVariant(year, part.paperName, part.examType);
    const section = getSectionForRoadmapPart(part, examName);
    const paperName = examNameToPaperType(examName) || examName;
    const sessionId = crypto.randomUUID();

    const response = await fetch('/api/past-papers/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: sessionId,
        paperName,
        paperVariant,
        sessionName: `Manual: ${examName} ${year} ${part.paperName} ${part.partLetter || part.partName}`,
        questionRange: {
          start: 1,
          end: 1,
        },
        selectedSections: [section],
        selectedPartIds: [partId],
        timeLimitMinutes: 0,
        startedAt: Date.now(),
        endedAt: Date.now(),
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
      return false;
    }

    markPartIdsAsCompleted(userId, [partId]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Remove part IDs from finished sessions so those parts count as not done.
 */
export async function unmarkPartIdsAsCompleted(
  userId: string,
  partIds: string[],
): Promise<boolean> {
  if (partIds.length === 0) return true;
  const remove = new Set(partIds);

  try {
    const response = await fetch('/api/past-papers/sessions');
    if (!response.ok) return false;

    const data = await response.json();
    const sessions = (data.sessions || []) as Array<{
      id: string;
      ended_at: string | null;
      selected_part_ids?: string[] | null;
      session_name?: string | null;
    }>;

    for (const session of sessions) {
      if (!session.ended_at) continue;
      const current = session.selected_part_ids ?? [];
      if (!current.some((id) => remove.has(id))) continue;

      const nextIds = current.filter((id) => !remove.has(id));

      // Pure manual markers with nothing left can be deleted via emptying part ids.
      const patch = await fetch('/api/past-papers/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session.id,
          selectedPartIds: nextIds,
        }),
      });
      if (!patch.ok) return false;
    }

    removePartIdsFromCache(userId, partIds);
    invalidateCache(userId);
    await syncWithDatabase(userId);
    return true;
  } catch {
    return false;
  }
}

export async function unmarkPartAsCompleted(
  userId: string,
  examName: ExamName,
  year: number,
  part: RoadmapPart,
): Promise<boolean> {
  const partId = generatePartIdFromRoadmapPart(examName, year, part);
  return unmarkPartIdsAsCompleted(userId, [partId]);
}

/** Mark every part in a stage as done (manual). */
export async function markStageAsCompleted(
  userId: string,
  stage: RoadmapStage,
): Promise<boolean> {
  for (const part of stage.parts) {
    const ok = await markPartAsCompleted(
      userId,
      stage.examName,
      stage.year,
      part,
    );
    if (!ok) return false;
  }
  return true;
}

/** Clear completion for every part in a stage (manual). */
export async function unmarkStageAsCompleted(
  userId: string,
  stage: RoadmapStage,
): Promise<boolean> {
  const partIds = stage.parts.map((part) =>
    generatePartIdFromRoadmapPart(stage.examName, stage.year, part),
  );
  return unmarkPartIdsAsCompleted(userId, partIds);
}

export type ManualRoadmapStatus = "not_started" | "done";

export async function setRoadmapStageManualStatus(
  userId: string,
  stage: RoadmapStage,
  status: ManualRoadmapStatus,
): Promise<boolean> {
  if (status === "done") {
    return markStageAsCompleted(userId, stage);
  }
  return unmarkStageAsCompleted(userId, stage);
}

