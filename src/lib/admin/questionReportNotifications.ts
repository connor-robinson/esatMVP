import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type QuestionReportNotificationItem = {
  id: string;
  ticketId: string;
  questionId: string | null;
  reason: string;
  preview: string;
  status: string;
  createdAt: string;
  userId: string | null;
  username: string | null;
  email: string | null;
};

export type QuestionReportNotificationsPayload = {
  open: number;
  inProgress: number;
  total: number;
  items: QuestionReportNotificationItem[];
};

function parseContext(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}

/**
 * Unresolved question-bank content reports. Badge clears when ticket is resolved.
 */
export async function loadQuestionReportNotifications(
  service: SupabaseClient,
): Promise<QuestionReportNotificationsPayload> {
  const { data, error } = await service
    .from("support_requests")
    .select(
      "id, user_id, reply_email, subject, message, status, context, created_at",
    )
    .eq("category", "question_or_content_error")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) throw new Error(error.message);

  const tickets = data ?? [];
  const userIds = [
    ...new Set(
      tickets
        .map((t) => t.user_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const profileById = new Map<
    string,
    { username: string | null; email: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id as string, {
        username: (p.username as string | null) ?? null,
        email: (p.email as string | null) ?? null,
      });
    }
  }

  let open = 0;
  let inProgress = 0;
  const items: QuestionReportNotificationItem[] = [];

  for (const ticket of tickets) {
    const status = String(ticket.status ?? "open");
    if (status === "open") open += 1;
    else if (status === "in_progress") inProgress += 1;

    const context = parseContext(ticket.context);
    const questionIdRaw =
      typeof context.questionId === "string" ? context.questionId.trim() : "";
    const questionId = UUID_RE.test(questionIdRaw) ? questionIdRaw : null;
    const profile = ticket.user_id
      ? profileById.get(ticket.user_id as string)
      : null;

    items.push({
      id: `qb-report-${ticket.id}`,
      ticketId: ticket.id as string,
      questionId,
      reason:
        (typeof ticket.subject === "string" && ticket.subject.trim()) ||
        "Question report",
      preview: String(ticket.message ?? "").slice(0, 180),
      status,
      createdAt: String(ticket.created_at),
      userId: (ticket.user_id as string | null) ?? null,
      username: profile?.username ?? null,
      email:
        profile?.email ??
        (typeof ticket.reply_email === "string" ? ticket.reply_email : null),
    });
  }

  return {
    open,
    inProgress,
    total: items.length,
    items: items.slice(0, 40),
  };
}
