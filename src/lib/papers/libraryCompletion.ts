/**
 * Completion tracking utilities for paper library
 * Queries paper_sessions to determine completion status for papers and sections
 */

import { supabase } from '@/lib/supabase/client';
import type { Paper, PaperSection, ExamName } from '@/types/papers';
import type { PaperSessionRow } from '@/lib/supabase/types';
import { examNameToPaperType } from '@/lib/papers/paperConfig';

/**
 * Construct paper variant string from paper (matches how sessions are stored)
 * Format: "{year}-{paperName}-{examType}"
 * Note: paperName here is the actual paper name from database (e.g., "Paper 1", "Section 1")
 */
function constructPaperVariant(paper: Paper): string {
  return `${paper.examYear}-${paper.paperName}-${paper.examType || 'Official'}`;
}

/**
 * Check if a specific section is completed for a paper
 * This function queries flexibly to handle how sessions are actually stored
 */
export async function isSectionCompleted(
  userId: string,
  paper: Paper,
  section: PaperSection
): Promise<boolean> {
  try {
    const paperVariant = constructPaperVariant(paper);
    // paper_name in sessions is stored as PaperType (from examNameToPaperType)
    const paperTypeName = examNameToPaperType(paper.examName);

    // Query for ALL completed sessions for this user and exam
    // paper_name is stored as PaperType (from examNameToPaperType), so we check both PaperType and ExamName
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
      .ilike('paper_variant', `${paper.examYear}-%`);
    
    if (!error1 && data1) {
      data = data1 as any[];
    }
    
    // Also check with ExamName (for backwards compatibility or data inconsistencies)
    if (paperTypeName !== paper.examName) {
      const { data: data2, error: error2 } = await supabase
        .from('paper_sessions')
        .select('id, ended_at, selected_sections, paper_name, paper_variant')
        .eq('user_id', userId)
        .eq('paper_name', paper.examName)
        .not('ended_at', 'is', null)
        .ilike('paper_variant', `${paper.examYear}-%`);
      
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
      console.error('[libraryCompletion] Error checking section completion:', error);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    // Filter sessions that match our paper variant
    // Handle variations in paper name format (e.g., "Paper 1" vs "Paper")
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
        if (sessionYear === String(paper.examYear) && 
            sessionExamType === (paper.examType || 'Official')) {
          // Flexible paper name matching (handle variations)
          const normalizedSessionName = sessionPaperName.toLowerCase().trim();
          const normalizedPaperName = paper.paperName.toLowerCase().trim();
          
          return normalizedSessionName === normalizedPaperName || 
                 normalizedSessionName.includes(normalizedPaperName) || 
                 normalizedPaperName.includes(normalizedSessionName);
        }
      }
      
      return false;
    });

    // Check if ANY matching session includes our section
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
    console.error('[libraryCompletion] Error in isSectionCompleted:', error);
    return false;
  }
}

/**
 * Get completion status for all sections in a paper
 */
export async function getPaperSectionCompletion(
  userId: string,
  paper: Paper,
  sections: PaperSection[]
): Promise<Map<PaperSection, boolean>> {
  const completionMap = new Map<PaperSection, boolean>();

  for (const section of sections) {
    const completed = await isSectionCompleted(userId, paper, section);
    completionMap.set(section, completed);
  }

  return completionMap;
}

/**
 * Get paper completion status
 * Returns: 'none' | 'partial' | 'complete'
 */
export async function getPaperCompletionStatus(
  userId: string,
  paper: Paper,
  sections: PaperSection[]
): Promise<'none' | 'partial' | 'complete'> {
  if (sections.length === 0) {
    return 'none';
  }

  const completionMap = await getPaperSectionCompletion(userId, paper, sections);
  
  let completedCount = 0;
  for (const [_, completed] of completionMap) {
    if (completed) {
      completedCount++;
    }
  }

  if (completedCount === 0) {
    return 'none';
  } else if (completedCount === sections.length) {
    return 'complete';
  } else {
    return 'partial';
  }
}

