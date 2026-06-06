import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DifficultyFilter,
  AttemptResultFilter,
  AttemptedFilter,
} from "@/types/questionBank";
import { LIBRARY_SUBJECTS } from "@/lib/questionBank/libraryQueryParams";
import { subjectMatchesTestType } from "@/lib/questionBank/subjectTestTypes";

export const LIBRARY_PAGE_SIZE = 1000;

export type LibraryFilterParams = {
  subjects: string[];
  difficulties: DifficultyFilter[];
  attemptResults: AttemptResultFilter[];
  attemptedStatus: AttemptedFilter | null;
  search: string;
  idParam: string;
  needsAttemptData: boolean;
};

export function parseLibraryFilterParams(
  searchParams: URLSearchParams,
): LibraryFilterParams {
  const subjectParam = searchParams.get("subject");
  const subjects = subjectParam
    ? subjectParam.split(",").filter(Boolean)
    : [...LIBRARY_SUBJECTS];

  const difficultyParam = searchParams.get("difficulty");
  const difficulties = difficultyParam
    ? (difficultyParam
        .split(",")
        .filter((d) => d && d !== "All") as DifficultyFilter[])
    : [];

  const attemptResultParam = searchParams.get("attemptResult");
  const attemptResults = attemptResultParam
    ? (attemptResultParam.split(",") as AttemptResultFilter[])
    : [];

  const attemptedStatusParam = searchParams.get("attemptedStatus");
  const attemptedStatus = attemptedStatusParam as AttemptedFilter | null;

  const search = searchParams.get("search") || "";
  const idParam = searchParams.get("id") || "";

  const needsAttemptData =
    (attemptedStatus && attemptedStatus !== "Mix") ||
    attemptResults.length > 0;

  return {
    subjects,
    difficulties,
    attemptResults,
    attemptedStatus,
    search,
    idParam,
    needsAttemptData,
  };
}

export type AttemptFilterContext = {
  userId: string | null;
  attemptedQuestionIds: string[];
  questionResults: Map<
    string,
    { hasCorrect: boolean; hasIncorrect: boolean }
  >;
};

export async function loadLibraryAttemptContext(
  supabase: SupabaseClient,
  needsAttemptData: boolean,
): Promise<AttemptFilterContext> {
  const empty: AttemptFilterContext = {
    userId: null,
    attemptedQuestionIds: [],
    questionResults: new Map(),
  };

  if (!needsAttemptData) return empty;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { ...empty, userId: null };

  const { data: attempts } = await supabase
    .from("question_bank_attempts")
    .select("question_id, is_correct")
    .eq("user_id", userId)
    .limit(10000);

  const attemptRows = (attempts ?? []) as Array<{
    question_id: string;
    is_correct: boolean;
  }>;

  const attemptedQuestionIds = [
    ...new Set(attemptRows.map((a) => a.question_id)),
  ];
  const questionResults = new Map<
    string,
    { hasCorrect: boolean; hasIncorrect: boolean }
  >();

  for (const a of attemptRows) {
    const existing = questionResults.get(a.question_id) || {
      hasCorrect: false,
      hasIncorrect: false,
    };
    if (a.is_correct) existing.hasCorrect = true;
    else existing.hasIncorrect = true;
    questionResults.set(a.question_id, existing);
  }

  return { userId, attemptedQuestionIds, questionResults };
}

export function applyLibraryAttemptFilters<T extends { id: string }>(
  rows: T[],
  params: Pick<
    LibraryFilterParams,
    "attemptedStatus" | "attemptResults"
  >,
  ctx: AttemptFilterContext,
): T[] {
  if (!ctx.userId) return rows;

  let filtered = rows;
  const attemptedSet = new Set(ctx.attemptedQuestionIds);

  if (params.attemptedStatus && params.attemptedStatus !== "Mix") {
    if (params.attemptedStatus === "New") {
      filtered = filtered.filter((r) => !attemptedSet.has(r.id));
    } else if (params.attemptedStatus === "Attempted") {
      filtered = filtered.filter((r) => attemptedSet.has(r.id));
    }
  }

  if (params.attemptResults.length > 0) {
    const incorrectSet = new Set(
      Array.from(ctx.questionResults.entries())
        .filter(([_, result]) => result.hasIncorrect)
        .map(([id]) => id),
    );
    const mixedResultsSet = new Set(
      Array.from(ctx.questionResults.entries())
        .filter(([_, result]) => result.hasCorrect && result.hasIncorrect)
        .map(([id]) => id),
    );

    const resultFilters: ((r: T) => boolean)[] = [];
    for (const result of params.attemptResults) {
      if (result === "Unseen") {
        resultFilters.push((r) => !attemptedSet.has(r.id));
      } else if (result === "Mixed Results") {
        resultFilters.push((r) => mixedResultsSet.has(r.id));
      } else if (result === "Incorrect Before") {
        resultFilters.push((r) => incorrectSet.has(r.id));
      }
    }

    if (resultFilters.length > 0) {
      filtered = filtered.filter((r) =>
        resultFilters.some((fn) => fn(r)),
      );
    }
  }

  return filtered;
}

/** Keep rows whose test_type matches the subject (ESAT vs TMUA). */
export function filterRowsBySubjectTestType<
  T extends { subjects: string | null; test_type?: string | null },
>(rows: T[]): T[] {
  return rows.filter((row) => {
    const subject = row.subjects?.trim();
    if (!subject) return false;
    return subjectMatchesTestType(subject, row.test_type);
  });
}

export function applyLibraryQueryFilters<
  Q extends {
    eq: (col: string, val: string) => Q;
    in: (col: string, vals: string[]) => Q;
    or: (expr: string) => Q;
    ilike: (col: string, pattern: string) => Q;
  },
>(query: Q, params: LibraryFilterParams): Q {
  let q = query;

  if (params.difficulties.length === 1) {
    q = q.eq("difficulty", params.difficulties[0]);
  } else if (params.difficulties.length > 1) {
    q = q.in("difficulty", params.difficulties);
  }

  if (params.idParam) {
    q = q.or(`generation_id.eq.${params.idParam},id.eq.${params.idParam}`);
  } else if (params.search) {
    q = q.ilike("question_stem", `%${params.search}%`);
  }

  return q;
}
