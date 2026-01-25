/**
 * Shared completion tracking utilities
 * Common logic for checking paper section completion across roadmap and library
 */

import { supabase } from '@/lib/supabase/client';
import type { PaperSessionRow } from '@/lib/supabase/types';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import type { ExamName, ExamType } from '@/types/papers';
import { getQuestions } from '@/lib/supabase/questions';
import { getPaper } from '@/lib/supabase/questions';
import { getCompletedPartIds as getCompletedPartIdsFromCache, markPartIdsAsCompleted } from './completionCache';

/**
 * Paper variant format: "{year}-{paperName}-{examType}"
 */
export function constructPaperVariant(
  year: number | string,
  paperName: string,
  examType: ExamType | string
): string {
  return `${year}-${paperName}-${examType}`;
}

/**
 * Parse a paper variant string into its components
 * Returns null if the variant format is invalid
 */
export function parsePaperVariant(variant: string): {
  year: string;
  paperName: string;
  examType: string;
} | null {
  const parts = variant.split('-');
  if (parts.length < 3) {
    return null;
  }
  
  return {
    year: parts[0],
    paperName: parts.slice(1, -1).join('-'),
    examType: parts[parts.length - 1],
  };
}

/**
 * Check if two paper variants match (with flexible matching)
 * Handles variations in paper name format (e.g., "Paper 1" vs "Paper")
 */
export function matchesPaperVariant(
  sessionVariant: string,
  targetVariant: string,
  targetYear: number | string,
  targetPaperName: string,
  targetExamType: ExamType | string
): boolean {
  // Exact match first
  if (sessionVariant === targetVariant) {
    return true;
  }
  
  // Parse and compare components
  const parsed = parsePaperVariant(sessionVariant);
  if (!parsed) {
    return false;
  }
  
  // Match year and examType exactly
  if (parsed.year !== String(targetYear) || parsed.examType !== targetExamType) {
    return false;
  }
  
  // Flexible paper name matching (handle variations)
  const normalizedSessionName = parsed.paperName.toLowerCase().trim();
  const normalizedTargetName = targetPaperName.toLowerCase().trim();
  
  return (
    normalizedSessionName === normalizedTargetName ||
    normalizedSessionName.includes(normalizedTargetName) ||
    normalizedTargetName.includes(normalizedSessionName)
  );
}

/**
 * Query completed sessions for a user matching paper criteria
 * Handles both PaperType and ExamName lookups for backwards compatibility
 * 
 * @param userId - User ID to query sessions for
 * @param paperTypeName - PaperType name (e.g., "NSAA", "TMUA")
 * @param examName - ExamName (e.g., "NSAA", "TMUA") - may differ from paperTypeName
 * @param yearFilter - Optional year filter pattern (e.g., "2023-%")
 * @returns Array of matching completed sessions
 */
export async function queryCompletedSessions(
  userId: string,
  paperTypeName: string,
  examName: string,
  yearFilter?: string
): Promise<Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant' | 'paper_id' | 'question_start' | 'question_end'>[]> {
  let data: any[] = [];
  let error: any = null;
  
  // Query with PaperType first (how it's actually stored)
  const query1 = supabase
    .from('paper_sessions')
    .select('id, ended_at, selected_sections, selected_part_ids, paper_name, paper_variant, paper_id, question_start, question_end')
    .eq('user_id', userId)
    .eq('paper_name', paperTypeName)
    .not('ended_at', 'is', null);
  
  if (yearFilter) {
    query1.ilike('paper_variant', yearFilter);
  }
  
  const { data: data1, error: error1 } = await query1;
  
  if (!error1 && data1) {
    data = data1 as any[];
  }
  
  // Also check with ExamName (for backwards compatibility or data inconsistencies)
  if (paperTypeName !== examName) {
    const query2 = supabase
      .from('paper_sessions')
      .select('id, ended_at, selected_sections, selected_part_ids, paper_name, paper_variant, paper_id, question_start, question_end')
      .eq('user_id', userId)
      .eq('paper_name', examName)
      .not('ended_at', 'is', null);
    
    if (yearFilter) {
      query2.ilike('paper_variant', yearFilter);
    }
    
    const { data: data2, error: error2 } = await query2;
    
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
    console.error('[completionUtils] Error querying completed sessions:', error);
    return [];
  }
  
  return data as Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'selected_part_ids' | 'paper_name' | 'paper_variant' | 'paper_id' | 'question_start' | 'question_end'>[];
}

/**
 * Check if a section is present in any of the given completed sessions
 * 
 * @param sessions - Array of completed sessions to check
 * @param targetSection - Section name to look for
 * @param targetVariant - Target paper variant for matching
 * @param targetYear - Target year
 * @param targetPaperName - Target paper name
 * @param targetExamType - Target exam type
 * @returns true if section is found in any matching session
 */
