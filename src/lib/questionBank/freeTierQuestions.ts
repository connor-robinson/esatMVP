/** Max free preview questions per subject (each ESAT hook set). */
export const FREE_TIER_LIMIT_PER_SUBJECT = 10;

/** @deprecated Use FREE_TIER_LIMIT_PER_SUBJECT */
export const FREE_TIER_QUESTION_LIMIT = FREE_TIER_LIMIT_PER_SUBJECT;

import {
  ESAT_HOOK_PREVIEW_DB_IDS,
  ESAT_HOOK_SETS,
  hookQuestionDbId,
} from "@/lib/questionBank/esatHookSets";

export type FreeTierPreviewSubject = (typeof ESAT_HOOK_SETS)[number]["subject"];

export const FREE_TIER_PREVIEW_SUBJECTS: readonly FreeTierPreviewSubject[] =
  ESAT_HOOK_SETS.map((set) => set.subject);

export const FREE_TIER_QUESTION_IDS: readonly string[] = ESAT_HOOK_PREVIEW_DB_IDS;

export const FREE_TIER_QUESTION_ID_SET = new Set<string>(FREE_TIER_QUESTION_IDS);

const SUBJECT_IDS = new Map<FreeTierPreviewSubject, readonly string[]>(
  ESAT_HOOK_SETS.map((set) => [
    set.subject,
    set.generationIds.map(hookQuestionDbId),
  ]),
);

const QUESTION_ID_TO_SUBJECT = new Map<string, FreeTierPreviewSubject>();
for (const set of ESAT_HOOK_SETS) {
  for (const genId of set.generationIds) {
    QUESTION_ID_TO_SUBJECT.set(hookQuestionDbId(genId), set.subject);
  }
}

export function isFreeTierPreviewSubject(
  subject: string,
): subject is FreeTierPreviewSubject {
  return SUBJECT_IDS.has(subject as FreeTierPreviewSubject);
}

export function freeTierQuestionIdsForSubject(
  subject: string,
): readonly string[] {
  return SUBJECT_IDS.get(subject as FreeTierPreviewSubject) ?? [];
}

export function freeTierSubjectForQuestionId(
  questionId: string,
): FreeTierPreviewSubject | null {
  return QUESTION_ID_TO_SUBJECT.get(questionId) ?? null;
}

export function totalFreeTierLimit(): number {
  return FREE_TIER_LIMIT_PER_SUBJECT * FREE_TIER_PREVIEW_SUBJECTS.length;
}
