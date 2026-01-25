/**
 * Completion tracking utilities for paper library
 * Queries paper_sessions to determine completion status for papers and sections
 * Uses part-level checking for accurate completion detection
 * 
 * A section is considered completed if:
 * - All parts within that section have been completed
 * - A part is completed if questions from that part were answered in a completed session
 */

import type { Paper, PaperSection } from '@/types/papers';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import {
  constructPaperVariant,
  queryCompletedSessions,
  isSectionInSessions,
  isPartCompletedFromSessions,
  checkMultiplePartsCompleted,
} from './completionUtils';
import { getQuestions } from '@/lib/supabase/questions';
import { mapPartToSection } from './sectionMapping';
import { generateSectionId, generatePartId } from './partIdUtils';
import { getCompletedPartIds, isPartIdCompleted } from './completionCache';

/**
 * Check if a specific section is completed for a paper
 * Uses part ID tracking: a section is completed if ALL parts within it are completed
 * 
 * @param userId - User ID to check completion for
 * @param paper - Paper to check
 * @param section - Section name to check
 * @returns true if the section has been completed (all parts done)
 */
export async function isSectionCompleted(
  userId: string,
  paper: Paper,
  section: PaperSection
): Promise<boolean> {
  try {
    const paperType = examNameToPaperType(paper.examName);
    
    // For TMUA: section is "Paper 1" or "Paper 2", check directly
    if (paperType === 'TMUA') {
      const sectionId = generateSectionId(
        paper.examName,
        paper.examYear,
        paper.paperName,
        section,
        paper.examType || 'Official'
      );
      return await isPartIdCompleted(userId, sectionId);
    }
    
    // For NSAA/ENGAA: Check all parts within the section
    const questions = await getQuestions(paper.id);
    
    // Find all parts that map to this section
    const partsInSection = new Set<{ partLetter: string | null; partName: string | null }>();
    
    for (const question of questions) {
      const mappedSection = mapPartToSection(
        { partLetter: question.partLetter, partName: question.partName },
        paperType
      );
      
      if (mappedSection === section) {
        partsInSection.add({
          partLetter: question.partLetter,
          partName: question.partName,
        });
      }
    }
    
    if (partsInSection.size === 0) {
      // No parts found - generate section ID and check
      const sectionId = generateSectionId(
        paper.examName,
        paper.examYear,
        paper.paperName,
        section,
        paper.examType || 'Official'
      );
      return await isPartIdCompleted(userId, sectionId);
    }
    
    // Get completed part IDs from cache
    const completedPartIds = await getCompletedPartIds(userId);
    
    // Check if ALL parts in this section are completed
    for (const part of partsInSection) {
      // Generate part ID for this part
      const partId = generatePartId(
        paper.examName,
        paper.examYear,
        paper.paperName,
        part.partLetter,
        part.partName,
        paper.examType || 'Official'
      );
      
      if (!completedPartIds.has(partId)) {
        // At least one part is not completed
        return false;
      }
    }
    
    // All parts are completed
    return true;
  } catch (error) {
    console.error('[libraryCompletion] Error in isSectionCompleted:', error);
    return false;
  }
}

/**
 * Get completion status for all sections in a paper
 * Uses optimized batch checking for better performance
 * 
 * @param userId - User ID to check completion for
 * @param paper - Paper to check
 * @param sections - Array of sections to check
 * @returns Map of section -> isCompleted
 */
export async function getPaperSectionCompletion(
  userId: string,
  paper: Paper,
  sections: PaperSection[]
): Promise<Map<PaperSection, boolean>> {
  const completionMap = new Map<PaperSection, boolean>();
  
  if (sections.length === 0) {
    return completionMap;
  }

  try {
    const paperVariant = constructPaperVariant(
      paper.examYear,
      paper.paperName,
      paper.examType || 'Official'
    );
    const paperTypeName = examNameToPaperType(paper.examName);
    const paperType = examNameToPaperType(paper.examName);

    // Query completed sessions matching this paper
    const sessions = await queryCompletedSessions(
      userId,
      paperTypeName,
      paper.examName,
      `${paper.examYear}-%`
    );

    if (sessions.length === 0) {
      // No sessions - all sections incomplete
      for (const section of sections) {
        completionMap.set(section, false);
      }
      return completionMap;
    }

    // Get all questions for this paper
    const questions = await getQuestions(paper.id);
    
    // Build a map of section -> parts
    const sectionToParts = new Map<PaperSection, Set<{ partLetter: string | null; partName: string | null }>>();
    
    for (const question of questions) {
      const mappedSection = mapPartToSection(
        { partLetter: question.partLetter, partName: question.partName },
        paperType
      );
      
      if (sections.includes(mappedSection)) {
        if (!sectionToParts.has(mappedSection)) {
          sectionToParts.set(mappedSection, new Set());
        }
        sectionToParts.get(mappedSection)!.add({
          partLetter: question.partLetter,
          partName: question.partName,
        });
      }
    }
    
    // Get completed part IDs from cache
    const completedPartIds = await getCompletedPartIds(userId);
    
    // Check completion for each section
    for (const section of sections) {
      const parts = sectionToParts.get(section);
      
      if (!parts || parts.size === 0) {
        // No parts found - generate section ID and check
        const sectionId = generateSectionId(
          paper.examName,
          paper.examYear,
          paper.paperName,
          section,
          paper.examType || 'Official'
        );
        const isCompleted = completedPartIds.has(sectionId);
        completionMap.set(section, isCompleted);
        continue;
      }
      
      // Check if all parts in this section are completed
      let allPartsCompleted = true;
      for (const part of parts) {
        // Generate part ID for this part
        const partId = generatePartId(
          paper.examName,
          paper.examYear,
          paper.paperName,
          part.partLetter,
          part.partName,
          paper.examType || 'Official'
        );
        
        if (!completedPartIds.has(partId)) {
          allPartsCompleted = false;
          break;
        }
      }
      
      completionMap.set(section, allPartsCompleted);
    }
  } catch (error) {
    console.error('[libraryCompletion] Error in getPaperSectionCompletion:', error);
    // On error, set all to false
    for (const section of sections) {
      completionMap.set(section, false);
    }
  }

  return completionMap;
}

/**
 * Get overall paper completion status
 * 
 * @param userId - User ID to check completion for
 * @param paper - Paper to check
 * @param sections - Array of sections in the paper
 * @returns 'none' if no sections completed, 'partial' if some completed, 'complete' if all completed
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

