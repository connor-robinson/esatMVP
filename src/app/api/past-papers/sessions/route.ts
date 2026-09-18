import { NextResponse } from 'next/server';
import { requireRouteUser, getOptionalSession } from '@/lib/supabase/auth';
import { createRouteClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SessionPayload = {
  id: string;
  paperId?: number | null;
  paperName: string;
  paperVariant: string;
  sessionName: string;
  questionRange: { start: number; end: number };
  selectedSections?: string[];
  selectedPartIds?: string[]; // Part IDs for granular tracking
  questionOrder?: number[];
  timeLimitMinutes: number;
  startedAt: number;
  endedAt?: number | null;
  deadlineAt?: number | null;
  perQuestionSec: number[];
  answers: any[];
  correctFlags: (boolean | null)[];
  guessedFlags: boolean[];
  mistakeTags: string[];
  notes?: string;
  score?: { correct: number; total: number } | null;
  predictedScore?: number | null;
  sectionPercentiles?: Record<
    string,
    {
      percentile: number | null;
      score: number | null;
      table: string | null;
      label: string;
    }
  > | null;
  pinnedInsights?: any;
};

function toIso(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Date(value).toISOString()
    : null;
}

export async function POST(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  const supabase = createRouteClient();

  let payload: SessionPayload;
  try {
    payload = (await request.json()) as SessionPayload;
  } catch (parseError) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  if (!payload?.id || !payload.paperName || !payload.sessionName) {
    return NextResponse.json(
      {
        error: 'Missing required fields',
        details: 'id, paperName, and sessionName are required',
      },
      { status: 400 },
    );
  }

  // Validate questionRange since question_start and question_end are NOT NULL in database
  if (
    !payload.questionRange ||
    typeof payload.questionRange.start !== 'number' ||
    typeof payload.questionRange.end !== 'number'
  ) {
    return NextResponse.json(
      {
        error: 'Invalid questionRange',
        details: 'questionRange with start and end numbers is required',
      },
      { status: 400 },
    );
  }

  // Validate questionRange values are valid (end >= start, both positive)
  if (
    payload.questionRange.start < 1 ||
    payload.questionRange.end < payload.questionRange.start
  ) {
    return NextResponse.json(
      {
        error: 'Invalid questionRange',
        details: 'questionRange start must be >= 1 and end must be >= start',
      },
      { status: 400 },
    );
  }

  try {
    const { data: existing } = await (supabase as any)
      .from('paper_sessions')
      .select('id, deleted_at, user_id')
      .eq('id', payload.id)
      .maybeSingle();

    if (existing?.deleted_at) {
      return NextResponse.json(
        { error: 'Session was deleted', code: 'SESSION_DELETED', session: null },
        { status: 410 },
      );
    }
    if (existing && existing.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Session id already exists', code: 'SESSION_EXISTS' },
        { status: 409 },
      );
    }

    const { data, error } = await (supabase as any)
      .from('paper_sessions')
      .insert({
        id: payload.id,
        user_id: session.user.id,
        paper_id: payload.paperId ?? null,
        paper_name: payload.paperName,
        paper_variant: payload.paperVariant,
        session_name: payload.sessionName,
        question_start: payload.questionRange.start,
        question_end: payload.questionRange.end,
        selected_sections: payload.selectedSections ?? [],
        selected_part_ids: payload.selectedPartIds ?? [],
        question_order: payload.questionOrder ?? [],
        time_limit_minutes: payload.timeLimitMinutes,
        started_at: toIso(payload.startedAt),
        ended_at: toIso(payload.endedAt),
        deadline_at: toIso(payload.deadlineAt),
        per_question_seconds: payload.perQuestionSec ?? [],
        answers: payload.answers ?? [],
        correct_flags: payload.correctFlags ?? [],
        guessed_flags: payload.guessedFlags ?? [],
        mistake_tags: payload.mistakeTags ?? [],
        notes: payload.notes ?? null,
        score: payload.score ?? null,
        predicted_score: payload.predictedScore ?? null,
        section_percentiles: payload.sectionPercentiles ?? null,
        pinned_insights: payload.pinnedInsights ?? null,
      })
      .select('*')
      .single();

    if (error) {
      // Soft-deleted row still occupies the primary key.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Session was deleted', code: 'SESSION_DELETED', session: null },
          { status: 410 },
        );
      }
      return NextResponse.json(
        {
          error: 'Failed to create session',
          details: error.message,
          code: error.code,
          hint: error.hint,
          // Include more debugging info in development
          ...(process.env.NODE_ENV === 'development' && {
            errorDetails: error.details,
            errorFull: JSON.stringify(error, null, 2),
          }),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ session: data });
  } catch (insertError: any) {
    return NextResponse.json(
      {
        error: 'Failed to create session',
        details: insertError?.message || 'Unknown error',
        // Include more debugging info in development
        ...(process.env.NODE_ENV === 'development' && {
          errorName: insertError?.name,
          errorStack: insertError?.stack,
        }),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  const supabase = createRouteClient();

  const payload = (await request.json()) as SessionPayload;
  if (!payload?.id) {
    return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
  }

  // Build partial update - only include fields that are explicitly provided.
  // This ensures "quit session" (which sends only { id, endedAt }) updates only ended_at,
  // avoiding overwriting NOT NULL columns (paper_name, question_start, etc.) with null.
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.paperId !== undefined) updates.paper_id = payload.paperId ?? null;
  if (payload.paperName !== undefined) updates.paper_name = payload.paperName;
  if (payload.paperVariant !== undefined)
    updates.paper_variant = payload.paperVariant;
  if (payload.sessionName !== undefined)
    updates.session_name = payload.sessionName;
  if (payload.questionRange !== undefined) {
    updates.question_start = payload.questionRange.start ?? null;
    updates.question_end = payload.questionRange.end ?? null;
  }
  if (payload.selectedSections !== undefined)
    updates.selected_sections = payload.selectedSections ?? [];
  if (payload.selectedPartIds !== undefined)
    updates.selected_part_ids = payload.selectedPartIds ?? [];
  if (payload.questionOrder !== undefined)
    updates.question_order = payload.questionOrder ?? [];
  if (payload.timeLimitMinutes !== undefined)
    updates.time_limit_minutes = payload.timeLimitMinutes;
  if (payload.startedAt !== undefined)
    updates.started_at = toIso(payload.startedAt);
  if (payload.endedAt !== undefined) updates.ended_at = toIso(payload.endedAt);
  if (payload.deadlineAt !== undefined)
    updates.deadline_at = toIso(payload.deadlineAt);
  if (payload.perQuestionSec !== undefined)
    updates.per_question_seconds = payload.perQuestionSec ?? [];
  if (payload.answers !== undefined) updates.answers = payload.answers ?? [];
  if (payload.correctFlags !== undefined)
    updates.correct_flags = payload.correctFlags ?? [];
  if (payload.guessedFlags !== undefined)
    updates.guessed_flags = payload.guessedFlags ?? [];
  if (payload.mistakeTags !== undefined)
    updates.mistake_tags = payload.mistakeTags ?? [];
  if (payload.notes !== undefined) updates.notes = payload.notes ?? null;
  if (payload.score !== undefined) updates.score = payload.score ?? null;
  if (payload.predictedScore !== undefined)
    updates.predicted_score = payload.predictedScore ?? null;
  if (payload.sectionPercentiles !== undefined)
    updates.section_percentiles = payload.sectionPercentiles ?? null;
  if (payload.pinnedInsights !== undefined)
    updates.pinned_insights = payload.pinnedInsights ?? null;

  const { data, error } = await (supabase as any)
    .from('paper_sessions')
    .update(updates)
    .eq('id', payload.id)
    .eq('user_id', session.user.id)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update session', details: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    const { data: existing } = await (supabase as any)
      .from('paper_sessions')
      .select('id, deleted_at')
      .eq('id', payload.id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (existing?.deleted_at) {
      return NextResponse.json(
        { session: null, deleted: true, code: 'SESSION_DELETED' },
        { status: 410 },
      );
    }
  }

  return NextResponse.json({ session: data ?? null });
}

export async function GET(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  const supabase = createRouteClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const inProgress = searchParams.get('in_progress') === 'true';

  if (id) {
    const { data, error } = await (supabase as any)
      .from('paper_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load session' },
        { status: 500 },
      );
    }

    return NextResponse.json({ session: data ?? null });
  }

  // Build query
  let query = (supabase as any)
    .from('paper_sessions')
    .select('*')
    .eq('user_id', session.user.id)
    .is('deleted_at', null);

  // Filter for in-progress sessions (ended_at IS NULL)
  if (inProgress) {
    query = query.is('ended_at', null);
  }

  query = query.order('started_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load sessions' },
      { status: 500 },
    );
  }

  const sessions = Array.isArray(data) ? [...data] : [];

  // Re-score ended sittings from the answer key and fill ESAT predicted_score.
  try {
    const { autoScoreSessionRow } = await import(
      '@/lib/papers/autoScoreSessionRow'
    );
    const { predictEsatScoreFromAccuracy } = await import(
      '@/lib/papers/predictEsatFromAccuracy'
    );
    const { fetchConversionRowsForTables } = await import(
      '@/lib/scoreConverter/fetchConversionRows.server'
    );

    type SessionRow = {
      id: string;
      ended_at?: string | null;
      paper_id?: number | null;
      answers?: unknown;
      correct_flags?: unknown;
      score?: { correct?: number; total?: number } | null;
      predicted_score?: number | null;
      selected_sections?: string[] | null;
    };

    const needsAutoScore = (row: SessionRow) => {
      if (!row?.ended_at || row.paper_id == null) return false;
      const answers = Array.isArray(row.answers) ? row.answers : [];
      const hasChoice = answers.some(
        (a: { choice?: string | null }) =>
          a?.choice != null && String(a.choice).trim() !== '',
      );
      if (!hasChoice) return false;
      const flags = Array.isArray(row.correct_flags) ? row.correct_flags : [];
      const score = row.score;
      return (
        flags.length === 0 ||
        flags.every((f: unknown) => f == null) ||
        (score != null && score.correct === 0)
      );
    };

    const needsPredicted = (row: SessionRow) => {
      if (!row?.ended_at || row.paper_id == null) return false;
      if (
        typeof row.predicted_score === 'number' &&
        Number.isFinite(row.predicted_score)
      ) {
        return false;
      }
      const score = row.score;
      return (
        score != null &&
        typeof score.correct === 'number' &&
        typeof score.total === 'number' &&
        Number.isFinite(score.correct) &&
        Number.isFinite(score.total) &&
        score.total > 0
      );
    };

    const paperIdsForKeys = [
      ...new Set(
        sessions
          .filter(needsAutoScore)
          .map((row: SessionRow) => row.paper_id)
          .filter((id: number | null | undefined): id is number => id != null),
      ),
    ];

    const questionsByPaper = new Map<
      number,
      Array<{ question_number: number; answer_letter: string | null }>
    >();

    if (paperIdsForKeys.length > 0) {
      const { data: questionRows } = await (supabase as any)
        .from('questions')
        .select('paper_id, question_number, answer_letter')
        .in('paper_id', paperIdsForKeys)
        .order('question_number', { ascending: true });

      for (const q of questionRows || []) {
        const pid = q.paper_id as number;
        if (!questionsByPaper.has(pid)) questionsByPaper.set(pid, []);
        questionsByPaper.get(pid)!.push({
          question_number: q.question_number,
          answer_letter: q.answer_letter,
        });
      }
    }

    for (let i = 0; i < sessions.length; i++) {
      const row = sessions[i] as SessionRow;
      if (!needsAutoScore(row) || row.paper_id == null) continue;
      const paperQuestions = questionsByPaper.get(row.paper_id);
      if (!paperQuestions?.length) continue;
      const result = autoScoreSessionRow(row, paperQuestions);
      if (!result?.changed) continue;
      sessions[i] = {
        ...row,
        correct_flags: result.correct_flags,
        score: result.score,
      };
    }

    const paperIdsForPredicted = [
      ...new Set(
        sessions
          .filter(needsPredicted)
          .map((row: SessionRow) => row.paper_id)
          .filter((id: number | null | undefined): id is number => id != null),
      ),
    ];

    const conversionByPaper = new Map<
      number,
      import('@/types/papers').ConversionRow[]
    >();

    if (paperIdsForPredicted.length > 0) {
      const { data: papers } = await (supabase as any)
        .from('papers')
        .select('id, conversion_tables(id)')
        .in('id', paperIdsForPredicted);

      const tableIdToPaper = new Map<number, number>();
      const tableIds: number[] = [];

      for (const paper of papers || []) {
        const tables = paper.conversion_tables as
          | { id: number }
          | { id: number }[]
          | null;
        const list = Array.isArray(tables)
          ? tables
          : tables
            ? [tables]
            : [];
        for (const table of list) {
          if (typeof table?.id !== 'number') continue;
          tableIds.push(table.id);
          tableIdToPaper.set(table.id, paper.id as number);
        }
      }

      if (tableIds.length > 0) {
        const records = await fetchConversionRowsForTables(supabase, tableIds);
        for (const record of records) {
          const paperId = tableIdToPaper.get(record.table_id);
          if (paperId == null) continue;
          if (!conversionByPaper.has(paperId)) {
            conversionByPaper.set(paperId, []);
          }
          conversionByPaper.get(paperId)!.push({
            id: 0,
            tableId: record.table_id,
            partName: record.part_name,
            rawScore: record.raw_score,
            scaledScore: record.scaled_score,
            createdAt: '',
            updatedAt: '',
          });
        }
      }
    }

    const backfills: Array<{
      id: string;
      correct_flags?: (boolean | null)[];
      score?: { correct: number; total: number };
      predicted_score?: number | null;
    }> = [];

    for (let i = 0; i < sessions.length; i++) {
      const original = (Array.isArray(data) ? data[i] : null) as SessionRow | null;
      const row = sessions[i] as SessionRow;
      if (!row?.ended_at || row.paper_id == null) continue;

      let predicted =
        typeof row.predicted_score === 'number' &&
        Number.isFinite(row.predicted_score)
          ? row.predicted_score
          : null;

      if (predicted == null && needsPredicted(row)) {
        const conversionRows = conversionByPaper.get(row.paper_id) ?? [];
        predicted = predictEsatScoreFromAccuracy(
          row.score,
          row.selected_sections,
          conversionRows,
        );
        if (predicted != null) {
          sessions[i] = { ...row, predicted_score: predicted };
        }
      }

      const scored = sessions[i] as SessionRow;
      const flagsChanged =
        original != null &&
        JSON.stringify(original.correct_flags ?? null) !==
          JSON.stringify(scored.correct_flags ?? null);
      const scoreChanged =
        original != null &&
        JSON.stringify(original.score ?? null) !==
          JSON.stringify(scored.score ?? null);
      const predictedChanged =
        predicted != null &&
        (typeof original?.predicted_score !== 'number' ||
          original.predicted_score !== predicted);

      if (!flagsChanged && !scoreChanged && !predictedChanged) continue;

      const update: {
        id: string;
        correct_flags?: (boolean | null)[];
        score?: { correct: number; total: number };
        predicted_score?: number | null;
      } = { id: row.id };

      if (flagsChanged || scoreChanged) {
        update.correct_flags = scored.correct_flags as (boolean | null)[];
        update.score = scored.score as { correct: number; total: number };
      }
      if (predictedChanged) {
        update.predicted_score = predicted;
      }
      backfills.push(update);
    }

    if (backfills.length > 0) {
      void Promise.all(
        backfills.map((item) => {
          const patch: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          if (item.correct_flags !== undefined) {
            patch.correct_flags = item.correct_flags;
          }
          if (item.score !== undefined) {
            patch.score = item.score;
          }
          if (item.predicted_score !== undefined) {
            patch.predicted_score = item.predicted_score;
          }
          return (supabase as any)
            .from('paper_sessions')
            .update(patch)
            .eq('id', item.id)
            .eq('user_id', session.user.id)
            .is('deleted_at', null);
        }),
      ).catch(() => {});
    }
  } catch {
    // fail-soft
  }

  return NextResponse.json({ sessions });
}

export async function DELETE(request: Request) {
  const session = await getOptionalSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  const supabase = createRouteClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const deletedAt = new Date().toISOString();

  // Soft-delete one session (history trash) or all sessions for this user.
  let query = (supabase as any)
    .from('paper_sessions')
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('user_id', session.user.id)
    .is('deleted_at', null);

  if (id) {
    query = query.eq('id', id);
  }

  const { data, error } = await query.select('id');

  if (error) {
    return NextResponse.json(
      { error: id ? 'Failed to delete session' : 'Failed to delete sessions' },
      { status: 500 },
    );
  }

  const deletedIds = Array.isArray(data)
    ? data.map((row: { id: string }) => row.id).filter(Boolean)
    : [];

  return NextResponse.json({
    success: true,
    deletedIds,
    message: id ? 'Session deleted' : 'All sessions deleted',
  });
}
