import { NextRequest, NextResponse } from 'next/server';
import { requireRouteUser } from '@/lib/supabase/auth';
import {
  assertCanWriteAttempts,
  insertQuestionBankAttempts,
  parseAttemptWriteInputs,
} from '@/lib/questionBank/attemptWrite';

export const dynamic = 'force-dynamic';

/**
 * POST /api/question-bank/attempts/batch
 * Persists many attempts in one round-trip (exam mode end-of-session).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = parseAttemptWriteInputs(
      Array.isArray(body) ? { attempts: body } : body,
    );
    if ('code' in parsed) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }

    const gate = await assertCanWriteAttempts(
      user.id,
      parsed.attempts.map((a) => a.question_id),
    );
    if (gate) {
      return NextResponse.json({ error: gate.message }, { status: 403 });
    }

    const { data, error: insertError } = await insertQuestionBankAttempts(
      supabase,
      user.id,
      parsed.attempts,
    );

    if (insertError) {
      return NextResponse.json(
        {
          error: 'Failed to save attempts',
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    const saved = data?.length ?? 0;
    if (saved !== parsed.attempts.length) {
      return NextResponse.json(
        {
          error: 'Failed to save all attempts',
          details: `saved ${saved} of ${parsed.attempts.length}`,
          saved,
          expected: parsed.attempts.length,
        },
        { status: 500 },
      );
    }

    try {
      const { maybeMarkPartnerActivation } = await import(
        '@/lib/partners/analytics'
      );
      const { createPartnerServiceClient } = await import(
        '@/lib/partners/service'
      );
      await maybeMarkPartnerActivation(
        createPartnerServiceClient(),
        user.id,
      );
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      saved,
      attempts: data,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
