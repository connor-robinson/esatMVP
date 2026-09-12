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
import { ChevronDown, Inbox } from "lucide-react";
import { BrandMarkImage } from "@/components/brand/BrandMarkImage";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { InboxMessageListItem, InboxThreadReply } from "@/lib/inbox";
import { cn } from "@/lib/utils";

const NAV_ICON_PX = 20;
const NAV_ICON_STROKE = 2;
const PREVIEW_LIMIT = 6;
const COLLAPSED_BODY_CHARS = 110;

type Props = {
  className?: string;
};

function previewBody(body: string): { text: string; truncated: boolean } {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned.length <= COLLAPSED_BODY_CHARS) {
    return { text: cleaned, truncated: false };
  }
  return {
    text: `${cleaned.slice(0, COLLAPSED_BODY_CHARS).trimEnd()}…`,
    truncated: true,
  };
}

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
  const [unreadPersonal, setUnreadPersonal] = useState(0);
  const [hasUnreadBroadcast, setHasUnreadBroadcast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [replyErrorById, setReplyErrorById] = useState<Record<string, string>>(
    {},
  );

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setMessages([]);
      setUnreadPersonal(0);
      setHasUnreadBroadcast(false);
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
        unreadPersonalCount?: number;
        hasUnreadBroadcast?: boolean;
      };
      const nextMessages = data.messages ?? [];
      setMessages(nextMessages);
      const personal =
        typeof data.unreadPersonalCount === "number"
          ? data.unreadPersonalCount
          : typeof data.unreadCount === "number"
            ? data.unreadCount
            : nextMessages.filter(
                (m) => !m.read_at && m.audience === "personal",
              ).length;
      setUnreadPersonal(personal);
      setHasUnreadBroadcast(
        typeof data.hasUnreadBroadcast === "boolean"
          ? data.hasUnreadBroadcast
          : nextMessages.some(
              (m) => !m.read_at && m.audience === "broadcast",
            ),
      );
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
    setReplyErrorById({});
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
    if (target.audience === "personal") {
      setUnreadPersonal((n) => Math.max(0, n - 1));
    } else {
      setHasUnreadBroadcast(
        messages.some(
          (m) =>
            m.id !== messageId &&
            !m.read_at &&
            m.audience === "broadcast",
        ),
      );
    }

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
    setReplyErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    void markRead(id);
  };

  const sendReply = async (parentId: string) => {
    const text = (replyById[parentId] ?? "").trim();
    if (!text) return;
    setReplyBusyId(parentId);
    setReplyErrorById((prev) => {
      const next = { ...prev };
      delete next[parentId];
      return next;
    });
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReplyErrorById((prev) => ({
          ...prev,
          [parentId]:
            typeof data.error === "string" ? data.error : "Could not send",
        }));
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
      setReplyById((prev) => ({ ...prev, [parentId]: "" }));
      setExpandedId(parentId);
    } catch {
      setReplyErrorById((prev) => ({
        ...prev,
        [parentId]: "Could not send",
      }));
    } finally {
      setReplyBusyId(null);
    }
  };

  if (!session?.user) return null;

  const showNumberBadge = unreadPersonal > 0;
  const showDotBadge = !showNumberBadge && hasUnreadBroadcast;
  const label = showNumberBadge
    ? `Inbox, ${unreadPersonal} unread direct message${unreadPersonal === 1 ? "" : "s"}`
    : showDotBadge
      ? "Inbox, unread announcements"
      : "Inbox";

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
        {showNumberBadge ? (
          <span
            className={cn(
              "pointer-events-none absolute -right-1.5 -top-1.5",
              "flex h-[1.05rem] min-w-[1.05rem] items-center justify-center",
              "rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white",
            )}
          >
            {unreadPersonal > 9 ? "9+" : unreadPersonal}
          </span>
        ) : showDotBadge ? (
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

          <div className="max-h-[min(28rem,75vh)] overflow-y-auto">
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
                  const isDirect = m.audience === "personal";
                  const bodyPreview = previewBody(m.body);
                  const replyText = replyById[m.id] ?? "";
                  const replyError = replyErrorById[m.id];
                  const replyBusy = replyBusyId === m.id;
                  const showCompactReply = isDirect && m.allow_reply;

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
                        aria-expanded={expanded}
                        className={cn(
                          "group flex w-full items-start gap-2.5 px-3 py-2.5 text-left",
                          "hover:bg-surface-subtle/80",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/40",
                        )}
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-mid">
                          <BrandMarkImage
                            className="h-3.5 w-auto"
                            alt="ESAT Camp"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-1.5">
                            <span
                              className={cn(
                                "min-w-0 flex-1 whitespace-normal break-words text-[12px] leading-snug text-text",
                                unreadItem && "font-semibold",
                              )}
                            >
                              {m.subject}
                            </span>
                            <ChevronDown
                              aria-hidden
                              size={14}
                              strokeWidth={2.25}
                              className={cn(
                                "mt-0.5 shrink-0 text-text-subtle transition-transform duration-150",
                                "opacity-70 group-hover:opacity-100",
                                expanded && "rotate-180",
                              )}
                            />
                          </span>
                          <span className="mt-0.5 block text-[10px] text-text-subtle">
                            ESAT Camp
                            {isDirect ? " · direct" : " · everyone"}
                            {" · "}
                            {new Date(m.created_at).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                              },
                            )}
                          </span>

                          {!expanded ? (
                            <span className="relative mt-1.5 block">
                              <span
                                className={cn(
                                  "block text-[11px] leading-relaxed text-text-muted",
                                  bodyPreview.truncated &&
                                    "line-clamp-2 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)]",
                                )}
                              >
                                {bodyPreview.text}
                              </span>
                              <span className="mt-1 block text-[10px] font-medium text-text-subtle opacity-80 group-hover:opacity-100">
                                {bodyPreview.truncated
                                  ? "Tap to expand…"
                                  : "Tap for details"}
                              </span>
                            </span>
                          ) : null}
                        </span>
                      </button>

                      {expanded ? (
                        <div className="border-t border-border-subtle bg-surface-subtle/40 px-3 py-2.5 pl-[3.25rem]">
                          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-text-muted">
                            {m.body}
                          </p>

                          {(m.replies ?? []).length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {(m.replies ?? []).slice(-4).map((r) => (
                                <p
                                  key={r.id}
                                  className={cn(
                                    "rounded-md px-2 py-1.5 text-[11px] leading-relaxed",
                                    r.direction === "inbound"
                                      ? "bg-surface-mid text-text"
                                      : "bg-background text-text-muted",
                                  )}
                                >
                                  <span className="font-medium text-text-subtle">
                                    {r.direction === "inbound"
                                      ? "You"
                                      : "ESAT Camp"}
                                    :{" "}
                                  </span>
                                  {r.body.length > 200
                                    ? `${r.body.slice(0, 200)}…`
                                    : r.body}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {showCompactReply ? (
                        <div
                          className={cn(
                            "px-3 pb-2.5 pl-[3.25rem]",
                            expanded && "pt-2",
                          )}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) =>
                                setReplyById((prev) => ({
                                  ...prev,
                                  [m.id]: e.target.value,
                                }))
                              }
                              onFocus={() => void markRead(m.id)}
                              maxLength={4000}
                              placeholder="Reply to ESAT Camp…"
                              aria-label={`Reply to ${m.subject}`}
                              className={cn(
                                "min-w-0 flex-1 rounded-md border border-border-subtle bg-background",
                                "px-2 py-1 text-[11px] text-text placeholder:text-text-subtle",
                              )}
                            />
                            <button
                              type="button"
                              disabled={replyBusy || !replyText.trim()}
                              onClick={() => void sendReply(m.id)}
                              className={cn(
                                "shrink-0 rounded-md bg-surface-mid px-2 py-1",
                                "text-[11px] font-semibold text-text disabled:opacity-50",
                              )}
                            >
                              {replyBusy ? "…" : "Reply"}
                            </button>
                          </div>
                          {replyError ? (
                            <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                              {replyError}
                            </p>
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
