/**
 * Completion tracking utilities for paper library
 * Queries paper_sessions to determine completion status for papers and sections
 * 
 * A section is considered completed if:
 * - There exists a completed session (ended_at IS NOT NULL)
 * - The session's paper_variant matches the paper
 * - The session's selected_sections array includes the section
 */

import type { Paper, PaperSection } from '@/types/papers';
import { examNameToPaperType } from '@/lib/papers/paperConfig';
import {
  constructPaperVariant,
  queryCompletedSessions,
  isSectionInSessions,
} from './completionUtils';

/**
 * Check if a specific section is completed for a paper
 * 
 * @param userId - User ID to check completion for
 * @param paper - Paper to check
 * @param section - Section name to check
 * @returns true if the section has been completed in any session
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

    // Check if section exists in any matching session
    return isSectionInSessions(
      sessions,
      section,
      paperVariant,
      paper.examYear,
      paper.paperName,
      paper.examType || 'Official'
    );
  } catch (error) {
    console.error('[libraryCompletion] Error in isSectionCompleted:', error);
    return false;
  }
}

/**
 * Get completion status for all sections in a paper
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

  for (const section of sections) {
    const completed = await isSectionCompleted(userId, paper, section);
    completionMap.set(section, completed);
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

