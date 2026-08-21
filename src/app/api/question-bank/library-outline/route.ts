import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type {
  DifficultyFilter,
  AttemptResultFilter,
  AttemptedFilter,
} from "@/types/questionBank";
import { UNTAGGED_TOPIC } from "@/lib/questionBank/libraryQueryParams";
import {
  canonicalizeEsatTag,
  labelForEsatTag,
  compareEsatTagLabels,
} from "@/lib/questionBank/esatTagCanonicalize";
import {
  applyPublishedQuestionBankFilter,
  filterRowsBySubjectTestType,
} from "@/lib/questionBank/libraryFilterServer";
import { SUBJECT_TEST_TYPE } from "@/lib/questionBank/subjectTestTypes";
import type { SubjectFilter } from "@/types/questionBank";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

type SlimRow = {
  id: string;
  primary_tag: string | null;
  schema_id: string | null;
  test_type: string | null;
  subjects: string | null;
};

function applyAttemptFilters(
  rows: SlimRow[],
  attemptedStatus: AttemptedFilter | null,
  attemptResults: AttemptResultFilter[],
  userId: string | null,
  attemptedQuestionIds: string[],
  questionResults: Map<string, { hasCorrect: boolean; hasIncorrect: boolean }>,
): SlimRow[] {
  if (!userId) return rows;

  let filtered = rows;
  const attemptedSet = new Set(attemptedQuestionIds);

  if (attemptedStatus && attemptedStatus !== "Mix") {
    if (attemptedStatus === "New") {
      filtered = filtered.filter((r) => !attemptedSet.has(r.id));
    } else if (attemptedStatus === "Attempted") {
      filtered = filtered.filter((r) => attemptedSet.has(r.id));
    }
  }

  if (attemptResults.length > 0) {
    const incorrectSet = new Set(
      Array.from(questionResults.entries())
        .filter(([_, result]) => result.hasIncorrect)
        .map(([id]) => id),
    );
    const mixedResultsSet = new Set(
      Array.from(questionResults.entries())
        .filter(([_, result]) => result.hasCorrect && result.hasIncorrect)
        .map(([id]) => id),
    );

    const resultFilters: ((r: SlimRow) => boolean)[] = [];
    for (const result of attemptResults) {
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

/**
 * GET /api/question-bank/library-outline?subject=Physics&...
 * Returns topic tag counts for one subject (lightweight - no question bodies).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const subject = searchParams.get("subject");
    if (!subject) {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 },
      );
    }

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

    let userId: string | null = null;
    if (needsAttemptData) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
    }

    let attemptedQuestionIds: string[] = [];
    const questionResults = new Map<
      string,
      { hasCorrect: boolean; hasIncorrect: boolean }
    >();

    if (needsAttemptData && userId) {
      const { data: attempts } = await supabase
        .from("question_bank_attempts")
        .select("question_id, is_correct")
        .eq("user_id", userId)
        .limit(10000);

      const attemptRows = (attempts ?? []) as Array<{
        question_id: string;
        is_correct: boolean;
      }>;

      if (attemptRows.length) {
        attemptedQuestionIds = [
          ...new Set(attemptRows.map((a) => a.question_id)),
        ];
        for (const a of attemptRows) {
          const existing = questionResults.get(a.question_id) || {
            hasCorrect: false,
            hasIncorrect: false,
          };
          if (a.is_correct) existing.hasCorrect = true;
          else existing.hasIncorrect = true;
          questionResults.set(a.question_id, existing);
        }
      }
    }

    const rows: SlimRow[] = [];
    let offset = 0;

    for (;;) {
      let query = applyPublishedQuestionBankFilter(
        supabase
          .from("ai_generated_questions")
          .select("id, primary_tag, schema_id, test_type, subjects"),
      )
        .eq("subjects", subject)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      const expectedTestType =
        SUBJECT_TEST_TYPE[subject as Exclude<SubjectFilter, "All">];
      if (expectedTestType) {
        query = query.eq("test_type", expectedTestType);
      }

      if (difficulties.length === 1) {
        query = query.eq("difficulty", difficulties[0]);
      } else if (difficulties.length > 1) {
        query = query.in("difficulty", difficulties);
      }

      if (idParam) {
        query = query.or(`generation_id.eq.${idParam},id.eq.${idParam}`);
      } else if (search) {
        query = query.ilike("question_stem", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json(
          { error: "Failed to load outline" },
          { status: 500 },
        );
      }

      const batch = (data ?? []) as SlimRow[];
      if (batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const filtered = filterRowsBySubjectTestType(
      applyAttemptFilters(
        rows,
        attemptedStatus,
        attemptResults,
        userId,
        attemptedQuestionIds,
        questionResults,
      ),
    );

    const tagCounts = new Map<string, number>();
    for (const row of filtered) {
      const canonical = canonicalizeEsatTag(row.primary_tag, {
        subject,
        schemaId: row.schema_id ?? undefined,
      });
      tagCounts.set(canonical, (tagCounts.get(canonical) ?? 0) + 1);
    }

    const tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({
        tag,
        label: labelForEsatTag(tag, { subject }),
        count,
      }))
      .sort((a, b) =>
        a.tag === UNTAGGED_TOPIC
          ? 1
          : b.tag === UNTAGGED_TOPIC
            ? -1
            : compareEsatTagLabels(a.tag, b.tag, { subject }),
      );

    return NextResponse.json({
      subject,
      total: filtered.length,
      tags,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load outline" },
      { status: 500 },
    );
  }
}
