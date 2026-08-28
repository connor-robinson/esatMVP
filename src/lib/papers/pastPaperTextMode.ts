/**
 * Past-paper solve/mark rendering mode.
 *
 * Official past papers (NSAA, ENGAA, TMUA, etc.) use the legacy image UI.
 * Only ESAT CAMP mocks use text + Question Bank-style panels.
 */
import type { Question } from '@/types/papers';
import { isEsatCampMockExamType } from '@/lib/papers/esatCampMocks';

/** Dev flag; does not switch the public past-papers app to text mode anymore. */
export function isPastPaperTextModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAST_PAPER_TEXT === '1';
}

/** ESAT CAMP mocks only: render stem/options as text instead of a question screenshot. */
export function shouldRenderPastPaperAsText(question: Question): boolean {
  const isEsatCampMock =
    isEsatCampMockExamType(question.examType) || Boolean(question.diagramKey);
  return (
    isEsatCampMock &&
    question.contentFormat === 'text' &&
    Boolean(question.questionStem?.trim())
  );
}

/** Question Bank-style panel layout (stem + option rows in elevated cards). */
export function usePastPaperQuestionBankLayout(question: Question): boolean {
  return isEsatCampMockExamType(question.examType);
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
