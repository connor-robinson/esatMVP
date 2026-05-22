import type { QuestionBankQuestion } from '@/types/questionBank';

/** True when the question passed AI review in the ESAT quality gate. */
export function isQualityGateVerified(question: QuestionBankQuestion): boolean {
  return (
    question.quality_gate_verdict === 'Pass' &&
    question.quality_gate_assessed_at != null
  );
}
