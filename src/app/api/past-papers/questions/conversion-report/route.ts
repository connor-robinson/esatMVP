import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const questionId = Number(body?.questionId);
    const reportReason = String(body?.reportReason || '').trim();

    if (!questionId || !reportReason) {
      return NextResponse.json(
        { error: 'questionId and reportReason are required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('question_conversion_reports').insert({
      question_id: questionId,
      user_id: user?.id ?? null,
      report_reason: reportReason.slice(0, 2000),
    });

    if (error) {
      // Table may not exist until migration is applied
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Conversion reports not enabled yet. Apply DB migration.' },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
