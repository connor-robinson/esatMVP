/**
 * Shared logic: map raw DB tags to curriculum titles (server + client).
 */

import {
  labelForEsatTag,
  canonicalizeEsatTag,
} from "@/lib/questionBank/esatTagCanonicalize";

type CurriculumPaper = {
  paper_id?: string;
  topics?: Array<{ code?: string; title?: string }>;
};

export function buildCodeToTitleMapFromCurriculum(
  curriculum: unknown,
): Map<string, string> {
  const m = new Map<string, string>();
  const papers = (curriculum as { papers?: CurriculumPaper[] }).papers || [];
  for (const paper of papers) {
    for (const t of paper.topics || []) {
      const code = (t.code || "").trim();
      const title = (t.title || "").trim();
      if (code && title) m.set(code.toUpperCase(), title);
    }
  }
  return m;
}

/** @deprecated Prefer labelForEsatTag from esatTagCanonicalize.ts */
export function labelForQuestionBankTagWithMap(
  raw: string,
  _codeToTitle: Map<string, string>,
  subject?: string,
): string {
  return labelForEsatTag(raw, { subject });
}

export { canonicalizeEsatTag, labelForEsatTag };
