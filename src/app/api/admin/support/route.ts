import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { sendPersonalInboxMessage } from "@/lib/inbox";

export const dynamic = "force-dynamic";

const SUPPORT_STATUSES = new Set([
  "open",
  "in_progress",
  "resolved",
  "closed",
  "spam",
]);

function parseLegacyDescription(description: string): {
  subject: string;
  reply_email: string | null;
  message: string;
} {
  const lines = description.split(/\r?\n/);
  let subject = "Legacy help report";
  let reply_email: string | null = null;
  const bodyLines: string[] = [];

  for (const line of lines) {
    const subjectMatch = /^Subject:\s*(.*)$/i.exec(line.trim());
    if (subjectMatch) {
      subject = subjectMatch[1].trim() || subject;
      continue;
    }
    const contactMatch = /^Contact:\s*(.*)$/i.exec(line.trim());
    if (contactMatch) {
      const email = contactMatch[1].trim();
      reply_email = email || null;
      continue;
    }
    bodyLines.push(line);
  }

  return {
    subject,
    reply_email,
    message: bodyLines.join("\n").trim() || description,
  };
}

/**
 * GET /api/admin/support
 * Unified list: Help launcher tickets + legacy /help bug reports.
 */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const status = request.nextUrl.searchParams.get("status") ?? "open";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "80");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 150)
    : 80;

  let supportQuery = admin.service
    .from("support_requests")
    .select(
      "id, user_id, reply_email, category, subject, message, page_url, status, email_delivery_status, created_at, context",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  let legacyQuery = admin.service
    .from("app_bug_reports")
    .select("id, user_id, description, page_url, user_agent, created_at, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    supportQuery = supportQuery.eq("status", status);
    legacyQuery = legacyQuery.eq("status", status);
  }

  const [supportRes, legacyRes] = await Promise.all([supportQuery, legacyQuery]);

  if (supportRes.error) {
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
  if (legacyRes.error) {
    return NextResponse.json(
      { error: "Failed to load legacy bug reports" },
      { status: 500 },
    );
  }

  const userIds = [
    ...new Set(
      [
        ...(supportRes.data ?? []).map((r) => r.user_id),
        ...(legacyRes.data ?? []).map((r) => r.user_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const profileById = new Map<
    string,
    { username: string | null; email: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await admin.service
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id, {
        username: p.username ?? null,
        email: p.email ?? null,
      });
    }
  }

  const ticketIds = (supportRes.data ?? []).map((r) => r.id);
  const legacyIds = (legacyRes.data ?? []).map((r) => r.id);

  const replyCountBySupport = new Map<string, number>();
  const replyCountByLegacy = new Map<string, number>();

  if (ticketIds.length > 0 || legacyIds.length > 0) {
    const orParts: string[] = [];
    if (ticketIds.length > 0) {
      orParts.push(`support_request_id.in.(${ticketIds.join(",")})`);
    }
    if (legacyIds.length > 0) {
      orParts.push(`legacy_bug_report_id.in.(${legacyIds.join(",")})`);
    }
    const { data: linked } = await admin.service
      .from("inbox_messages")
      .select("id, support_request_id, legacy_bug_report_id, direction")
      .or(orParts.join(","));

    for (const row of linked ?? []) {
      if (row.support_request_id) {
        replyCountBySupport.set(
          row.support_request_id,
          (replyCountBySupport.get(row.support_request_id) ?? 0) + 1,
        );
      }
      if (row.legacy_bug_report_id) {
        replyCountByLegacy.set(
          row.legacy_bug_report_id,
          (replyCountByLegacy.get(row.legacy_bug_report_id) ?? 0) + 1,
        );
      }
    }
  }

  const rows = (supportRes.data ?? []).map((row) => {
    const profile = row.user_id ? profileById.get(row.user_id) : null;
    return {
      ...row,
      source: "support" as const,
      username: profile?.username ?? null,
      profile_email: profile?.email ?? null,
      inbox_replies: replyCountBySupport.get(row.id) ?? 0,
      can_inbox_reply: Boolean(row.user_id),
    };
  });

  const legacyRows = (legacyRes.data ?? []).map((row) => {
    const parsed = parseLegacyDescription(String(row.description ?? ""));
    const profile = row.user_id ? profileById.get(row.user_id) : null;
    return {
      id: row.id,
      user_id: row.user_id,
      reply_email: parsed.reply_email ?? profile?.email ?? "",
      category: "legacy_help",
      subject: parsed.subject,
      message: parsed.message,
      page_url: row.page_url,
      status: row.status ?? "open",
      email_delivery_status: "n/a",
      created_at: row.created_at,
      context: row.user_agent ? { user_agent: row.user_agent } : null,
      source: "legacy_bug" as const,
      username: profile?.username ?? null,
      profile_email: profile?.email ?? null,
      inbox_replies: replyCountByLegacy.get(row.id) ?? 0,
      can_inbox_reply: Boolean(row.user_id),
      raw_description: row.description,
    };
  });

  const tickets = [...rows, ...legacyRows].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return NextResponse.json({ tickets, rows, legacyRows });
}

/**
 * PATCH /api/admin/support
 * Update ticket status (Mark as resolved / reopen / …).
 * Body: { source: 'support'|'legacy_bug', id, status }
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
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
    source?: unknown;
    id?: unknown;
    status?: unknown;
  };
  const source = body.source === "legacy_bug" ? "legacy_bug" : body.source === "support" ? "support" : null;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";

  if (!source || !id || !SUPPORT_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
  }

  if (source === "support") {
    const { error } = await admin.service
      .from("support_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
    }
  } else {
    const { error } = await admin.service
      .from("app_bug_reports")
      .update({ status })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Failed to update legacy report" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id, status, source });
}

/**
 * POST /api/admin/support
 * Reply to a ticket by sending a personal inbox message to the user.
 * Body: { source, id, body, markResolved?: boolean }
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
    source?: unknown;
    id?: unknown;
    body?: unknown;
    markResolved?: unknown;
  };

  const source =
    body.source === "legacy_bug"
      ? "legacy_bug"
      : body.source === "support"
        ? "support"
        : null;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const messageBody =
    typeof body.body === "string" ? body.body.trim() : "";
  const markResolved = body.markResolved === true;

  if (!source || !id || messageBody.length < 1) {
    return NextResponse.json(
      { error: "Ticket id and reply body are required" },
      { status: 400 },
    );
  }
  if (messageBody.length > 10000) {
    return NextResponse.json({ error: "Reply is too long" }, { status: 400 });
  }

  let userId: string | null = null;
  let subject = "Support reply";

  if (source === "support") {
    const { data: ticket, error } = await admin.service
      .from("support_requests")
      .select("id, user_id, subject")
      .eq("id", id)
      .maybeSingle();
    if (error || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    userId = ticket.user_id;
    subject = `Re: ${ticket.subject}`;
  } else {
    const { data: ticket, error } = await admin.service
      .from("app_bug_reports")
      .select("id, user_id, description")
      .eq("id", id)
      .maybeSingle();
    if (error || !ticket) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    userId = ticket.user_id;
    const parsed = parseLegacyDescription(String(ticket.description ?? ""));
    subject = `Re: ${parsed.subject}`;
  }

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "This ticket has no linked account. Reply by email instead.",
      },
      { status: 400 },
    );
  }

  const sent = await sendPersonalInboxMessage({
    service: admin.service,
    adminUserId: admin.userId,
    recipientUserId: userId,
    subject,
    body: messageBody,
    supportRequestId: source === "support" ? id : null,
    legacyBugReportId: source === "legacy_bug" ? id : null,
    allowReply: true,
  });

  if ("error" in sent) {
    return NextResponse.json({ error: sent.error }, { status: 500 });
  }

  const nextStatus = markResolved ? "resolved" : "in_progress";
  if (source === "support") {
    await admin.service
      .from("support_requests")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
  } else {
    await admin.service
      .from("app_bug_reports")
      .update({ status: nextStatus })
      .eq("id", id);
  }

  return NextResponse.json({
    ok: true,
    messageId: sent.id,
    status: nextStatus,
  });
}
