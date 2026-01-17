/**
 * Completion tracking utilities for roadmap
 * Queries paper_sessions to determine completion status
 */

import { supabase } from '@/lib/supabase/client';
import type { ExamName, ExamType, PaperSection } from '@/types/papers';
import type { RoadmapPart, RoadmapStage } from './roadmapConfig';
import { getSectionForRoadmapPart } from './roadmapConfig';
import type { PaperSessionRow } from '@/lib/supabase/types';

/**
 * Construct paper variant string from components
 * Format: "{year}-{paperName}-{examType}"
 */
function constructPaperVariant(
  year: number,
  paperName: string,
  examType: ExamType
): string {
  return `${year}-${paperName}-${examType}`;
}

/**
 * Check if a specific part is completed by a user
 */
export async function isPartCompleted(
  userId: string,
  examName: ExamName,
  year: number,
  part: RoadmapPart
): Promise<boolean> {
  try {
    const paperVariant = constructPaperVariant(year, part.paperName, part.examType);
    const section = getSectionForRoadmapPart(part, examName);

    // Query for ALL completed sessions matching this paper variant
    // We need to check ALL sessions, not just the most recent one,
    // because a user might complete different parts in different sessions
    const { data, error } = await supabase
      .from('paper_sessions')
      .select('id, ended_at, selected_sections, paper_name, paper_variant')
      .eq('user_id', userId)
      .eq('paper_name', examName)
      .eq('paper_variant', paperVariant)
      .not('ended_at', 'is', null); // Session must be completed

    if (error) {
      console.error('[roadmapCompletion] Error checking part completion:', error);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    // Check if ANY completed session includes our section
    // This handles cases where user completes different parts in different sessions
    for (const session of data as Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant'>[]) {
      const selectedSections = session.selected_sections as string[] | null;
      
      if (selectedSections && selectedSections.length > 0) {
        if (selectedSections.includes(section)) {
          return true; // Found a completed session with this section
        }
      }
    }

    return false; // No completed session found with this section
  } catch (error) {
    console.error('[roadmapCompletion] Error in isPartCompleted:', error);
    return false;
  }
}

/**
 * Get completion status for all parts in a stage
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
 * Check if a stage is fully completed (all parts done)
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
    const now = new Date().toISOString();
    
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


