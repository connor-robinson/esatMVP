import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { validateInboxCompose } from "@/lib/inbox";
import type { InboxMessageListItem } from "@/lib/inbox";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inbox
 * List recently sent inbox messages (admin).
 */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 40;

  const { data: messages, error } = await admin.service
    .from("inbox_messages")
    .select(
      "id, subject, body, audience, direction, parent_id, support_request_id, legacy_bug_report_id, allow_reply, created_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  const personalIds = (messages ?? [])
    .filter((m) => m.audience === "personal" && m.direction === "outbound")
    .map((m) => m.id);

  const recipientMap = new Map<
    string,
    Array<{ user_id: string; username: string | null; email: string | null }>
  >();

  const authorIds = [
    ...new Set(
      (messages ?? [])
        .map((m) => m.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const authorById = new Map<
    string,
    { username: string | null; email: string | null }
  >();

  if (authorIds.length > 0) {
    const { data: authors } = await admin.service
      .from("profiles")
      .select("id, username, email")
      .in("id", authorIds);
    for (const p of authors ?? []) {
      authorById.set(p.id, {
        username: p.username ?? null,
        email: p.email ?? null,
      });
    }
  }

  if (personalIds.length > 0) {
    const { data: recipients } = await admin.service
      .from("inbox_message_recipients")
      .select("message_id, user_id")
      .in("message_id", personalIds);

    const userIds = [
      ...new Set((recipients ?? []).map((r) => r.user_id)),
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

    for (const r of recipients ?? []) {
      const list = recipientMap.get(r.message_id) ?? [];
      const profile = profileById.get(r.user_id);
      list.push({
        user_id: r.user_id,
        username: profile?.username ?? null,
        email: profile?.email ?? null,
      });
      recipientMap.set(r.message_id, list);
    }
  }

  const rows: InboxMessageListItem[] = (messages ?? []).map((m) => {
    const author = m.created_by ? authorById.get(m.created_by) : null;
    return {
      id: m.id,
      subject: m.subject,
      body: m.body,
      audience: m.audience as "personal" | "broadcast",
      direction: (m.direction as "outbound" | "inbound") || "outbound",
      parent_id: m.parent_id,
      support_request_id: m.support_request_id,
      legacy_bug_report_id: m.legacy_bug_report_id,
      allow_reply: m.allow_reply !== false,
      created_by: m.created_by,
      created_at: m.created_at,
      read_at: null,
      recipients:
        m.audience === "personal" && m.direction === "outbound"
          ? recipientMap.get(m.id) ?? []
          : m.direction === "inbound" && author
            ? [
                {
                  user_id: m.created_by!,
                  username: author.username,
                  email: author.email,
                },
              ]
            : undefined,
    };
  });

  return NextResponse.json({ messages: rows });
}

/**
 * POST /api/admin/inbox
 * Compose a personal or broadcast inbox message.
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

  const validated = validateInboxCompose(raw);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { subject, body, audience, recipientIds } = validated.value;

  if (audience === "personal") {
    const { data: existing, error: profileError } = await admin.service
      .from("profiles")
      .select("id")
      .in("id", recipientIds);

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to validate recipients" },
        { status: 500 },
      );
    }
    const found = new Set((existing ?? []).map((p) => p.id));
    const missing = recipientIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "One or more recipients were not found" },
        { status: 400 },
      );
    }
  }

  const { data: inserted, error: insertError } = await admin.service
    .from("inbox_messages")
    .insert({
      subject,
      body,
      audience,
      created_by: admin.userId,
    })
    .select("id, subject, body, audience, created_by, created_at")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 },
    );
  }

  if (audience === "personal" && recipientIds.length > 0) {
    const { error: recipError } = await admin.service
      .from("inbox_message_recipients")
      .insert(
        recipientIds.map((user_id) => ({
          message_id: inserted.id,
          user_id,
        })),
      );
    if (recipError) {
      await admin.service.from("inbox_messages").delete().eq("id", inserted.id);
      return NextResponse.json(
        { error: "Failed to attach recipients" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ message: inserted }, { status: 201 });
}
