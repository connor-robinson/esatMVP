import { NextRequest, NextResponse } from 'next/server';
import { requireRouteUser } from '@/lib/supabase/auth';
import type { QuestionFeedbackResponse } from '@/types/questionBank';

export const dynamic = 'force-dynamic';

const MAX_REASON_LENGTH = 500;

function normalizeReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_REASON_LENGTH);
}

async function buildFeedbackResponse(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createServerClient>,
  questionId: string,
  userId: string,
): Promise<QuestionFeedbackResponse> {
  const { count } = await (supabase as any)
    .from('question_bank_dislikes')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', questionId);

  const { data: userRow } = await (supabase as any)
    .from('question_bank_dislikes')
    .select('id, reason')
    .eq('question_id', questionId)
    .eq('user_id', userId)
    .maybeSingle();

  return {
    dislikeCount: count ?? 0,
    userDisliked: !!userRow,
    userReportReason: userRow?.reason ?? null,
  };
}

/**
 * POST /api/question-bank/questions/[id]/dislike
 * Report with reason, update reason, or remove report. Requires auth.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questionId = params.id;
    if (!questionId) {
      return NextResponse.json({ error: 'Missing question id' }, { status: 400 });
    }

    let body: { reason?: unknown; remove?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const remove = body.remove === true;
    const reason = normalizeReason(body.reason);

    const { data: existing } = await (supabase as any)
      .from('question_bank_dislikes')
      .select('id')
      .eq('question_id', questionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (remove) {
      if (existing) {
        const { error: delError } = await (supabase as any)
          .from('question_bank_dislikes')
          .delete()
          .eq('question_id', questionId)
          .eq('user_id', user.id);
        if (delError) {
          return NextResponse.json(
            { error: 'Failed to remove report' },
            { status: 500 },
          );
        }
      }
    } else if (!reason) {
      return NextResponse.json(
        { error: 'A report reason is required' },
        { status: 400 },
      );
    } else if (existing) {
      const { error: updError } = await (supabase as any)
        .from('question_bank_dislikes')
        .update({ reason })
        .eq('question_id', questionId)
        .eq('user_id', user.id);
      if (updError) {
        return NextResponse.json(
          { error: 'Failed to update report' },
          { status: 500 },
        );
      }
    } else {
      const { error: insError } = await (supabase as any)
        .from('question_bank_dislikes')
        .insert({
          question_id: questionId,
          user_id: user.id,
          reason,
        });
      if (insError) {
        return NextResponse.json(
          { error: 'Failed to submit report' },
          { status: 500 },
        );
      }
    }

    const responseBody = await buildFeedbackResponse(supabase, questionId, user.id);
    return NextResponse.json(responseBody);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