export function isSectionInSessions(
  sessions: Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant'>[],
  targetSection: string,
  targetVariant: string,
  targetYear: number | string,
  targetPaperName: string,
  targetExamType: ExamType | string
): boolean {
  // Filter sessions that match our paper variant
  const matchingSessions = sessions.filter((session) => {
    return matchesPaperVariant(
      session.paper_variant || '',
      targetVariant,
      targetYear,
      targetPaperName,
      targetExamType
    );
  });
  
  // Check if ANY matching session includes our section
  for (const session of matchingSessions) {
    const selectedSections = session.selected_sections as string[] | null;
    
    if (selectedSections && selectedSections.length > 0) {
      if (selectedSections.includes(targetSection)) {
        return true; // Found a completed session with this section
      }
    }
  }
  
  return false;
}

/**
 * Load all completed sessions for a user, grouped by paper_name
 * Optimized for batch processing (used by roadmap)
 * 
 * @param userId - User ID to load sessions for
 * @returns Map of paper_name -> sessions array
 */
export async function loadAllCompletedSessionsByPaperName(
  userId: string
): Promise<Map<string, Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'selected_part_ids' | 'paper_name' | 'paper_variant' | 'paper_id' | 'question_start' | 'question_end'>[]>> {
  try {
    console.log('[completionUtils] loadAllCompletedSessionsByPaperName for user:', userId);
    const { data, error } = await supabase
      .from('paper_sessions')
      .select('id, ended_at, selected_sections, selected_part_ids, paper_name, paper_variant, paper_id, question_start, question_end')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('paper_variant');

    if (error) {
      console.error('[completionUtils] Error loading all sessions:', error);
      return new Map();
    }

    console.log('[completionUtils] Loaded sessions:', data?.length || 0);
    
    if (!data || data.length === 0) {
      console.log('[completionUtils] No completed sessions found');
      return new Map();
    }

    // Group sessions by paper_name for faster lookup
    type SessionType = Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'selected_part_ids' | 'paper_name' | 'paper_variant' | 'paper_id' | 'question_start' | 'question_end'>;
    const sessionsByPaperName = new Map<string, SessionType[]>();
    const typedData = data as SessionType[];
    
    for (const session of typedData) {
      console.log('[completionUtils] Processing session:', {
        id: session.id,
        paperName: session.paper_name,
        paperVariant: session.paper_variant,
        selectedPartIds: session.selected_part_ids || [],
        selectedSections: session.selected_sections || []
      });
      
      const paperName = session.paper_name;
      if (!sessionsByPaperName.has(paperName)) {
        sessionsByPaperName.set(paperName, []);
      }
      sessionsByPaperName.get(paperName)!.push(session);
    }

    console.log('[completionUtils] Grouped sessions by paper name:', Array.from(sessionsByPaperName.keys()));

    return sessionsByPaperName;
  } catch (error) {
    console.error('[completionUtils] Error in loadAllCompletedSessionsByPaperName:', error);
    return new Map();
  }
}

/**
 * Normalize part identifiers for comparison
 * Handles variations like "Part A" vs "A", case differences, etc.
 */
export function normalizePartIdentifier(partLetter: string | null | undefined, partName: string | null | undefined): string {
  const letter = (partLetter || '').toString().trim().toLowerCase();
  const name = (partName || '').toString().trim().toLowerCase();
  
  // Remove common prefixes like "part", "section"
  const cleanLetter = letter.replace(/^(part|section)\s*/i, '');
  const cleanName = name.replace(/^(part|section)\s*/i, '');
  
  // Combine into a normalized key
  return `${cleanLetter}:${cleanName}`;
}

/**
 * Check if two part identifiers match (with normalization)
 */
