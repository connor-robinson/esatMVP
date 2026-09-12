"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox } from "lucide-react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { InboxMessageListItem, InboxThreadReply } from "@/lib/inbox";
import { cn } from "@/lib/utils";

const NAV_ICON_PX = 20;
const NAV_ICON_STROKE = 2;
const PREVIEW_LIMIT = 6;

type Props = {
  className?: string;
};

/**
 * Navbar inbox: leftmost account icon; opens a compact notification popup.
 */
export function InboxNavButton({ className }: Props) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<InboxMessageListItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setMessages([]);
      setUnread(0);
      return;
    }
    try {
      const res = await fetch(`/api/inbox?limit=${PREVIEW_LIMIT}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages?: InboxMessageListItem[];
        unreadCount?: number;
      };
      setMessages(data.messages ?? []);
      setUnread(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      /* ignore */
    }
  }, [session?.user]);

  useEffect(() => {
    void refresh();
    if (!session?.user) return;
    const id = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user, refresh, pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPanel = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setReplyError(null);
    await refresh();
    setLoading(false);
  };

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
    setUnread((n) => Math.max(0, n - 1));

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

  const selectMessage = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setReplyText("");
    setReplyError(null);
    void markRead(id);
  };

  const sendReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    setReplyBusy(true);
    setReplyError(null);
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, body: replyText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReplyError(
          typeof data.error === "string" ? data.error : "Could not send",
        );
        return;
      }
      const reply = data.reply as InboxThreadReply | undefined;
      if (reply) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === parentId
              ? { ...m, replies: [...(m.replies ?? []), reply] }
              : m,
          ),
        );
      }
      setReplyText("");
    } catch {
      setReplyError("Could not send");
    } finally {
      setReplyBusy(false);
    }
  };

  if (!session?.user) return null;

  const label = unread > 0 ? `Inbox, ${unread} unread` : "Inbox";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => void openPanel()}
        className={cn(className, "relative", open && "bg-surface-subtle")}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Inbox
          aria-hidden
          className="text-text"
          size={NAV_ICON_PX}
          strokeWidth={NAV_ICON_STROKE}
        />
        {unread > 0 ? (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Inbox notifications"
          className={cn(
            "absolute right-0 top-[calc(100%+0.4rem)] z-[60]",
            "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden",
            "rounded-lg border border-border-subtle bg-background shadow-sm",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
            <p className="text-[12px] font-semibold text-text">Inbox</p>
            <Link
              href="/inbox"
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
            >
              Open full inbox
            </Link>
          </div>

          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {loading && messages.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-text-muted">Loading…</p>
            ) : messages.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-text-muted">
                No messages yet.
              </p>
            ) : (
              <ul>
                {messages.map((m) => {
                  const unreadItem = !m.read_at;
                  const expanded = expandedId === m.id;
                  return (
                    <li
                      key={m.id}
                      className={cn(
                        "border-b border-border-subtle last:border-b-0",
                        unreadItem ? "bg-red-500/[0.06]" : "bg-transparent",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectMessage(m.id)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-surface-subtle/80"
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            unreadItem ? "bg-red-500" : "bg-border-subtle",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[12px] text-text",
                              unreadItem && "font-semibold",
                            )}
                          >
                            {m.subject}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-text-muted">
                            ESAT Camp ·{" "}
                            {new Date(m.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </span>
                      </button>

                      {expanded ? (
                        <div className="border-t border-border-subtle bg-surface-subtle/40 px-3 py-2.5">
                          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-text-muted">
                            {m.body.length > 420
                              ? `${m.body.slice(0, 420)}…`
                              : m.body}
                          </p>

                          {(m.replies ?? []).length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {(m.replies ?? []).slice(-3).map((r) => (
                                <p
                                  key={r.id}
                                  className={cn(
                                    "rounded-md px-2 py-1.5 text-[11px] leading-relaxed",
                                    r.direction === "inbound"
                                      ? "bg-red-500/10 text-text"
                                      : "bg-background text-text-muted",
                                  )}
                                >
                                  <span className="font-medium text-text-subtle">
                                    {r.direction === "inbound"
                                      ? "You"
                                      : "ESAT Camp"}
                                    :{" "}
                                  </span>
                                  {r.body.length > 160
                                    ? `${r.body.slice(0, 160)}…`
                                    : r.body}
                                </p>
                              ))}
                            </div>
                          ) : null}

                          {m.allow_reply ? (
                            <div className="mt-2">
                              <textarea
                                value={expandedId === m.id ? replyText : ""}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                maxLength={4000}
                                placeholder="Reply to ESAT Camp…"
                                className="w-full resize-none rounded-md border border-border-subtle bg-background px-2 py-1.5 text-[12px] text-text"
                              />
                              {replyError ? (
                                <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                                  {replyError}
                                </p>
                              ) : null}
                              <button
                                type="button"
                                disabled={replyBusy || !replyText.trim()}
                                onClick={() => void sendReply(m.id)}
                                className="mt-1.5 rounded-md bg-surface-mid px-2.5 py-1 text-[11px] font-semibold text-text disabled:opacity-50"
                              >
                                {replyBusy ? "Sending…" : "Send reply"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
