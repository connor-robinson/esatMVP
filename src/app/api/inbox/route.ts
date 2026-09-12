import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "@/lib/tester/service";
import type { InboxMessageListItem } from "@/lib/inbox";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox
 * List messages visible to the signed-in user (broadcasts + personal).
 * Query: ?unreadOnly=1, ?limit=50
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
      .select("id, subject, body, audience, created_by, created_at")
      .eq("audience", "broadcast")
      .order("created_at", { ascending: false })
      .limit(limit),
    service
      .from("inbox_message_recipients")
      .select(
        "message_id, inbox_messages(id, subject, body, audience, created_by, created_at)",
      )
      .eq("user_id", user.id)
      .limit(limit),
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
      ...row,
      audience: row.audience as "broadcast",
      read_at: readMap.get(row.id) ?? null,
    });
  }

  for (const row of personalRes.data ?? []) {
    const msg = row.inbox_messages as
      | {
          id: string;
          subject: string;
          body: string;
          audience: string;
          created_by: string | null;
          created_at: string;
        }
      | null
      | Array<{
          id: string;
          subject: string;
          body: string;
          audience: string;
          created_by: string | null;
          created_at: string;
        }>;
    const message = Array.isArray(msg) ? msg[0] : msg;
    if (!message?.id) continue;
    byId.set(message.id, {
      id: message.id,
      subject: message.subject,
      body: message.body,
      audience: "personal",
      created_by: message.created_by,
      created_at: message.created_at,
      read_at: readMap.get(message.id) ?? null,
    });
  }

  let messages = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (unreadOnly) {
    messages = messages.filter((m) => !m.read_at);
  }

  messages = messages.slice(0, limit);
  const unreadCount = Array.from(byId.values()).filter((m) => !m.read_at)
    .length;

  return NextResponse.json({ messages, unreadCount });
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
      service.from("inbox_messages").select("id").eq("audience", "broadcast"),
      service
        .from("inbox_message_recipients")
        .select("message_id")
        .eq("user_id", user.id),
      service
        .from("inbox_message_reads")
        .select("message_id")
        .eq("user_id", user.id),
    ]);
    const readSet = new Set((readsRes.data ?? []).map((r) => r.message_id));
    messageIds = [
      ...new Set([
        ...(broadcastRes.data ?? []).map((r) => r.id),
        ...(personalRes.data ?? []).map((r) => r.message_id),
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

  // Ensure the user can only mark messages they can see.
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
