/**
 * Client: map raw question-bank tags to ESAT curriculum titles (fallback for filters).
 */

import { labelForEsatTag } from './esatTagCanonicalize';

export function labelForQuestionBankTag(raw: string, subject?: string): string {
  return labelForEsatTag(raw, { subject });
}
