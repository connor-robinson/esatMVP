import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { sendPersonalInboxMessage } from "@/lib/inbox";
import { INBOX_LIMITS } from "@/lib/inbox/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inbox/reply
 * Reply in-thread to a student inbound inbox message.
 * Body: { inboundMessageId, body, markResolved?: boolean }
 */
export async function POST(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service || !admin.userId) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = (raw ?? {}) as {
    inboundMessageId?: unknown;
    body?: unknown;
    markResolved?: unknown;
  };

  const inboundMessageId =
    typeof body.inboundMessageId === "string"
      ? body.inboundMessageId.trim()
      : "";
  const messageBody =
    typeof body.body === "string" ? body.body.trim() : "";
  const markResolved = body.markResolved === true;

  if (!inboundMessageId || !messageBody) {
    return NextResponse.json(
      { error: "inboundMessageId and body are required" },
      { status: 400 },
    );
  }
  if (messageBody.length > INBOX_LIMITS.bodyMax) {
    return NextResponse.json({ error: "Reply is too long" }, { status: 400 });
  }

  const { data: inbound, error: inboundError } = await admin.service
    .from("inbox_messages")
    .select(
      "id, subject, direction, parent_id, created_by, support_request_id, legacy_bug_report_id",
    )
    .eq("id", inboundMessageId)
    .maybeSingle();

  if (inboundError || !inbound) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (inbound.direction !== "inbound") {
    return NextResponse.json(
      { error: "Can only reply to student messages" },
      { status: 400 },
    );
  }

  const rootId = (inbound.parent_id as string | null) ?? (inbound.id as string);
  const { data: root, error: rootError } = await admin.service
    .from("inbox_messages")
    .select(
      "id, subject, support_request_id, legacy_bug_report_id, allow_reply",
    )
    .eq("id", rootId)
    .maybeSingle();

  if (rootError || !root) {
    return NextResponse.json({ error: "Thread root not found" }, { status: 404 });
  }

  const recipientUserId = inbound.created_by as string | null;
  if (!recipientUserId) {
    return NextResponse.json(
      { error: "Student account missing on this reply" },
      { status: 400 },
    );
  }

  const rootSubject = String(root.subject ?? "Support");
  const replySubject = rootSubject.startsWith("Re: ")
    ? rootSubject
    : `Re: ${rootSubject}`;

  const supportRequestId =
    (root.support_request_id as string | null) ??
    (inbound.support_request_id as string | null);
  const legacyBugReportId =
    (root.legacy_bug_report_id as string | null) ??
    (inbound.legacy_bug_report_id as string | null);

  const sent = await sendPersonalInboxMessage({
    service: admin.service,
    adminUserId: admin.userId,
    recipientUserId,
    subject: replySubject.slice(0, INBOX_LIMITS.subjectMax),
    body: messageBody,
    parentId: root.id as string,
    supportRequestId,
    legacyBugReportId,
    allowReply: true,
  });

  if ("error" in sent) {
    return NextResponse.json({ error: sent.error }, { status: 500 });
  }

  let ticketStatus: string | null = null;
  if (markResolved) {
    if (supportRequestId) {
      await admin.service
        .from("support_requests")
        .update({
          status: "resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", supportRequestId);
      ticketStatus = "resolved";
    } else if (legacyBugReportId) {
      await admin.service
        .from("app_bug_reports")
        .update({ status: "resolved" })
        .eq("id", legacyBugReportId);
      ticketStatus = "resolved";
    }
  } else if (supportRequestId) {
    await admin.service
      .from("support_requests")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", supportRequestId)
      .in("status", ["open", "resolved"]);
    ticketStatus = "in_progress";
  }

  return NextResponse.json({
    ok: true,
    messageId: sent.id,
    ticketStatus,
    supportRequestId,
    legacyBugReportId,
  });
}
