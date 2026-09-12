"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { InboxMessageListItem, InboxThreadReply } from "@/lib/inbox";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const session = useSupabaseSession();
  const [messages, setMessages] = useState<InboxMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyOk, setReplyOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox?limit=50", { credentials: "include" });
      if (res.status === 401) {
        setError("Sign in to view your inbox.");
        setMessages([]);
        return;
      }
      if (!res.ok) {
        setError("Could not load inbox.");
        return;
      }
      const data = (await res.json()) as { messages?: InboxMessageListItem[] };
      setMessages(data.messages ?? []);
    } catch {
      setError("Could not load inbox.");
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session === undefined) return;
    void load();
  }, [session, load]);

  const selected =
    messages.find((m) => m.id === selectedId) ??
    (filter === "unread"
      ? messages.find((m) => !m.read_at)
      : messages[0]) ??
    null;

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    setReplyText("");
    setReplyError(null);
    setReplyOk(null);
  }, [selected?.id]);

  const markRead = async (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target || target.read_at) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, read_at: new Date().toISOString() }
          : m,
      ),
    );

    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: [messageId] }),
      });
    } catch {
      /* optimistic */
    }
  };

  const markAllRead = async () => {
    setMessages((prev) =>
      prev.map((m) =>
        m.read_at ? m : { ...m, read_at: new Date().toISOString() },
      ),
    );
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      void load();
    }
  };

  useEffect(() => {
    if (selected && !selected.read_at) {
      void markRead(selected.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplyBusy(true);
    setReplyError(null);
    setReplyOk(null);
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: selected.id, body: replyText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReplyError(
          typeof data.error === "string" ? data.error : "Could not send reply",
        );
        return;
      }
      const reply = data.reply as InboxThreadReply | undefined;
      if (reply) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === selected.id
              ? {
                  ...m,
                  replies: [...(m.replies ?? []), reply],
                  read_at: m.read_at ?? new Date().toISOString(),
                }
              : m,
          ),
        );
      }
      setReplyText("");
      setReplyOk("Reply sent. The ESAT Camp team will see it.");
    } catch {
      setReplyError("Could not send reply");
    } finally {
      setReplyBusy(false);
    }
  };

  const visible =
    filter === "unread" ? messages.filter((m) => !m.read_at) : messages;
  const unreadCount = messages.filter((m) => !m.read_at).length;

  if (session === undefined) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Loading…</p>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container size="md" className="py-16">
        <h1 className="font-heading text-2xl font-bold text-text">Inbox</h1>
        <p className="mt-3 text-sm text-text-muted">
          <Link
            href="/login?redirect=/inbox"
            className="underline-offset-2 hover:underline"
          >
            Sign in
          </Link>{" "}
          to see messages from ESAT Camp.
        </p>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text">Inbox</h1>
          <p className="mt-1 text-sm text-text-muted">
            Messages from ESAT Camp. Reply here when you need to follow up.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "unread")}
            className="rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-text"
            aria-label="Filter messages"
          >
            <option value="all">All</option>
            <option value="unread">Unread ({unreadCount})</option>
          </select>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="rounded-organic-md px-3 py-2 text-text-muted underline-offset-2 hover:text-text hover:underline"
            >
              Mark all read
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-text-muted">Loading…</p>
      ) : error ? (
        <p className="mt-10 text-sm text-text-muted">{error}</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-sm text-text-muted">
          {filter === "unread" ? "No unread messages." : "Your inbox is empty."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <ul className="space-y-2">
            {visible.map((m) => {
              const active = selected?.id === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      "w-full rounded-organic-xl px-4 py-3 text-left transition-colors",
                      active
                        ? "bg-surface-elevated"
                        : "bg-surface-mid/60 hover:bg-surface-mid",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm text-text",
                          !m.read_at && "font-semibold",
                        )}
                      >
                        {m.subject}
                      </p>
                      {!m.read_at ? (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary"
                          aria-label="Unread"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-text-subtle">
                      ESAT Camp
                      {" · "}
                      {new Date(m.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <article className="rounded-organic-xl bg-surface-elevated px-5 py-5 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                From ESAT Camp
                {selected.audience === "broadcast" ? " · everyone" : ""}
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold text-text">
                {selected.subject}
              </h2>
              <p className="mt-1 text-xs text-text-subtle">
                {new Date(selected.created_at).toLocaleString("en-GB")}
              </p>
              <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                {selected.body}
              </div>

              {(selected.replies ?? []).length > 0 ? (
                <div className="mt-6 space-y-3 border-t border-border-subtle pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Conversation
                  </p>
                  {(selected.replies ?? []).map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-organic-md px-3 py-2.5 text-sm",
                        r.direction === "inbound"
                          ? "bg-secondary/15 text-text"
                          : "bg-surface-mid text-text-muted",
                      )}
                    >
                      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-subtle">
                        {r.direction === "inbound" ? "You" : "ESAT Camp"}
                        {" · "}
                        {new Date(r.created_at).toLocaleString("en-GB")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                        {r.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {selected.allow_reply ? (
                <div className="mt-6 border-t border-border-subtle pt-5">
                  <label className="block text-sm font-medium text-text">
                    Reply to ESAT Camp
                  </label>
                  <p className="mt-1 text-xs text-text-muted">
                    Your reply goes to the team. They will follow up here or by
                    email if needed.
                  </p>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    className="mt-3 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
                    placeholder="Type your reply…"
                  />
                  {replyError ? (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {replyError}
                    </p>
                  ) : null}
                  {replyOk ? (
                    <p className="mt-2 text-sm text-text-muted">{replyOk}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={replyBusy || !replyText.trim()}
                    onClick={() => void sendReply()}
                    className="mt-3 rounded-organic-md bg-secondary/25 px-4 py-2 text-sm font-semibold text-text disabled:opacity-50"
                  >
                    {replyBusy ? "Sending…" : "Send reply"}
                  </button>
                </div>
              ) : null}
            </article>
          ) : null}
        </div>
      )}
    </Container>
  );
}
