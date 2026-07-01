import { NextRequest, NextResponse } from 'next/server';
import { requireRouteUser } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

const MIN_LENGTH = 3;
const MAX_LENGTH = 2000;

function normalizeDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < MIN_LENGTH) return null;
  return trimmed.slice(0, MAX_LENGTH);
}

/**
 * POST /api/support/bug-report
 * Submit a bug report from settings. Requires auth.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { description?: unknown; pageUrl?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const description = normalizeDescription(body.description);
    if (!description) {
      return NextResponse.json(
        { error: 'Please describe the issue (at least 3 characters)' },
        { status: 400 },
      );
    }

    const pageUrl =
      typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 500) : null;
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

    const { error: insertError } = await (supabase as any)
      .from('app_bug_reports')
      .insert({
        user_id: user.id,
        description,
        page_url: pageUrl,
        user_agent: userAgent,
      });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
