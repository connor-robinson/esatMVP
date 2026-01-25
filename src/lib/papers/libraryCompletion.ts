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

/**
 * Check if a specific section is completed for a paper
 * Uses part-level checking: a section is completed if ALL parts within it are completed
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
    const paperVariant = constructPaperVariant(
      paper.examYear,
      paper.paperName,
      paper.examType || 'Official'
    );
    const paperTypeName = examNameToPaperType(paper.examName);

    // Query completed sessions matching this paper
    const sessions = await queryCompletedSessions(
      userId,
      paperTypeName,
      paper.examName,
      `${paper.examYear}-%`
    );

    if (sessions.length === 0) {
      return false;
    }

    // Get all questions for this paper to find parts
    const questions = await getQuestions(paper.id);
    
    // Find all parts that map to this section
    const partsInSection = new Set<{ partLetter: string | null; partName: string | null }>();
    const paperType = examNameToPaperType(paper.examName);
    
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
      // No parts found for this section - fallback to section-level check
      return isSectionInSessions(
        sessions,
        section,
        paperVariant,
        paper.examYear,
        paper.paperName,
        paper.examType || 'Official'
      );
    }
    
    // Check if ALL parts in this section are completed
    for (const part of partsInSection) {
      const isPartCompleted = await isPartCompletedFromSessions(
        sessions,
        part.partLetter,
        part.partName,
        paperVariant,
        paper.examYear,
        paper.paperName,
        paper.examType || 'Official'
      );
      
      if (!isPartCompleted) {
        // At least one part is not completed, so section is not completed
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
    
    // Prepare all parts for batch checking
    const allParts = Array.from(sectionToParts.entries()).flatMap(([section, parts]) =>
      Array.from(parts).map(part => ({
        partLetter: part.partLetter,
        partName: part.partName,
        paperVariant,
        year: paper.examYear,
        paperName: paper.paperName,
        examType: paper.examType || 'Official',
        paperId: paper.id,
        section, // Keep track of which section this part belongs to
      }))
    );
    
    // Batch check all parts
    const partCompletionMap = await checkMultiplePartsCompleted(sessions, allParts);
    
    // Aggregate part completion to section level
    // A section is completed if ALL its parts are completed
    for (const section of sections) {
      const parts = sectionToParts.get(section);
      
      if (!parts || parts.size === 0) {
        // No parts found - fallback to section-level check
        const completed = isSectionInSessions(
          sessions,
          section,
          paperVariant,
          paper.examYear,
          paper.paperName,
          paper.examType || 'Official'
        );
        completionMap.set(section, completed);
        continue;
      }
      
      // Check if all parts in this section are completed
      let allPartsCompleted = true;
      for (const part of parts) {
        // Generate partKey matching the format used in checkMultiplePartsCompleted
        const partKey = `${paper.paperName}-${part.partLetter}-${paper.examType || 'Official'}`;
        const isPartCompleted = partCompletionMap.get(partKey);
        
        // If not found in map, check directly (fallback)
        if (isPartCompleted === undefined) {
          // Try direct check for this part
          const paperVariant = constructPaperVariant(
            paper.examYear,
            paper.paperName,
            paper.examType || 'Official'
          );
          const directCheck = await isPartCompletedFromSessions(
            sessions,
            part.partLetter,
            part.partName,
            paperVariant,
            paper.examYear,
            paper.paperName,
            paper.examType || 'Official'
          );
          if (!directCheck) {
            allPartsCompleted = false;
            break;
          }
        } else if (!isPartCompleted) {
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

