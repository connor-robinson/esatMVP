/**
 * Shared completion tracking utilities
 * Common logic for checking paper section completion across roadmap and library
 */

import { supabase } from '@/lib/supabase/client';
import type { PaperSessionRow } from '@/lib/supabase/types';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import type { ExamName, ExamType } from '@/types/papers';

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
): Promise<Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant'>[]> {
  let data: any[] = [];
  let error: any = null;
  
  // Query with PaperType first (how it's actually stored)
  const query1 = supabase
    .from('paper_sessions')
    .select('id, ended_at, selected_sections, paper_name, paper_variant')
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
      .select('id, ended_at, selected_sections, paper_name, paper_variant')
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
  
  return data as Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant'>[];
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
): Promise<Map<string, Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant'>[]>> {
  try {
    const { data, error } = await supabase
      .from('paper_sessions')
      .select('id, ended_at, selected_sections, paper_name, paper_variant')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('paper_variant');

    if (error) {
      console.error('[completionUtils] Error loading all sessions:', error);
      return new Map();
    }

    if (!data || data.length === 0) {
      return new Map();
    }

    // Group sessions by paper_name for faster lookup
    type SessionType = Pick<PaperSessionRow, 'id' | 'ended_at' | 'selected_sections' | 'paper_name' | 'paper_variant'>;
    const sessionsByPaperName = new Map<string, SessionType[]>();
    const typedData = data as SessionType[];
    for (const session of typedData) {
      const paperName = session.paper_name;
      if (!sessionsByPaperName.has(paperName)) {
        sessionsByPaperName.set(paperName, []);
      }
      sessionsByPaperName.get(paperName)!.push(session);
    }

    return sessionsByPaperName;
  } catch (error) {
    console.error('[completionUtils] Error in loadAllCompletedSessionsByPaperName:', error);
    return new Map();
  }
}

