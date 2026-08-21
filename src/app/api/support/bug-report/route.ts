import { NextRequest, NextResponse } from 'next/server';
import { requireRouteUser } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

const MIN_LENGTH = 3;
const MAX_LENGTH = 2000;
const MAX_SUBJECT = 120;
const MAX_EMAIL = 254;

function normalizeDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < MIN_LENGTH) return null;
  return trimmed.slice(0, MAX_LENGTH);
}

function normalizeSubject(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, MAX_SUBJECT);
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, MAX_EMAIL);
  if (!trimmed.includes('@') || trimmed.length < 5) return null;
  return trimmed;
}

async function sendSupportEmail(params: {
  subject: string | null;
  contactEmail: string | null;
  description: string;
  pageUrl: string | null;
  userId: string;
  userAgent: string | null;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  // Server-only inbox - never returned to the client or shown in UI.
  const recipientEmail =
    process.env.SUPPORT_INBOX_EMAIL || process.env.BUG_REPORT_EMAIL;
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL ||
    'ESAT CAMP Support <onboarding@resend.dev>';

  if (!resendApiKey || !recipientEmail) {
    console.warn(
      '[support/bug-report] Email not configured (RESEND_API_KEY / SUPPORT_INBOX_EMAIL|BUG_REPORT_EMAIL)',
    );
    return { ok: false, skipped: true, error: 'Email not configured' };
  }

  const subjectLine = params.subject?.trim()
    ? `[IMPORTANT] ${params.subject.trim()}`
    : '[IMPORTANT] Help & contact message';

  const emailBody = [
    'Help & contact message from ESAT CAMP',
    '',
    params.subject ? `Subject: ${params.subject}` : null,
    params.contactEmail ? `Reply-to / contact: ${params.contactEmail}` : null,
    `User ID: ${params.userId}`,
    params.pageUrl ? `Page: ${params.pageUrl}` : null,
    params.userAgent ? `User-Agent: ${params.userAgent}` : null,
    `Timestamp: ${new Date().toISOString()}`,
    '',
    'Message:',
    params.description,
  ]
    .filter(Boolean)
    .join('\n');

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipientEmail],
      ...(params.contactEmail ? { reply_to: params.contactEmail } : {}),
      subject: subjectLine,
      text: emailBody,
      headers: {
        Importance: 'high',
        'X-Priority': '1',
        Priority: 'urgent',
      },
    }),
  });

  if (!emailResponse.ok) {
    const errorData = await emailResponse.json().catch(() => ({}));
    console.error('[support/bug-report] Resend API error:', errorData);
    return { ok: false, error: 'Failed to send email' };
  }

  return { ok: true };
}

/**
 * POST /api/support/bug-report
 * Submit a bug / help / contact message. Requires auth.
 * Persists to app_bug_reports and emails the server-configured inbox.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await requireRouteUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: {
      description?: unknown;
      pageUrl?: unknown;
      subject?: unknown;
      email?: unknown;
    } = {};
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

    const subject = normalizeSubject(body.subject);
    const email = normalizeEmail(body.email) ?? user.email ?? null;

    if (body.email != null && !normalizeEmail(body.email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email' },
        { status: 400 },
      );
    }

    const pageUrl =
      typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 500) : null;
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

    const composed = [
      subject ? `Subject: ${subject}` : null,
      email ? `Contact: ${email}` : null,
      subject || email ? '' : null,
      description,
    ]
      .filter((line) => line !== null)
      .join('\n')
      .slice(0, MAX_LENGTH);

    const { error: insertError } = await (supabase as any)
      .from('app_bug_reports')
      .insert({
        user_id: user.id,
        description: composed,
        page_url: pageUrl,
        user_agent: userAgent,
      });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 },
      );
    }

    const emailResult = await sendSupportEmail({
      subject,
      contactEmail: email,
      description,
      pageUrl,
      userId: user.id,
      userAgent,
    });

    if (!emailResult.ok && !emailResult.skipped) {
      return NextResponse.json(
        { error: 'Message saved, but email delivery failed. Please try again.' },
        { status: 502 },
      );
    }

    if (emailResult.skipped) {
      return NextResponse.json(
        { error: 'Support email is not configured on the server.' },
        { status: 503 },
      );
    }

    // Never include the destination inbox in the response.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
