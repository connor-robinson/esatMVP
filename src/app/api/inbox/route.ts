import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "@/lib/tester/service";
import type {
  InboxDirection,
  InboxMessageListItem,
  InboxThreadReply,
} from "@/lib/inbox";

export const dynamic = "force-dynamic";

const MESSAGE_SELECT =
  "id, subject, body, audience, direction, parent_id, support_request_id, legacy_bug_report_id, allow_reply, created_by, created_at";

/**
 * GET /api/inbox
 * List root outbound messages visible to the user, with thread replies.
 */
export async function GET(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createTesterServiceClient();
  const unreadOnly =
    request.nextUrl.searchParams.get("unreadOnly") === "1" ||
    request.nextUrl.searchParams.get("unreadOnly") === "true";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 50;

  const [broadcastRes, personalRes, readsRes] = await Promise.all([
    service
      .from("inbox_messages")
      .select(MESSAGE_SELECT)
      .eq("audience", "broadcast")
      .eq("direction", "outbound")
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    service
      .from("inbox_message_recipients")
      .select(`message_id, inbox_messages(${MESSAGE_SELECT})`)
      .eq("user_id", user.id)
      .limit(limit * 2),
    service
      .from("inbox_message_reads")
      .select("message_id, read_at")
      .eq("user_id", user.id),
  ]);

  if (broadcastRes.error || personalRes.error || readsRes.error) {
    return NextResponse.json(
      { error: "Failed to load inbox" },
      { status: 500 },
    );
  }

  const readMap = new Map<string, string>();
  for (const row of readsRes.data ?? []) {
    readMap.set(row.message_id, row.read_at);
  }

  const byId = new Map<string, InboxMessageListItem>();

  for (const row of broadcastRes.data ?? []) {
    byId.set(row.id, {
      id: row.id,
      subject: row.subject,
      body: row.body,
      audience: "broadcast",
      direction: (row.direction as InboxDirection) || "outbound",
      parent_id: row.parent_id,
      support_request_id: row.support_request_id,
      legacy_bug_report_id: row.legacy_bug_report_id,
      allow_reply: row.allow_reply !== false,
      created_by: row.created_by,
      created_at: row.created_at,
      read_at: readMap.get(row.id) ?? null,
      replies: [],
    });
  }

  for (const row of personalRes.data ?? []) {
    const msg = row.inbox_messages as
      | Record<string, unknown>
      | null
      | Array<Record<string, unknown>>;
    const message = (Array.isArray(msg) ? msg[0] : msg) as {
      id: string;
      subject: string;
      body: string;
      audience: string;
      direction: string;
      parent_id: string | null;
      support_request_id: string | null;
      legacy_bug_report_id: string | null;
      allow_reply: boolean;
      created_by: string | null;
      created_at: string;
    } | null;
    if (!message?.id) continue;
    // Only show root outbound messages in the list (replies appear in thread).
    if (message.parent_id) continue;
    if (message.direction === "inbound") continue;

    byId.set(message.id, {
      id: message.id,
      subject: message.subject,
      body: message.body,
      audience: "personal",
      direction: (message.direction as InboxDirection) || "outbound",
      parent_id: message.parent_id,
      support_request_id: message.support_request_id,
      legacy_bug_report_id: message.legacy_bug_report_id,
      allow_reply: message.allow_reply !== false,
      created_by: message.created_by,
      created_at: message.created_at,
      read_at: readMap.get(message.id) ?? null,
      replies: [],
    });
  }

  const rootIds = Array.from(byId.keys());
  if (rootIds.length > 0) {
    const { data: replyRows } = await service
      .from("inbox_messages")
      .select("id, body, direction, created_by, created_at, parent_id")
      .in("parent_id", rootIds)
      .order("created_at", { ascending: true });

    const repliesByParent = new Map<string, InboxThreadReply[]>();
    for (const r of replyRows ?? []) {
      if (!r.parent_id) continue;
      // Users only see their own inbound replies + all outbound follow-ups in the thread.
      if (
        r.direction === "inbound" &&
        r.created_by &&
        r.created_by !== user.id
      ) {
        continue;
      }
      const list = repliesByParent.get(r.parent_id) ?? [];
      list.push({
        id: r.id,
        body: r.body,
        direction: (r.direction as InboxDirection) || "inbound",
        created_by: r.created_by,
        created_at: r.created_at,
      });
      repliesByParent.set(r.parent_id, list);
    }

    for (const [id, msg] of byId) {
      msg.replies = repliesByParent.get(id) ?? [];
    }
  }

  let messages = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (unreadOnly) {
    messages = messages.filter((m) => !m.read_at);
  }

  messages = messages.slice(0, limit);

  const allRoots = Array.from(byId.values());
  const unreadPersonalCount = allRoots.filter(
    (m) => !m.read_at && m.audience === "personal",
  ).length;
  const hasUnreadBroadcast = allRoots.some(
    (m) => !m.read_at && m.audience === "broadcast",
  );
  // Number badge = direct messages only. Broadcast / general notices use a red
  // dot and do not inflate that count.
  const unreadCount = unreadPersonalCount;

  return NextResponse.json({
    messages,
    unreadCount,
    unreadPersonalCount,
    hasUnreadBroadcast,
  });
}