export function partsMatch(
  partLetter1: string | null | undefined,
  partName1: string | null | undefined,
  partLetter2: string | null | undefined,
  partName2: string | null | undefined
): boolean {
  const normalized1 = normalizePartIdentifier(partLetter1, partName1);
  const normalized2 = normalizePartIdentifier(partLetter2, partName2);
  
  // Exact match
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Also check if one is a substring of the other (for flexibility)
  if (normalized1 && normalized2) {
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get questions for a paper within a question range
 * Used to determine which parts were actually attempted in a session
 */
export async function getQuestionsInRange(
  paperId: number | null,
  questionStart: number | null,
  questionEnd: number | null
): Promise<Array<{ questionNumber: number; partLetter: string | null; partName: string | null }>> {
  if (!paperId || !questionStart || !questionEnd) {
    return [];
  }
  
  try {
    const questions = await getQuestions(paperId);
    
    // Filter by question range
    const questionsInRange = questions.filter(q => 
      q.questionNumber >= questionStart && q.questionNumber <= questionEnd
    );
    
    // Return simplified structure with part info
    return questionsInRange.map(q => ({
      questionNumber: q.questionNumber,
      partLetter: q.partLetter,
      partName: q.partName,
    }));
  } catch (error) {
    console.error('[completionUtils] Error getting questions in range:', error);
    return [];
  }
}

/**
 * Check if a specific part (partLetter + partName) was completed by examining questions
 * This is more accurate than section-level checking because it verifies actual questions were answered
 * 
 * @param sessions - Completed sessions to check
 * @param targetPartLetter - Target part letter (e.g., "A", "1")
 * @param targetPartName - Target part name (e.g., "Mathematics")
 * @param targetVariant - Target paper variant
 * @param targetYear - Target year
 * @param targetPaperName - Target paper name
 * @param targetExamType - Target exam type
 * @returns true if questions from this part were answered in any matching session
 */
export async function isPartCompletedFromSessions(
  sessions: Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant' | 'paper_id' | 'question_start' | 'question_end'>[],
  targetPartLetter: string | null | undefined,
  targetPartName: string | null | undefined,
  targetVariant: string,
  targetYear: number | string,
  targetPaperName: string,
  targetExamType: ExamType | string
): Promise<boolean> {
  // Filter sessions that match our paper variant
  const matchingSessions = sessions.filter((session) => {
    return matchesPaperVariant(
      session.paper_variant || '',
      targetVariant,
      targetYear,
      targetPaperName,
      targetExamType
    );
  });
  
  if (matchingSessions.length === 0) {
    return false;
  }
  
  // For each matching session, check if questions from the target part were answered
  for (const session of matchingSessions) {
    if (!session.paper_id || !session.question_start || !session.question_end) {
      // Fallback to section-level check if question range not available
      const selectedSections = session.selected_sections as string[] | null;
      if (selectedSections && selectedSections.length > 0) {
        // We can't determine part-level completion without question data
        // This is a fallback, so we'll return false to be conservative
        continue;
      }
      continue;
    }
    
    // Get questions in this session's range
    const questionsInRange = await getQuestionsInRange(
      session.paper_id,
      session.question_start,
      session.question_end
    );
    
    // Check if any question matches our target part
    for (const question of questionsInRange) {
      if (partsMatch(
        question.partLetter,
        question.partName,
        targetPartLetter,
        targetPartName
      )) {
        // Found a question from the target part in a completed session
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Batch check part completion for multiple parts
 * Optimized to load questions once per paper and reuse across parts
 * 
 * @param sessions - Completed sessions to check
 * @param parts - Array of parts to check (each with partLetter, partName, and paper info)
 * @returns Map of partKey -> isCompleted
 */
export async function checkMultiplePartsCompleted(
  sessions: Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant' | 'paper_id' | 'question_start' | 'question_end'>[],
  parts: Array<{
    partLetter: string | null | undefined;
    partName: string | null | undefined;
    paperVariant: string;
    year: number | string;
    paperName: string;
    examType: ExamType | string;
    paperId?: number | null;
  }>
): Promise<Map<string, boolean>> {
  const completionMap = new Map<string, boolean>();
  
  // Group parts by paper_id to batch load questions
  const partsByPaperId = new Map<number, typeof parts>();
  for (const part of parts) {
    if (part.paperId) {
      if (!partsByPaperId.has(part.paperId)) {
        partsByPaperId.set(part.paperId, []);
      }
      partsByPaperId.get(part.paperId)!.push(part);
    }
  }
  
  // Load questions for each paper once
  const questionsByPaperId = new Map<number, Array<{ questionNumber: number; partLetter: string | null; partName: string | null }>>();
  for (const [paperId, _] of partsByPaperId) {
    try {
      const questions = await getQuestions(paperId);
      questionsByPaperId.set(paperId, questions.map(q => ({
        questionNumber: q.questionNumber,
        partLetter: q.partLetter,
        partName: q.partName,
      })));
    } catch (error) {
      console.error(`[completionUtils] Error loading questions for paper ${paperId}:`, error);
      questionsByPaperId.set(paperId, []);
    }
  }
  
  // Check each part
  for (const part of parts) {
    const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
    
    // Filter sessions matching this part's paper variant
    const matchingSessions = sessions.filter((session) => {
      return matchesPaperVariant(
        session.paper_variant || '',
        part.paperVariant,
        part.year,
        part.paperName,
        part.examType
      );
    });
    
    if (matchingSessions.length === 0) {
      completionMap.set(partKey, false);
      continue;
    }
    
    // Check if any matching session contains questions from this part
    let isCompleted = false;
    
    for (const session of matchingSessions) {
      if (!session.paper_id || !session.question_start || !session.question_end) {
        continue;
      }
      
      // Get questions for this paper (already loaded)
      const allQuestions = questionsByPaperId.get(session.paper_id) || [];
      
      // Filter to questions in this session's range
      const questionsInRange = allQuestions.filter(q =>
        q.questionNumber >= session.question_start! &&
        q.questionNumber <= session.question_end!
      );
      
      // Check if any question matches our target part
      for (const question of questionsInRange) {
        if (partsMatch(
          question.partLetter,
          question.partName,
          part.partLetter,
          part.partName
        )) {
          isCompleted = true;
          break;
        }
      }
      
      if (isCompleted) {
        break;
      }
    }
    
    completionMap.set(partKey, isCompleted);
  }
  
  return completionMap;
}

