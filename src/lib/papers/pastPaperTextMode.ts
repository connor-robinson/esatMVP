/**
 * Whether past-paper text rendering is enabled (env flag + per-question content_format).
 */
import type { Question } from '@/types/papers';

export function isPastPaperTextModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAST_PAPER_TEXT === '1';
}

export function shouldRenderPastPaperAsText(question: Question): boolean {
  return (
    isPastPaperTextModeEnabled() &&
    question.contentFormat === 'text' &&
    Boolean(question.questionStem?.trim())
  );
}

export function getPastPaperOptionLetters(question: Question): string[] {
  const fromOptions = question.options ? Object.keys(question.options).sort() : [];
  if (fromOptions.length > 0) return fromOptions;
  // Fallback: infer from exam (ENGAA S2 / NSAA S2 use A-F)
  const paper = (question.paperName || '').toLowerCase();
  if (question.examName === 'NSAA' && paper.includes('section 2')) {
    return ['A', 'B', 'C', 'D', 'E', 'F'];
  }
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
}
