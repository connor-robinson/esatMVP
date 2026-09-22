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
import {
  formatInboxWhen,
  InboxCampIcon,
  InboxFromMeta,
  InboxThreadBubbles,
} from "@/components/inbox/InboxMessageParts";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  INBOX_READ_EVENT,
  type InboxMessageListItem,
  type InboxReadEventDetail,
  type InboxThreadReply,
} from "@/lib/inbox";
import { cn } from "@/lib/utils";

const NAV_ICON_PX = 20;
const NAV_ICON_STROKE = 2;
const PREVIEW_LIMIT = 6;
const COLLAPSED_BODY_CHARS = 72;

type Props = {
  className?: string;
};

type InboxFetchResult = {
  messages: InboxMessageListItem[];
  unreadPersonal: number;
  hasUnreadBroadcast: boolean;
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

function sortInboxMessages(items: InboxMessageListItem[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/**
 * Navbar inbox: leftmost account icon; opens a compact notification popup.
 */
export function InboxNavButton({ className }: Props) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  /** Optimistic reads that may not yet be reflected by a concurrent refresh. */
  const pendingReadIdsRef = useRef<Set<string>>(new Set());
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

  const applyLocalReads = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    for (const id of ids) pendingReadIdsRef.current.add(id);

    setMessages((prev) => {
      let personalDelta = 0;
      let hadBroadcast = false;
      const next = prev.map((m) => {
        if (!idSet.has(m.id) || m.read_at) return m;
        if (m.audience === "personal") personalDelta += 1;
        else hadBroadcast = true;
        return { ...m, read_at: new Date().toISOString() };
      });
      if (personalDelta > 0) {
        setUnreadPersonal((n) => Math.max(0, n - personalDelta));
      }
      if (hadBroadcast) {
        const stillUnreadBroadcast = next.some(
          (m) => !m.read_at && m.audience === "broadcast",
        );
        if (!stillUnreadBroadcast) {
          setHasUnreadBroadcast(false);
        }
      }
      return next;
    });
  }, []);

  const persistReads = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return false;
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const refresh = useCallback(async (): Promise<InboxFetchResult | null> => {
    if (!session?.user) {
      setMessages([]);
      setUnreadPersonal(0);
      setHasUnreadBroadcast(false);
      pendingReadIdsRef.current.clear();
      return null;
    }
    try {
      const res = await fetch(
        `/api/inbox?limit=${PREVIEW_LIMIT}&unreadOnly=1`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        messages?: InboxMessageListItem[];
        unreadCount?: number;
        unreadPersonalCount?: number;
        hasUnreadBroadcast?: boolean;
      };

      const pending = pendingReadIdsRef.current;
      const incoming = (data.messages ?? []).map((m) =>
        pending.has(m.id)
          ? { ...m, read_at: m.read_at ?? new Date().toISOString() }
          : m,
      );

      // Clear pending once the server no longer returns them as unread.
      const incomingUnreadIds = new Set(
        (data.messages ?? []).filter((m) => !m.read_at).map((m) => m.id),
      );
      for (const id of [...pending]) {
        if (!incomingUnreadIds.has(id)) pending.delete(id);
      }

      let personal =
        typeof data.unreadPersonalCount === "number"
          ? data.unreadPersonalCount
          : typeof data.unreadCount === "number"
            ? data.unreadCount
            : incoming.filter((m) => !m.read_at && m.audience === "personal")
                .length;
      let broadcast =
        typeof data.hasUnreadBroadcast === "boolean"
          ? data.hasUnreadBroadcast
          : incoming.some((m) => !m.read_at && m.audience === "broadcast");

      // Keep optimistic badge clears ahead of a slow PATCH.
      if (pending.size > 0) {
        personal = Math.max(
          0,
          personal -
            incoming.filter(
              (m) =>
                pending.has(m.id) &&
                m.audience === "personal" &&
                !m.read_at,
            ).length,
        );
        const unreadBroadcasts = incoming.filter(
          (m) => !m.read_at && m.audience === "broadcast",
        );
        if (
          unreadBroadcasts.length > 0 &&
          unreadBroadcasts.every((m) => pending.has(m.id))
        ) {
          // Every unread broadcast in this payload is pending-read. Hold the
          // badge clear; a post-PATCH refresh reconciles any remaining unread.
          broadcast = false;
        }
      }

      setMessages((prev) => {
        if (!openRef.current) {
          return sortInboxMessages(incoming);
        }
        // Panel open: keep already-shown rows (including just-read) so the
        // list does not vanish under the user when we mark-on-open.
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of incoming) {
          const existing = byId.get(m.id);
          byId.set(
            m.id,
            existing?.read_at && !m.read_at
              ? { ...m, read_at: existing.read_at }
              : m,
          );
        }
        for (const id of pending) {
          const row = byId.get(id);
          if (row && !row.read_at) {
            byId.set(id, {
              ...row,
              read_at: new Date().toISOString(),
            });
          }
        }
        return sortInboxMessages(Array.from(byId.values()));
      });
      setUnreadPersonal(personal);
      setHasUnreadBroadcast(broadcast);
      return {
        messages: incoming,
        unreadPersonal: personal,
        hasUnreadBroadcast: broadcast,
      };
    } catch {
      return null;
    }
  }, [session?.user]);

  const markReadIds = useCallback(
    async (messageIds: string[]) => {
      const unique = [...new Set(messageIds.filter(Boolean))];
      if (unique.length === 0) return;
      applyLocalReads(unique);
      const ok = await persistReads(unique);
      // Reconcile badge with server counts (other unread outside the preview).
      if (ok) void refresh();
    },
    [applyLocalReads, persistReads, refresh],
  );

  useEffect(() => {
    void refresh();
    if (!session?.user) return;
    const id = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    const onInboxRead = (event: Event) => {
      const detail = (event as CustomEvent<InboxReadEventDetail>).detail;
      if (detail?.all) {
        pendingReadIdsRef.current.clear();
        setMessages((prev) =>
          prev.map((m) =>
            m.read_at ? m : { ...m, read_at: new Date().toISOString() },
          ),
        );
        setUnreadPersonal(0);
        setHasUnreadBroadcast(false);
        return;
      }
      if (detail?.messageIds?.length) {
        applyLocalReads(detail.messageIds);
      }
      // Reconcile badge counts with the server after another view marks read.
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(INBOX_READ_EVENT, onInboxRead);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(INBOX_READ_EVENT, onInboxRead);
    };
  }, [session?.user, refresh, pathname, applyLocalReads]);

  useEffect(() => {
    setOpen(false);
    openRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        openRef.current = false;
        setMessages((prev) => prev.filter((m) => !m.read_at));
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        openRef.current = false;
        setMessages((prev) => prev.filter((m) => !m.read_at));
      }
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
    openRef.current = next;
    setOpen(next);
    if (!next) {
      setExpandedId(null);
      setMessages((prev) => prev.filter((m) => !m.read_at));
      return;
    }
    setLoading(true);
    setReplyErrorById({});
    setExpandedId(null);
    const result = await refresh();
    setLoading(false);
    // Opening the preview counts as viewing: clear the badge for loaded
    // messages while keeping them visible until the panel closes.
    const unreadIds = (result?.messages ?? [])
      .filter((m) => !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      void markReadIds(unreadIds);
    }
  };

  const selectMessage = (id: string) => {
    const target = messages.find((m) => m.id === id);
    if (!target) return;

    const needsExpand = previewBody(target.body).truncated;

    setReplyErrorById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (!needsExpand) {
      setExpandedId((prev) => (prev === id ? null : prev));
      void markReadIds([id]);
      return;
    }

    setExpandedId((prev) => (prev === id ? null : id));
    void markReadIds([id]);
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
      void markReadIds([parentId]);
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

  // While the panel is open, keep just-read messages visible so previewing
  // does not empty the list under the user.
  const visibleMessages = open
    ? messages
    : messages.filter((m) => !m.read_at || expandedId === m.id);

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
              onClick={() => {
                openRef.current = false;
                setOpen(false);
              }}
              className="text-[11px] font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
            >
              Open full inbox
            </Link>
          </div>

          <div className="max-h-[min(28rem,75vh)] overflow-y-auto">
            {loading && visibleMessages.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-text-muted">Loading…</p>
            ) : visibleMessages.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-[12px] text-text-muted">
                  No unread messages.
                </p>
                <Link
                  href="/inbox"
                  onClick={() => {
                    openRef.current = false;
                    setOpen(false);
                  }}
                  className="mt-2 inline-block text-[11px] font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  Open full inbox
                </Link>
              </div>
            ) : (
              <ul>
                {visibleMessages.map((m) => {
                  const unreadItem = !m.read_at;
                  const expanded = expandedId === m.id;
                  const isDirect = m.audience === "personal";
                  const bodyPreview = previewBody(m.body);
                  const replyText = replyById[m.id] ?? "";
                  const replyError = replyErrorById[m.id];
                  const replyBusy = replyBusyId === m.id;
                  const showCompactReply = isDirect && m.allow_reply;
                  const fromLabel = isDirect
                    ? "ESAT Camp · direct"
                    : "ESAT Camp · everyone";

                  return (
                    <li
                      key={m.id}
                      className="border-b border-border-subtle last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => selectMessage(m.id)}
                        aria-expanded={expanded}
                        className={cn(
                          "group w-full px-3 py-2.5 text-left",
                          "hover:bg-surface-subtle/80",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary/40",
                          unreadItem && "bg-emerald-500/[0.04]",
                        )}
                      >
                        <span className="flex items-start gap-2.5">
                          <InboxCampIcon showUnreadDot={unreadItem} />
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
                              {bodyPreview.truncated ? (
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
                              ) : null}
                            </span>

                            {!expanded ? (
                              <span className="mt-1.5 block">
                                <span className="block truncate text-[11px] leading-snug text-text-muted">
                                  {bodyPreview.text}
                                </span>
                                <span className="mt-1.5 flex items-center justify-between gap-2">
                                  <InboxFromMeta
                                    from={fromLabel}
                                    when={formatInboxWhen(m.created_at)}
                                  />
                                  {bodyPreview.truncated ? (
                                    <span className="shrink-0 text-[10px] font-medium text-text-subtle opacity-80 group-hover:opacity-100">
                                      Expand…
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>

                      {expanded ? (
                        <div className="px-3 pb-2 pl-[3.25rem]">
                          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-text">
                            {m.body}
                          </p>
                          <InboxFromMeta
                            className="mt-2"
                            from={fromLabel}
                            when={formatInboxWhen(m.created_at, true)}
                          />
                          <InboxThreadBubbles
                            dense
                            replies={(m.replies ?? []).slice(-4)}
                          />
                        </div>
                      ) : null}

                      {showCompactReply ? (
                        <div
                          className={cn(
                            "px-3 pb-2.5 pl-[3.25rem]",
                            expanded && "pt-1",
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
                              maxLength={4000}
                              placeholder="Reply to ESAT Camp…"
                              aria-label={`Reply to ${m.subject}`}
                              className={cn(
                                "min-w-0 flex-1 rounded-md border border-border-subtle bg-surface-subtle",
                                "px-2 py-1 text-[11px] text-text placeholder:text-text-subtle",
                              )}
                            />
                            <button
                              type="button"
                              disabled={replyBusy || !replyText.trim()}
                              onClick={() => void sendReply(m.id)}
                              className={cn(
                                "shrink-0 rounded-md bg-blue-600 px-2 py-1",
                                "text-[11px] font-semibold text-white disabled:opacity-50",
                                "hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500",
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
