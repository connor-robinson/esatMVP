import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  SUBJECT_TEST_TYPE,
  subjectMatchesTestType,
} from '@/lib/questionBank/subjectTestTypes';
import { applyPublishedQuestionBankFilter } from '@/lib/questionBank/libraryFilterServer';
import type { SubjectFilter } from '@/types/questionBank';

export const dynamic = 'force-dynamic';

const ATTEMPT_ID_CHUNK = 150;

type SubjectProgress = { attempted: number; total: number };

async function countQuestionsForSubject(
  supabase: ReturnType<typeof createServerClient>,
  subject: string,
  testType: 'ESAT' | 'TMUA' | null,
): Promise<number> {
  let countQuery = applyPublishedQuestionBankFilter(
    supabase.from('ai_generated_questions').select('id', { count: 'exact', head: true }),
  ).eq('subjects', subject);

  if (testType) {
    countQuery = countQuery.eq('test_type', testType);
  }

  const { count, error } = await countQuery;
  if (error) {
    return 0;
  }
  return count ?? 0;
}

/** One round-trip for home tiles: per-subject totals + shared attempt scan. */
async function getPerSubjectProgress(
  supabase: ReturnType<typeof createServerClient>,
  subjects: string[],
  isAuthenticated: boolean,
  sessionUserId: string | undefined,
): Promise<{
  bySubject: Record<string, SubjectProgress>;
  attempted: number;
  total: number;
}> {
  const bySubject: Record<string, SubjectProgress> = {};
  let total = 0;

  const totals = await Promise.all(
    subjects.map(async (subject) => {
      const expected =
        SUBJECT_TEST_TYPE[subject as Exclude<SubjectFilter, 'All'>];
      const subjectTotal = await countQuestionsForSubject(
        supabase,
        subject,
        expected ?? null,
      );
      return { subject, subjectTotal };
    }),
  );

  totals.forEach(({ subject, subjectTotal }) => {
    bySubject[subject] = { attempted: 0, total: subjectTotal };
    total += subjectTotal;
  });

  if (!isAuthenticated || !sessionUserId) {
    return { bySubject, attempted: 0, total };
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from('question_bank_attempts')
    .select('question_id')
    .eq('user_id', sessionUserId);

  if (attemptsError || !attempts?.length) {
    return { bySubject, attempted: 0, total };
  }

  const uniqueQuestionIds = [
    ...new Set(
      (attempts as { question_id: string }[]).map((a) => String(a.question_id)),
    ),
  ];

  const attemptedBySubject = new Map<string, Set<string>>();
  subjects.forEach((s) => attemptedBySubject.set(s, new Set()));

  for (let i = 0; i < uniqueQuestionIds.length; i += ATTEMPT_ID_CHUNK) {
    const chunk = uniqueQuestionIds.slice(i, i + ATTEMPT_ID_CHUNK);
    const { data: questionRows, error: questionError } =
      await applyPublishedQuestionBankFilter(
        supabase
          .from('ai_generated_questions')
          .select('id, subjects, test_type'),
      )
        .in('id', chunk)
        .in('subjects', subjects);

    if (questionError) {
      break;
    }

    for (const row of (questionRows ?? []) as {
      id: string;
      subjects: string;
      test_type: string | null;
    }[]) {
      const subject = row.subjects;
      if (!subjects.includes(subject)) continue;
      if (!subjectMatchesTestType(subject, row.test_type)) continue;
      attemptedBySubject.get(subject)?.add(String(row.id));
    }
  }

  let attempted = 0;
  for (const subject of subjects) {
    const n = attemptedBySubject.get(subject)?.size ?? 0;
    bySubject[subject] = {
      ...bySubject[subject]!,
      attempted: n,
    };
    attempted += n;
  }

  return { bySubject, attempted, total };
}

/**
 * GET /api/question-bank/progress
 * Returns progress stats: how many questions attempted vs total available for selected subjects
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current user (optional - we can return total for unauthenticated users)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const isAuthenticated = !sessionError && !!session;

    const { searchParams } = new URL(request.url);
    const subjectsParam = searchParams.get('subjects');
    const testTypeParam = searchParams.get('testType');
    const testType = testTypeParam && testTypeParam !== 'All' ? testTypeParam as 'ESAT' | 'TMUA' : null;
    
    if (!subjectsParam) {
      return NextResponse.json(
        { error: 'subjects parameter required' },
        { status: 400 }
      );
    }

    const subjects = subjectsParam.split(',').map(s => s?.trim()).filter(s => s && s !== 'All') as SubjectFilter[];
    const perSubject = searchParams.get('perSubject') === '1';

    if (subjects.length === 0) {
      return NextResponse.json(
        perSubject ? { attempted: 0, total: 0, bySubject: {} } : { attempted: 0, total: 0 },
      );
    }

    if (perSubject && subjects.length > 1) {
      const { bySubject, attempted, total } = await getPerSubjectProgress(
        supabase,
        subjects,
        isAuthenticated,
        session?.user.id,
      );
      const body = { attempted, total, bySubject };
      return new NextResponse(JSON.stringify(body), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      });
    }

    // Build count query - approved questions only (same as questions API)
    let countQuery = applyPublishedQuestionBankFilter(
      supabase.from('ai_generated_questions').select('id', { count: 'exact', head: true }),
    );

    if (testType) {
      countQuery = countQuery.eq('test_type', testType);
    }

    if (subjects.length === 1) {
      countQuery = countQuery.eq('subjects', subjects[0]);
    } else {
      countQuery = countQuery.in('subjects', subjects);
    }

    const { count: total, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    let attempted = 0;

    if (isAuthenticated) {
      // Fetch question IDs (same visibility as count - RLS applies)
      let idQuery = applyPublishedQuestionBankFilter(
        supabase.from('ai_generated_questions').select('id'),
      );

      if (testType) {
        idQuery = idQuery.eq('test_type', testType);
      }
      if (subjects.length === 1) {
        idQuery = idQuery.eq('subjects', subjects[0]);
      } else {
        idQuery = idQuery.in('subjects', subjects);
      }

      const { data: questions, error: questionsError } = await idQuery.limit(5000);

      if (!questionsError && questions && questions.length > 0) {
        const questionIds = new Set((questions as { id: string }[]).map((q) => String(q.id)));
        const questionIdArray = Array.from(questionIds);

        // Chunk to avoid PostgREST URI length limit on .in() (e.g. 150 per request)
        const CHUNK = ATTEMPT_ID_CHUNK;
        const attemptedQuestionIds = new Set<string>();
        for (let i = 0; i < questionIdArray.length; i += CHUNK) {
          const chunk = questionIdArray.slice(i, i + CHUNK);
          const { data: attempts, error: attemptsError } = await supabase
            .from('question_bank_attempts')
            .select('question_id')
            .eq('user_id', session!.user.id)
            .in('question_id', chunk);

          if (attemptsError) {
            break;
          }
          if (attempts) {
            (attempts as { question_id: string }[]).forEach((a) =>
              attemptedQuestionIds.add(String(a.question_id))
            );
          }
        }
        attempted = attemptedQuestionIds.size;
      }
    }


    const body = { attempted, total: total ?? 0 };
    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

