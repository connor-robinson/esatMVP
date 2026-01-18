/**
 * Completion tracking utilities for roadmap
 * Queries paper_sessions to determine completion status
 */

import { supabase } from '@/lib/supabase/client';
import type { ExamName, ExamType, PaperSection } from '@/types/papers';
import type { RoadmapPart, RoadmapStage } from './roadmapConfig';
import { getSectionForRoadmapPart } from './roadmapConfig';
import type { PaperSessionRow } from '@/lib/supabase/types';
import { examNameToPaperType } from '@/lib/papers/paperConfig';

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
    // paper_name in sessions is stored as PaperType (from examNameToPaperType)
    const paperTypeName = examNameToPaperType(examName);

    // Query for ALL completed sessions matching this paper
    // paper_name is stored as PaperType (from examNameToPaperType), so we check both
    // We filter by year in the variant for better performance
    let data: any[] = [];
    let error: any = null;
    
    // Try querying with PaperType first (how it's actually stored)
    const { data: data1, error: error1 } = await supabase
      .from('paper_sessions')
      .select('id, ended_at, selected_sections, paper_name, paper_variant')
      .eq('user_id', userId)
      .eq('paper_name', paperTypeName)
      .not('ended_at', 'is', null)
      .ilike('paper_variant', `${year}-%`);
    
    if (!error1 && data1) {
      data = data1 as any[];
    }
    
    // Also check with ExamName (for backwards compatibility or data inconsistencies)
    if (paperTypeName !== examName) {
      const { data: data2, error: error2 } = await supabase
        .from('paper_sessions')
        .select('id, ended_at, selected_sections, paper_name, paper_variant')
        .eq('user_id', userId)
        .eq('paper_name', examName)
        .not('ended_at', 'is', null)
        .ilike('paper_variant', `${year}-%`);
      
      if (!error2 && data2) {
        // Merge results, avoiding duplicates
        const existingIds = new Set(data.map(s => s.id));
        const typedData2 = data2 as any[];
        data = [...data, ...typedData2.filter(s => !existingIds.has(s.id))];
      }
      
      error = error2 || error1;
    } else {
      error = error1;
    }

    if (error) {
      console.error('[roadmapCompletion] Error checking part completion:', error);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    // Filter sessions that match our paper variant (flexible matching)
    const matchingSessions = data.filter((session) => {
      const sessionVariant = session.paper_variant || '';
      
      // Exact match first
      if (sessionVariant === paperVariant) {
        return true;
      }
      
      // Flexible matching: check if variant parts match
      const variantParts = sessionVariant.split('-');
      if (variantParts.length >= 3) {
        const sessionYear = variantParts[0];
        const sessionExamType = variantParts[variantParts.length - 1];
        const sessionPaperName = variantParts.slice(1, -1).join('-');
        
        // Match if year and examType match
        if (sessionYear === String(year) && 
            sessionExamType === part.examType) {
          // Flexible paper name matching
          const normalizedSessionName = sessionPaperName.toLowerCase().trim();
          const normalizedPartName = part.paperName.toLowerCase().trim();
          
          return normalizedSessionName === normalizedPartName || 
                 normalizedSessionName.includes(normalizedPartName) || 
                 normalizedPartName.includes(normalizedSessionName);
        }
      }
      
      return false;
    });

    // Check if ANY matching session includes our section
    // This handles cases where user completes different parts in different sessions
    for (const session of matchingSessions as Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant'>[]) {
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
 * Batch load all completed sessions for a user (optimized for roadmap)
 */
export async function loadAllCompletedSessions(userId: string): Promise<Map<string, any[]>> {
  try {
    // Load ALL completed sessions at once, grouped by paper_name
    const { data, error } = await supabase
      .from('paper_sessions')
      .select('id, ended_at, selected_sections, paper_name, paper_variant')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('paper_variant');

    if (error) {
      console.error('[roadmapCompletion] Error loading all sessions:', error);
      return new Map();
    }

    if (!data || data.length === 0) {
      return new Map();
    }

    // Group sessions by paper_name for faster lookup
    const sessionsByPaperName = new Map<string, any[]>();
    const typedData = data as any[];
    for (const session of typedData) {
      const paperName = session.paper_name;
      if (!sessionsByPaperName.has(paperName)) {
        sessionsByPaperName.set(paperName, []);
      }
      sessionsByPaperName.get(paperName)!.push(session);
    }

    return sessionsByPaperName;
  } catch (error) {
    console.error('[roadmapCompletion] Error in loadAllCompletedSessions:', error);
    return new Map();
  }
}

/**
 * Check if a part is completed using pre-loaded sessions
 */
function checkPartCompletedFromSessions(
  sessions: any[],
  examName: ExamName,
  year: number,
  part: RoadmapPart
): boolean {
  const paperVariant = constructPaperVariant(year, part.paperName, part.examType);
  const section = getSectionForRoadmapPart(part, examName);
  const paperTypeName = examNameToPaperType(examName);

  // Filter sessions by paper type/name and year
  const matchingSessions = sessions.filter((session) => {
    // Match paper_name (should be PaperType, but check both)
    if (session.paper_name !== paperTypeName && session.paper_name !== examName) {
      return false;
    }

    const sessionVariant = session.paper_variant || '';
    
    // Exact match first
    if (sessionVariant === paperVariant) {
      return true;
    }
    
    // Flexible matching: check if variant parts match
    const variantParts = sessionVariant.split('-');
    if (variantParts.length >= 3) {
      const sessionYear = variantParts[0];
      const sessionExamType = variantParts[variantParts.length - 1];
      const sessionPaperName = variantParts.slice(1, -1).join('-');
      
      // Match if year and examType match
      if (sessionYear === String(year) && 
          sessionExamType === part.examType) {
        // Flexible paper name matching
        const normalizedSessionName = sessionPaperName.toLowerCase().trim();
        const normalizedPartName = part.paperName.toLowerCase().trim();
        
        return normalizedSessionName === normalizedPartName || 
               normalizedSessionName.includes(normalizedPartName) || 
               normalizedPartName.includes(normalizedSessionName);
      }
    }
    
    return false;
  });

  // Check if ANY matching session includes our section
  for (const session of matchingSessions) {
    const selectedSections = session.selected_sections as string[] | null;
    
    if (selectedSections && selectedSections.length > 0) {
      if (selectedSections.includes(section)) {
        return true; // Found a completed session with this section
      }
    }
  }

  return false;
}

/**
 * Get completion status for all parts in a stage (optimized with batch loading)
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
 * Get completion status for all parts in a stage using pre-loaded sessions (FAST)
 */
export function getStageCompletionFromSessions(
  sessionsByPaperName: Map<string, any[]>,
  stage: RoadmapStage
): Map<string, boolean> {
  const completionMap = new Map<string, boolean>();
  const paperTypeName = examNameToPaperType(stage.examName);
  
  // Get relevant sessions (check both PaperType and ExamName)
  const relevantSessions: any[] = [];
  if (sessionsByPaperName.has(paperTypeName)) {
    relevantSessions.push(...sessionsByPaperName.get(paperTypeName)!);
  }
  if (paperTypeName !== stage.examName && sessionsByPaperName.has(stage.examName)) {
    relevantSessions.push(...sessionsByPaperName.get(stage.examName)!);
  }

  for (const part of stage.parts) {
    const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
    const completed = checkPartCompletedFromSessions(
      relevantSessions,
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


