import type { QuestionBankQuestion } from '@/types/questionBank';

/** DB status for questions visible in the student question bank. */
export const QUESTION_BANK_PUBLISH_STATUS = 'approved' as const;

/** True when the question is auto-approved and may appear in the question bank. */
export function isQuestionBankPublished(question: {
  status?: string | null;
}): boolean {
  return question.status === QUESTION_BANK_PUBLISH_STATUS;
}

/** True when the question passed AI review in the ESAT quality gate. */
export function isQualityGateVerified(question: QuestionBankQuestion): boolean {
  return (
    question.quality_gate_verdict === 'Pass' &&
    question.quality_gate_assessed_at != null
  );
}
