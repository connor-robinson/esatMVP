"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type {
  InboxAudience,
  InboxMessageListItem,
  InboxUserSearchHit,
} from "@/lib/inbox";
import type { SupportNotificationItem } from "@/lib/admin/supportNotifications";
import { SUPPORT_CATEGORY_LABELS, type SupportCategory } from "@/lib/support";
import { cn } from "@/lib/utils";

type TicketSource = "support" | "legacy_bug";

interface Ticket {
  id: string;
  user_id: string | null;
  reply_email: string;
  category: SupportCategory | "legacy_help" | string;
  subject: string;
  message: string;
  page_url: string | null;
  status: string;
  email_delivery_status: string;
  created_at: string;
  context: Record<string, string> | null;
  source: TicketSource;
  username?: string | null;
  profile_email?: string | null;
  inbox_replies?: number;
  can_inbox_reply?: boolean;
}

function categoryLabel(category: string): string {
  if (category === "legacy_help") return "Legacy help / bug form";
  return SUPPORT_CATEGORY_LABELS[category as SupportCategory] ?? category;
}

function statusLabel(status: string): string {
  if (status === "resolved") return "Resolved";
  if (status === "in_progress") return "In progress";
  if (status === "closed") return "Closed";
  if (status === "spam") return "Spam";
  return "Open";
}

