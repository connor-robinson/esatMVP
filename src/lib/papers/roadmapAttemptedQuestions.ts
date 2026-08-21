import { PAST_PAPER_QUESTION_MAP } from "@/content/pastPaperQuestionMap";
import { getQuestions } from "@/lib/supabase/questions";
import { supabase } from "@/lib/supabase/client";
import type { Question } from "@/types/papers";

export type AttemptedQuestionsContext = {
  attemptedKeys: Set<string>;
  attemptedDuplicateGroups: Set<string>;
};

export function questionAttemptKey(q: {
  examName: string;
  examYear: number;
  paperName: string;
  questionNumber: number;
}): string {
  return `${q.examName}-${q.examYear}-${q.paperName}-${q.questionNumber}`;
}

const DUPLICATE_GROUP_BY_KEY = new Map<string, string>();

for (const entry of PAST_PAPER_QUESTION_MAP) {
  const sectionMatch = entry.paper.match(/Section (\d)/i);
  const paperName = sectionMatch
    ? `Section ${sectionMatch[1]}`
    : entry.paper;
  const key = `${entry.exam}-${entry.year}-${paperName}-${entry.questionNumber}`;
  if (entry.duplicateGroupId) {
    DUPLICATE_GROUP_BY_KEY.set(key, entry.duplicateGroupId);
  }
}

function duplicateGroupForQuestion(q: Question): string | null {
  const key = questionAttemptKey(q);
  return DUPLICATE_GROUP_BY_KEY.get(key) ?? null;
}

/** Load question keys the user has already attempted in completed past-paper sessions. */
export async function loadAttemptedQuestionsContext(
  userId: string,
): Promise<AttemptedQuestionsContext> {
  const attemptedKeys = new Set<string>();
  const attemptedDuplicateGroups = new Set<string>();

  try {
    const { data, error } = await supabase
      .from("paper_sessions")
      .select("paper_id, question_start, question_end")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .not("paper_id", "is", null);

    if (error || !data?.length) {
      return { attemptedKeys, attemptedDuplicateGroups };
    }

    const rows = data as Array<{
      paper_id: number | null;
      question_start: number | null;
      question_end: number | null;
    }>;

    const sessionsByPaperId = new Map<
      number,
      Array<{ start: number; end: number }>
    >();

    for (const session of rows) {
      const paperId = session.paper_id;
      const start = session.question_start;
      const end = session.question_end;
      if (!paperId || !start || !end) continue;

      const ranges = sessionsByPaperId.get(paperId) ?? [];
      ranges.push({ start, end });
      sessionsByPaperId.set(paperId, ranges);
    }

    for (const [paperId, ranges] of sessionsByPaperId) {
      const questions = await getQuestions(paperId);
      for (const q of questions) {
        const inRange = ranges.some(
          (r) =>
            q.questionNumber >= r.start && q.questionNumber <= r.end,
        );
        if (!inRange) continue;

        const key = questionAttemptKey(q);
        attemptedKeys.add(key);

        const group = duplicateGroupForQuestion(q);
        if (group) {
          attemptedDuplicateGroups.add(group);
        }
      }
    }
  } catch {
    // Non-fatal - session can still start with full question set.
  }

  return { attemptedKeys, attemptedDuplicateGroups };
}

/** Keep only questions the user has not attempted (and whose duplicate group is unused). */
export function filterToUniqueQuestionsOnly(
  questions: Question[],
  ctx: AttemptedQuestionsContext,
): Question[] {
  return questions.filter((q) => {
    const key = questionAttemptKey(q);
    if (ctx.attemptedKeys.has(key)) return false;

    const group = duplicateGroupForQuestion(q);
    if (group && ctx.attemptedDuplicateGroups.has(group)) {
      return false;
    }

    return true;
  });
}
