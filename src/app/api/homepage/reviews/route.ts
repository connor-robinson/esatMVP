import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const MIN_LENGTH = 8;
const MAX_LENGTH = 1200;

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireRouteUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body && "review" in body
      ? (body as { review?: unknown }).review
      : null;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Review required" }, { status: 400 });
  }

  const review = raw.trim().slice(0, MAX_LENGTH);
  if (review.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `Write at least ${MIN_LENGTH} characters` },
      { status: 400 },
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const recipientEmail =
    process.env.SUPPORT_INBOX_EMAIL ||
    process.env.BUG_REPORT_EMAIL ||
    process.env.FEEDBACK_REFERRAL_NOTIFY_EMAIL;
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL || "ESAT CAMP <onboarding@resend.dev>";

  if (!resendApiKey || !recipientEmail) {
    console.warn(
      "[homepage/reviews] Email not configured; accepting review without send",
      { userId: user.id, length: review.length },
    );
    return NextResponse.json({ ok: true, queued: false });
  }

  const emailBody = [
    "Homepage review submission",
    "",
    `User ID: ${user.id}`,
    `Email: ${user.email ?? "(none)"}`,
    `Timestamp: ${new Date().toISOString()}`,
    "",
    "Review:",
    review,
  ].join("\n");

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipientEmail],
      subject: "[ESAT Camp] Homepage review",
      text: emailBody,
      ...(user.email ? { reply_to: user.email } : {}),
    }),
  });

  if (!emailResponse.ok) {
    const detail = await emailResponse.text().catch(() => "");
    console.error(
      "[homepage/reviews] Resend failed",
      emailResponse.status,
      detail,
    );
    return NextResponse.json({ error: "Could not send review" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, queued: true });
}