export default function AdminSupportPage() {
  const [forbidden, setForbidden] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyAlsoResolve, setReplyAlsoResolve] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [highlightTicketId, setHighlightTicketId] = useState<string | null>(
    null,
  );

  const [notifications, setNotifications] = useState<SupportNotificationItem[]>(
    [],
  );
  const [notifCounts, setNotifCounts] = useState({
    newTicketCount: 0,
    studentReplyCount: 0,
    total: 0,
  });
  const [notifLoading, setNotifLoading] = useState(true);

  const [messages, setMessages] = useState<InboxMessageListItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [audience, setAudience] = useState<InboxAudience>("personal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<InboxUserSearchHit[]>([]);
  const [selected, setSelected] = useState<InboxUserSearchHit[]>([]);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/admin/support/notifications", {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const n = data.notifications;
      setNotifications(n?.items ?? []);
      setNotifCounts({
        newTicketCount: Number(n?.newTicketCount ?? 0),
        studentReplyCount: Number(n?.studentReplyCount ?? 0),
        total: Number(n?.total ?? 0),
      });
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    const res = await fetch(`/api/admin/support?status=${filter}`, {
      cache: "no-store",
    });
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setLoading(false);
  }, [filter]);

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    const res = await fetch("/api/admin/inbox", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setMessagesLoading(false);
      return;
    }
    const data = await res.json();
    setMessages(data.messages ?? []);
    setMessagesLoading(false);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadTickets(), loadNotifications(), loadMessages()]);
  }, [loadTickets, loadNotifications, loadMessages]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    void loadNotifications();
    void loadMessages();
    const id = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [loadNotifications, loadMessages]);

  useEffect(() => {
    if (audience !== "personal" || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void fetch(
        `/api/admin/inbox/users?q=${encodeURIComponent(query.trim())}`,
      )
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => setHits(data.users ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [audience, query]);

  const counts = useMemo(() => {
    const open = tickets.filter(
      (t) => t.status === "open" || t.status === "in_progress",
    ).length;
    return { total: tickets.length, open };
  }, [tickets]);

  const selectedIds = useMemo(
    () => new Set(selected.map((u) => u.id)),
    [selected],
  );

  const addUser = (user: InboxUserSearchHit) => {
    if (selectedIds.has(user.id)) return;
    setSelected((prev) => [...prev, user]);
    setQuery("");
    setHits([]);
  };

  const removeUser = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id));
  };

  const focusTicket = (ticketId: string | null) => {
    if (!ticketId) return;
    setHighlightTicketId(ticketId);
    setFilter("open");
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`ticket-${ticketId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const setStatus = async (ticket: Ticket, status: string) => {
    setBusyKey(`${ticket.id}:status`);
    setActionError(null);
    setActionOk(null);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: ticket.source,
          id: ticket.id,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          typeof data.error === "string" ? data.error : "Update failed",
        );
        return;
      }
      setActionOk(
        status === "resolved"
          ? "Marked as resolved."
          : `Status set to ${statusLabel(status).toLowerCase()}.`,
      );
      await refreshAll();
    } catch {
      setActionError("Update failed");
    } finally {
      setBusyKey(null);
    }
  };

  const sendReply = async (ticket: Ticket) => {
    if (!replyBody.trim()) return;
    setBusyKey(`${ticket.id}:reply`);
    setActionError(null);
    setActionOk(null);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: ticket.source,
          id: ticket.id,
          body: replyBody,
          markResolved: replyAlsoResolve,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          typeof data.error === "string" ? data.error : "Reply failed",
        );
        return;
      }
      setActionOk(
        replyAlsoResolve
          ? "Reply sent to their inbox and ticket resolved."
          : "Reply sent to their inbox.",
      );
      setReplyBody("");
      setReplyOpenId(null);
      await refreshAll();
    } catch {
      setActionError("Reply failed");
    } finally {
      setBusyKey(null);
    }
  };

  const sendCompose = async () => {
    setFormError(null);
    setFormOk(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          subject,
          body,
          recipientIds: selected.map((u) => u.id),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          typeof data.error === "string" ? data.error : "Send failed",
        );
        return;
      }
      setFormOk(
        audience === "broadcast"
          ? "Broadcast sent to everyone."
          : `Sent to ${selected.length} user${selected.length === 1 ? "" : "s"}.`,
      );
      setSubject("");
      setBody("");
      setSelected([]);
      await refreshAll();
    } catch {
      setFormError("Send failed");
    } finally {
      setSending(false);
    }
  };

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Support</h1>
          <p className="mt-2 text-sm text-text-muted">
            New enquiries, student replies, and outbound messages in one place.
            Students can only reply after you message them.
          </p>
        </div>
        <Link
          href="/inbox"
          className="text-sm text-text-muted underline-offset-2 hover:text-text hover:underline"
        >
          My inbox
        </Link>
      </div>

      <section className="mt-8 rounded-organic-xl border border-border-subtle bg-surface-elevated px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
            Notifications
          </h2>
          <p className="text-xs text-text-subtle">
            {notifLoading
              ? "Refreshing…"
              : `${notifCounts.newTicketCount} new · ${notifCounts.studentReplyCount} replies`}
          </p>
        </div>

        {notifLoading && notifications.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            Nothing waiting. New support tickets and unanswered student replies
            show up here.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {notifications.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => focusTicket(item.ticketId)}
                  className="flex w-full flex-col gap-1 rounded-organic-md bg-surface-mid/60 px-3 py-3 text-left transition-colors hover:bg-surface-mid"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {item.kind === "new_ticket"
                        ? "New enquiry"
                        : "Student reply"}
                      {item.source === "legacy_bug" ? " · legacy" : ""}
                    </span>
                    <span className="font-mono text-[11px] text-text-subtle">
                      {new Date(item.createdAt).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-text">
                    {item.title}
                  </span>
                  <span className="line-clamp-2 text-xs text-text-muted">
                    {item.preview || "No preview"}
                  </span>
                  <span className="text-xs text-text-subtle">
                    {item.username || item.email || "Unknown user"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-organic-xl bg-surface-elevated px-5 py-5 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
          Send message
        </h2>
        <p className="mt-2 text-xs text-text-subtle">
          Opens a thread so the student can reply in their inbox.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: "personal", label: "Specific users" },
              { id: "broadcast", label: "Everyone" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAudience(opt.id)}
              className={cn(
                "rounded-organic-md px-3 py-1.5 text-sm font-medium transition-colors",
                audience === opt.id
                  ? "bg-secondary/20 text-text"
                  : "bg-surface-mid text-text-muted hover:text-text",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {audience === "personal" ? (
          <div className="mt-4">
            <label className="block text-xs font-medium text-text-muted">
              Recipients
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search username or email"
              className="mt-1.5 w-full max-w-md rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
            />
            {hits.length > 0 ? (
              <ul className="mt-2 max-w-md overflow-hidden rounded-organic-md border border-border-subtle bg-surface-mid">
                {hits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => addUser(u)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-subtle"
                    >
                      <span className="text-text">
                        {u.username || "No username"}
                      </span>
                      <span className="truncate text-xs text-text-subtle">
                        {u.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selected.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {selected.map((u) => (
                  <li
                    key={u.id}
                    className="inline-flex items-center gap-1.5 rounded-organic-md bg-surface-mid px-2.5 py-1 text-xs text-text"
                  >
                    {u.username || u.email || u.id.slice(0, 8)}
                    <button
                      type="button"
                      onClick={() => removeUser(u.id)}
                      className="text-text-muted hover:text-text"
                      aria-label={`Remove ${u.username || u.email}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-medium text-text-muted">
          Subject
        </label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className="mt-1.5 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
        />

        <label className="mt-4 block text-xs font-medium text-text-muted">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={10000}
          className="mt-1.5 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
        />

        {formError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        ) : null}
        {formOk ? (
          <p className="mt-3 text-sm text-text-muted">{formOk}</p>
        ) : null}

        <button
          type="button"
          disabled={
            sending ||
            !subject.trim() ||
            !body.trim() ||
            (audience === "personal" && selected.length === 0)
          }
          onClick={() => void sendCompose()}
          className="mt-4 rounded-organic-md bg-secondary/25 px-4 py-2 text-sm font-semibold text-text transition-opacity disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
            Tickets
          </h2>
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "open" | "resolved" | "all")
            }
            className="rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
            aria-label="Filter by status"
          >
            <option value="open">Open / in progress</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>

        <p className="mt-3 text-xs text-text-subtle">
          Showing {counts.total}
          {filter === "open" ? ` · ${counts.open} active` : ""}
        </p>

        {actionError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {actionError}
          </p>
        ) : null}
        {actionOk ? (
          <p className="mt-3 text-sm text-text-muted">{actionOk}</p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-text-muted">Loading…</p>
        ) : (
          <div className="mt-4 space-y-4">
            {tickets.map((ticket) => {
              const isLegacy = ticket.source === "legacy_bug";
              const replyKey = `${ticket.source}:${ticket.id}`;
              const isReplying = replyOpenId === replyKey;
              const busy =
                busyKey === `${ticket.id}:status` ||
                busyKey === `${ticket.id}:reply`;
              const contact =
                ticket.username ||
                ticket.profile_email ||
                ticket.reply_email ||
                "No account email";
              const highlighted = highlightTicketId === ticket.id;

              return (
                <article
                  key={replyKey}
                  id={`ticket-${ticket.id}`}
                  className={cn(
                    "rounded-organic-xl bg-surface-elevated px-5 py-4",
                    highlighted && "ring-2 ring-secondary/50",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {categoryLabel(ticket.category)}
                        {isLegacy ? " · legacy" : ""}
                        {" · "}
                        {statusLabel(ticket.status)}
                        {(ticket.inbox_replies ?? 0) > 0
                          ? ` · ${ticket.inbox_replies} inbox reply`
                          : ""}
                      </p>
                      <h3 className="mt-1 font-heading text-lg font-semibold text-text">
                        {ticket.subject}
                      </h3>
                    </div>
                    <p className="font-mono text-xs text-text-subtle">
                      {ticket.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                    {ticket.message}
                  </p>

                  <dl className="mt-4 grid gap-1 text-xs text-text-subtle sm:grid-cols-2">
                    <div>
                      <dt className="inline text-text-muted">From: </dt>
                      <dd className="inline">{contact}</dd>
                    </div>
                    {ticket.reply_email ? (
                      <div>
                        <dt className="inline text-text-muted">Email: </dt>
                        <dd className="inline">
                          <a
                            href={`mailto:${ticket.reply_email}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {ticket.reply_email}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="inline text-text-muted">Created: </dt>
                      <dd className="inline">
                        {new Date(ticket.created_at).toLocaleString("en-GB")}
                      </dd>
                    </div>
                    {!isLegacy ? (
                      <div>
                        <dt className="inline text-text-muted">Notify: </dt>
                        <dd className="inline">
                          {ticket.email_delivery_status}
                        </dd>
                      </div>
                    ) : null}
                    {ticket.page_url ? (
                      <div className="sm:col-span-2">
                        <dt className="inline text-text-muted">Page: </dt>
                        <dd className="inline break-all">{ticket.page_url}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ticket.status !== "resolved" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(ticket, "resolved")}
                        className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                      >
                        Mark as resolved
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void setStatus(ticket, "open")}
                        className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-medium text-text disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busy || !ticket.can_inbox_reply}
                      onClick={() => {
                        setReplyOpenId(isReplying ? null : replyKey);
                        setReplyBody("");
                        setReplyAlsoResolve(ticket.status !== "resolved");
                        setActionError(null);
                        setActionOk(null);
                      }}
                      className={cn(
                        "rounded-organic-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50",
                        ticket.can_inbox_reply
                          ? "bg-surface-mid text-text"
                          : "bg-surface-mid/50 text-text-muted",
                      )}
                      title={
                        ticket.can_inbox_reply
                          ? "Send a reply to their in-app inbox"
                          : "No linked account for inbox reply"
                      }
                    >
                      Respond via inbox
                    </button>

                    {ticket.reply_email ? (
                      <a
                        href={`mailto:${ticket.reply_email}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`}
                        className="rounded-organic-md px-3 py-1.5 text-sm text-text-muted underline-offset-2 hover:text-text hover:underline"
                      >
                        Email
                      </a>
                    ) : null}
                  </div>

                  {isReplying ? (
                    <div className="mt-4 rounded-organic-md border border-border-subtle bg-surface-mid/40 p-3">
                      <label className="block text-xs font-medium text-text-muted">
                        Reply (sent to their inbox)
                      </label>
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={4}
                        className="mt-1.5 w-full rounded-organic-md border border-border-subtle bg-surface-elevated px-3 py-2 text-sm text-text"
                        placeholder="Write your response…"
                      />
                      <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                        <input
                          type="checkbox"
                          checked={replyAlsoResolve}
                          onChange={(e) =>
                            setReplyAlsoResolve(e.target.checked)
                          }
                        />
                        Also mark as resolved
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={busy || !replyBody.trim()}
                          onClick={() => void sendReply(ticket)}
                          className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                        >
                          {busy ? "Sending…" : "Send to inbox"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setReplyOpenId(null)}
                          className="rounded-organic-md px-3 py-1.5 text-sm text-text-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}

            {tickets.length === 0 ? (
              <p className="text-sm text-text-muted">No tickets in this view.</p>
            ) : null}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
          Recent messages ({messages.length})
        </h2>
        {messagesLoading ? (
          <p className="mt-4 text-sm text-text-muted">Loading…</p>
        ) : (
          <div className="mt-4 space-y-4">
            {messages.map((m) => {
              const inbound = m.direction === "inbound";
              return (
                <article
                  key={m.id}
                  className="rounded-organic-xl bg-surface-elevated px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {inbound
                          ? "Student reply"
                          : m.audience === "broadcast"
                            ? "Everyone"
                            : `Personal · ${m.recipients?.length ?? 0} recipient${(m.recipients?.length ?? 0) === 1 ? "" : "s"}`}
                        {m.parent_id ? " · thread" : ""}
                        {m.support_request_id || m.legacy_bug_report_id
                          ? " · from support"
                          : ""}
                      </p>
                      <h3 className="mt-1 font-heading text-lg font-semibold text-text">
                        {m.subject}
                      </h3>
                    </div>
                    <p className="font-mono text-xs text-text-subtle">
                      {new Date(m.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                    {m.body}
                  </p>
                  {m.recipients && m.recipients.length > 0 ? (
                    <p className="mt-3 text-xs text-text-subtle">
                      {inbound ? "From: " : "To: "}
                      {m.recipients
                        .map(
                          (r) =>
                            r.username || r.email || r.user_id.slice(0, 8),
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                </article>
              );
            })}
            {messages.length === 0 ? (
              <p className="text-sm text-text-muted">No messages yet.</p>
            ) : null}
          </div>
        )}
      </section>
    </Container>
  );
}