/**
 * PATCH /api/inbox
 * Mark message(s) as read. Body: { messageIds: string[] } or { all: true }
 */
export async function PATCH(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = createTesterServiceClient();
  const payload = (body ?? {}) as {
    messageIds?: unknown;
    all?: unknown;
  };

  let messageIds: string[] = [];

  if (payload.all === true) {
    const [broadcastRes, personalRes, readsRes] = await Promise.all([
      service
        .from("inbox_messages")
        .select("id")
        .eq("audience", "broadcast")
        .eq("direction", "outbound")
        .is("parent_id", null),
      service
        .from("inbox_message_recipients")
        .select("message_id, inbox_messages(id, parent_id, direction)")
        .eq("user_id", user.id),
      service
        .from("inbox_message_reads")
        .select("message_id")
        .eq("user_id", user.id),
    ]);
    const readSet = new Set((readsRes.data ?? []).map((r) => r.message_id));
    const personalIds: string[] = [];
    for (const row of personalRes.data ?? []) {
      const msg = row.inbox_messages as
        | { id: string; parent_id: string | null; direction: string }
        | null
        | Array<{ id: string; parent_id: string | null; direction: string }>;
      const m = Array.isArray(msg) ? msg[0] : msg;
      if (!m?.id || m.parent_id || m.direction === "inbound") continue;
      personalIds.push(m.id);
    }
    messageIds = [
      ...new Set([
        ...(broadcastRes.data ?? []).map((r) => r.id),
        ...personalIds,
      ]),
    ].filter((id) => !readSet.has(id));
  } else if (Array.isArray(payload.messageIds)) {
    messageIds = [
      ...new Set(
        payload.messageIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ].slice(0, 100);
  } else {
    return NextResponse.json(
      { error: "Provide messageIds or all: true" },
      { status: 400 },
    );
  }

  if (messageIds.length === 0) {
    return NextResponse.json({ ok: true, marked: 0 });
  }

  const [broadcastCheck, personalCheck] = await Promise.all([
    service
      .from("inbox_messages")
      .select("id")
      .eq("audience", "broadcast")
      .in("id", messageIds),
    service
      .from("inbox_message_recipients")
      .select("message_id")
      .eq("user_id", user.id)
      .in("message_id", messageIds),
  ]);

  const allowed = new Set<string>([
    ...(broadcastCheck.data ?? []).map((r) => r.id),
    ...(personalCheck.data ?? []).map((r) => r.message_id),
  ]);
  const toMark = messageIds.filter((id) => allowed.has(id));
  if (toMark.length === 0) {
    return NextResponse.json({ ok: true, marked: 0 });
  }

  const rows = toMark.map((message_id) => ({
    message_id,
    user_id: user.id,
    read_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await service
    .from("inbox_message_reads")
    .upsert(rows, { onConflict: "message_id,user_id" });

  if (upsertError) {
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, marked: toMark.length });
}
