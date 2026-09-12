"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import {
  formatInboxWhen,
  InboxCampIcon,
  InboxFromMeta,
  InboxThreadBubbles,
} from "@/components/inbox/InboxMessageParts";
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
                    <div className="flex items-start gap-2.5">
                      <InboxCampIcon showUnreadDot={!m.read_at} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "whitespace-normal break-words text-sm leading-snug text-text",
                            !m.read_at && "font-semibold",
                          )}
                        >
                          {m.subject}
                        </p>
                        <p className="mt-1.5 truncate text-xs leading-snug text-text-muted">
                          {m.body.replace(/\s+/g, " ").trim()}
                        </p>
                        <InboxFromMeta
                          className="mt-2"
                          from={
                            m.audience === "personal"
                              ? "ESAT Camp · direct"
                              : "ESAT Camp · everyone"
                          }
                          when={formatInboxWhen(m.created_at)}
                        />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <article className="rounded-organic-xl bg-surface-elevated px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <InboxCampIcon className="h-8 w-8" markClassName="h-4" />
                <h2 className="min-w-0 flex-1 font-heading text-xl font-semibold leading-snug text-text">
                  {selected.subject}
                </h2>
              </div>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text">
                {selected.body}
              </div>
              <InboxFromMeta
                className="mt-3"
                from={
                  selected.audience === "broadcast"
                    ? "ESAT Camp · everyone"
                    : "ESAT Camp · direct"
                }
                when={formatInboxWhen(selected.created_at, true)}
              />

              {(selected.replies ?? []).length > 0 ? (
                <div className="mt-6 border-t border-border-subtle pt-5">
                  <InboxThreadBubbles replies={selected.replies ?? []} />
                </div>
              ) : null}

              {selected.allow_reply && selected.audience === "personal" ? (
                <div className="mt-6 border-t border-border-subtle pt-5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      maxLength={4000}
                      className="min-w-0 flex-1 rounded-organic-md border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text"
                      placeholder="Reply to ESAT Camp…"
                      aria-label="Reply to ESAT Camp"
                    />
                    <button
                      type="button"
                      disabled={replyBusy || !replyText.trim()}
                      onClick={() => void sendReply()}
                      className="shrink-0 rounded-organic-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      {replyBusy ? "Sending…" : "Reply"}
                    </button>
                  </div>
                  {replyError ? (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {replyError}
                    </p>
                  ) : null}
                  {replyOk ? (
                    <p className="mt-2 text-sm text-text-muted">{replyOk}</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ) : null}
        </div>
      )}
    </Container>
  );
}
