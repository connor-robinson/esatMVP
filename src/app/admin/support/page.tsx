"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
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

  const load = useCallback(async () => {
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

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
    return { total: tickets.length, open };
  }, [tickets]);

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
      await load();
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
      await load();
    } catch {
      setActionError("Reply failed");
    } finally {
      setBusyKey(null);
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
          <h1 className="text-2xl font-bold text-text">Support inbox</h1>
          <p className="mt-2 text-sm text-text-muted">
            All Help launcher tickets and legacy /help reports in one place.
            Resolve them, or reply straight into the student&apos;s inbox.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/admin/inbox"
            className="text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Messages
          </Link>
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
      </div>

      <p className="mt-4 text-xs text-text-subtle">
        Showing {counts.total}
        {filter === "open" ? ` · ${counts.open} active` : ""}
      </p>

      {actionError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{actionError}</p>
      ) : null}
      {actionOk ? (
        <p className="mt-3 text-sm text-text-muted">{actionOk}</p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : (
        <div className="mt-6 space-y-4">
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

            return (
              <article
                key={replyKey}
                className="rounded-organic-xl bg-surface-elevated px-5 py-4"
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
                    <h2 className="mt-1 font-heading text-lg font-semibold text-text">
                      {ticket.subject}
                    </h2>
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
                      <dd className="inline">{ticket.email_delivery_status}</dd>
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
                        onChange={(e) => setReplyAlsoResolve(e.target.checked)}
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
    </Container>
  );
}
