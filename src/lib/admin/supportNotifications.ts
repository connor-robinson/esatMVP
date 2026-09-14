import type { SupabaseClient } from "@supabase/supabase-js";

export type SupportNotificationItem = {
  id: string;
  kind: "new_ticket" | "student_reply";
  source: "support" | "legacy_bug" | "inbox";
  title: string;
  preview: string;
  createdAt: string;
  ticketId: string | null;
  messageId: string | null;
  rootMessageId: string | null;
  userId: string | null;
  username: string | null;
  email: string | null;
};

export type SupportNotificationsPayload = {
  newTicketCount: number;
  studentReplyCount: number;
  total: number;
  items: SupportNotificationItem[];
};

type InboxRow = {
  id: string;
  direction: string | null;
  parent_id: string | null;
  support_request_id: string | null;
  legacy_bug_report_id: string | null;
  subject: string | null;
  body: string | null;
  created_at: string;
  created_by: string | null;
};

function threadKey(row: InboxRow): string {
  if (row.support_request_id) return `support:${row.support_request_id}`;
  if (row.legacy_bug_report_id) return `legacy:${row.legacy_bug_report_id}`;
  return `root:${row.parent_id ?? row.id}`;
}

/**
 * Unresolved help / support notifications (excludes question-bank content reports).
 * Badge clears when the underlying ticket is resolved/closed.
 */
export async function loadSupportNotifications(
  service: SupabaseClient,
): Promise<SupportNotificationsPayload> {
  const [supportRes, legacyRes, inboxRes, qbOpenRes] = await Promise.all([
    service
      .from("support_requests")
      .select(
        "id, user_id, reply_email, subject, message, status, category, created_at",
      )
      .in("status", ["open", "in_progress"])
      .neq("category", "question_or_content_error")
      .order("created_at", { ascending: false })
      .limit(120),
    service
      .from("app_bug_reports")
      .select("id, user_id, description, status, created_at")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(80),
    service
      .from("inbox_messages")
      .select(
        "id, direction, parent_id, support_request_id, legacy_bug_report_id, subject, body, created_at, created_by",
      )
      .order("created_at", { ascending: false })
      .limit(300),
    service
      .from("support_requests")
      .select("id")
      .eq("category", "question_or_content_error")
      .in("status", ["open", "in_progress"])
      .limit(200),
  ]);

  if (supportRes.error) throw new Error(supportRes.error.message);
  if (legacyRes.error) throw new Error(legacyRes.error.message);
  if (inboxRes.error) throw new Error(inboxRes.error.message);
  if (qbOpenRes.error) throw new Error(qbOpenRes.error.message);

  const qbTicketIds = new Set(
    (qbOpenRes.data ?? []).map((row) => row.id as string),
  );

  const inbox = (inboxRes.data ?? []) as InboxRow[];

  const latestByThread = new Map<string, InboxRow>();
  for (const row of inbox) {
    const key = threadKey(row);
    if (!latestByThread.has(key)) latestByThread.set(key, row);
  }

  const openSupportIds = new Set(
    (supportRes.data ?? []).map((t) => t.id as string),
  );
  const openLegacyIds = new Set(
    (legacyRes.data ?? []).map((t) => t.id as string),
  );

  const userIds = new Set<string>();
  for (const t of supportRes.data ?? []) {
    if (t.user_id) userIds.add(t.user_id as string);
  }
  for (const t of legacyRes.data ?? []) {
    if (t.user_id) userIds.add(t.user_id as string);
  }
  for (const row of latestByThread.values()) {
    if (row.direction === "inbound" && row.created_by) {
      userIds.add(row.created_by);
    }
  }

  const profileById = new Map<
    string,
    { username: string | null; email: string | null }
  >();
  if (userIds.size > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, username, email")
      .in("id", [...userIds]);
    for (const p of profiles ?? []) {
      profileById.set(p.id as string, {
        username: (p.username as string | null) ?? null,
        email: (p.email as string | null) ?? null,
      });
    }
  }

  const items: SupportNotificationItem[] = [];
  const countedTicketIds = new Set<string>();

  for (const ticket of supportRes.data ?? []) {
    const id = ticket.id as string;
    countedTicketIds.add(id);
    const profile = ticket.user_id
      ? profileById.get(ticket.user_id as string)
      : null;
    items.push({
      id: `open-support-${id}`,
      kind: "new_ticket",
      source: "support",
      title: String(ticket.subject ?? "Support request"),
      preview: String(ticket.message ?? "").slice(0, 180),
      createdAt: String(ticket.created_at),
      ticketId: id,
      messageId: null,
      rootMessageId: null,
      userId: (ticket.user_id as string | null) ?? null,
      username: profile?.username ?? null,
      email:
        profile?.email ??
        (typeof ticket.reply_email === "string" ? ticket.reply_email : null),
    });
  }

  for (const ticket of legacyRes.data ?? []) {
    const id = ticket.id as string;
    countedTicketIds.add(id);
    const profile = ticket.user_id
      ? profileById.get(ticket.user_id as string)
      : null;
    const description = String(ticket.description ?? "");
    const subjectMatch = /^Subject:\s*(.*)$/im.exec(description);
    items.push({
      id: `open-legacy-${id}`,
      kind: "new_ticket",
      source: "legacy_bug",
      title: subjectMatch?.[1]?.trim() || "Legacy help report",
      preview: description.slice(0, 180),
      createdAt: String(ticket.created_at),
      ticketId: id,
      messageId: null,
      rootMessageId: null,
      userId: (ticket.user_id as string | null) ?? null,
      username: profile?.username ?? null,
      email: profile?.email ?? null,
    });
  }

  for (const row of latestByThread.values()) {
    if (row.direction !== "inbound") continue;

    if (row.support_request_id) {
      if (qbTicketIds.has(row.support_request_id)) continue;
      // Already covered by the open-ticket badge entry.
      if (openSupportIds.has(row.support_request_id)) continue;
    }
    if (row.legacy_bug_report_id && openLegacyIds.has(row.legacy_bug_report_id)) {
      continue;
    }

    const profile = row.created_by
      ? profileById.get(row.created_by)
      : null;
    const source: SupportNotificationItem["source"] = row.support_request_id
      ? "support"
      : row.legacy_bug_report_id
        ? "legacy_bug"
        : "inbox";
    const ticketId = row.support_request_id ?? row.legacy_bug_report_id ?? null;
    if (ticketId && countedTicketIds.has(ticketId)) continue;
    if (ticketId) countedTicketIds.add(ticketId);

    items.push({
      id: `reply-${row.id}`,
      kind: "student_reply",
      source,
      title: String(row.subject ?? "Student reply"),
      preview: String(row.body ?? "").slice(0, 180),
      createdAt: row.created_at,
      ticketId,
      messageId: row.id,
      rootMessageId: row.parent_id ?? row.id,
      userId: row.created_by,
      username: profile?.username ?? null,
      email: profile?.email ?? null,
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const newTicketCount = items.filter((i) => i.kind === "new_ticket").length;
  const studentReplyCount = items.filter(
    (i) => i.kind === "student_reply",
  ).length;

  return {
    newTicketCount,
    studentReplyCount,
    total: items.length,
    items: items.slice(0, 40),
  };
}
