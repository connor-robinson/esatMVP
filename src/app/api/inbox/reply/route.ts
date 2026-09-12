import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "@/lib/tester/service";
import { INBOX_LIMITS } from "@/lib/inbox";

export const dynamic = "force-dynamic";

/**
 * POST /api/inbox/reply
 * User replies to an ESAT Camp outbound message.
 * Body: { parentId: string, body: string }
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = (raw ?? {}) as { parentId?: unknown; body?: unknown };
  const parentId =
    typeof payload.parentId === "string" ? payload.parentId.trim() : "";
  const body =
    typeof payload.body === "string" ? payload.body.trim() : "";

  if (!parentId || body.length < 1) {
    return NextResponse.json(
      { error: "parentId and body are required" },
      { status: 400 },
    );
  }
  if (body.length > INBOX_LIMITS.replyMax) {
    return NextResponse.json(
      { error: `Reply must be at most ${INBOX_LIMITS.replyMax} characters` },
      { status: 400 },
    );
  }

  const service = createTesterServiceClient();

  const { data: parent, error: parentError } = await service
    .from("inbox_messages")
    .select(
      "id, subject, audience, direction, allow_reply, parent_id, support_request_id, legacy_bug_report_id",
    )
    .eq("id", parentId)
    .maybeSingle();

  if (parentError || !parent) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Only reply to root outbound messages (or resolve to root if somehow nested).
  const rootId = parent.parent_id ?? parent.id;
  const { data: root, error: rootError } = parent.parent_id
    ? await service
        .from("inbox_messages")
        .select(
          "id, subject, audience, direction, allow_reply, support_request_id, legacy_bug_report_id",
        )
        .eq("id", rootId)
        .maybeSingle()
    : { data: parent, error: null };

  if (rootError || !root) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  if (root.direction !== "outbound") {
    return NextResponse.json(
      { error: "You can only reply to messages from ESAT Camp" },
      { status: 400 },
    );
  }
  if (!root.allow_reply) {
    return NextResponse.json(
      { error: "Replies are closed on this message" },
      { status: 400 },
    );
  }

  // Must be a recipient (personal) or any user for broadcast.
  if (root.audience === "personal") {
    const { data: recip } = await service
      .from("inbox_message_recipients")
      .select("user_id")
      .eq("message_id", root.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!recip) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
  }

  const replySubject = root.subject.startsWith("Re: ")
    ? root.subject
    : `Re: ${root.subject}`;

  const { data: inserted, error: insertError } = await service
    .from("inbox_messages")
    .insert({
      subject: replySubject.slice(0, INBOX_LIMITS.subjectMax),
      body,
      audience: "personal",
      direction: "inbound",
      parent_id: root.id,
      created_by: user.id,
      allow_reply: false,
      support_request_id: root.support_request_id,
      legacy_bug_report_id: root.legacy_bug_report_id,
    })
    .select("id, subject, body, direction, created_by, created_at")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }

  // Mark parent as read for the user.
  await service.from("inbox_message_reads").upsert(
    {
      message_id: root.id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    },
    { onConflict: "message_id,user_id" },
  );

  // If linked to a support ticket, bump it back to open/in_progress for admin.
  if (root.support_request_id) {
    await service
      .from("support_requests")
      .update({
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", root.support_request_id)
      .in("status", ["resolved", "closed", "in_progress"]);
  }
  if (root.legacy_bug_report_id) {
    await service
      .from("app_bug_reports")
      .update({ status: "open" })
      .eq("id", root.legacy_bug_report_id)
      .in("status", ["resolved", "closed", "in_progress"]);
  }

  return NextResponse.json({ reply: inserted }, { status: 201 });
}
