"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type { SupportNotificationItem } from "@/lib/admin/supportNotifications";
import { requestAdminBadgesRefresh } from "@/lib/admin/adminBadges";
import { SUPPORT_CATEGORY_LABELS, type SupportCategory } from "@/lib/support";
import { getPublicDisplayName } from "@/lib/profile/publicDisplayName";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  user_id: string | null;
  reply_email: string;
  category: SupportCategory | "legacy_help" | string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
  inbox_replies?: number;
  can_inbox_reply?: boolean;
}

export default function AdminSupportPageV2() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<SupportNotificationItem[]>([]);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support/notifications", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications?.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const id = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [loadNotifications]);

  const sendReply = async (item: SupportNotificationItem) => {
    if (!item.messageId || !replyBody.trim()) return;
    setBusyKey(`reply:${item.id}`);
    setStatusMessage(null);
    
    try {
      const res = await fetch("/api/admin/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboundMessageId: item.messageId,
          body: replyBody,
          markResolved: true,
        }),
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reply failed");
      
      setStatusMessage({ type: 'success', text: "Reply sent and ticket resolved" });
      setReplyBody("");
      setReplyOpenId(null);
      await loadNotifications();
      requestAdminBadgesRefresh();
    } catch (err) {
      setStatusMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : "Failed to send reply" 
      });
    } finally {
      setBusyKey(null);
    }
  };

  const markResolved = async (item: SupportNotificationItem) => {
    if (!item.messageId) return;
    setBusyKey(`resolve:${item.id}`);
    setStatusMessage(null);
    
    try {
      const res = await fetch("/api/admin/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboundMessageId: item.messageId,
          body: "Thanks - we've marked this as resolved. Reply here if you still need help.",
          markResolved: true,
        }),
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to resolve");
      
      setStatusMessage({ type: 'success', text: "Marked as resolved" });
      await loadNotifications();
      requestAdminBadgesRefresh();
    } catch (err) {
      setStatusMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : "Failed to resolve" 
      });
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

  const unresolved = notifications;

  return (
    <Container size="lg" className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Support Inbox</h1>
          <p className="mt-2 text-sm text-text-muted">
            {unresolved.length} unresolved enquir{unresolved.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadNotifications()}
          className="rounded-organic-md bg-surface-mid px-3 py-2 text-sm font-medium text-text"
        >
          Refresh
        </button>
      </div>

      {statusMessage && (
        <div className={cn(
          "mt-4 rounded-organic-lg px-4 py-3 text-sm",
          statusMessage.type === 'success' 
            ? "bg-secondary/20 text-text" 
            : "bg-red-500/20 text-red-900 dark:text-red-200"
        )}>
          {statusMessage.text}
        </div>
      )}

      {loading && notifications.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : unresolved.length === 0 ? (
        <div className="mt-8 rounded-organic-xl border border-border-subtle bg-surface-elevated px-6 py-12 text-center">
          <p className="text-lg font-semibold text-text">All caught up!</p>
          <p className="mt-2 text-sm text-text-muted">
            No unresolved support requests.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {unresolved.map((item) => {
            const isOpen = replyOpenId === item.id;
            const isBusy = busyKey === `reply:${item.id}` || busyKey === `resolve:${item.id}`;
            const isStudentReply = item.kind === 'student_reply';

            return (
              <div
                key={item.id}
                className="rounded-organic-xl border border-border-subtle bg-surface-elevated px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center rounded-organic-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                        isStudentReply 
                          ? "bg-primary/20 text-primary" 
                          : "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                      )}>
                        {isStudentReply ? "Reply" : "New"}
                      </span>
                      <span className="text-xs text-text-subtle">
                        {new Date(item.createdAt).toLocaleString("en-GB")}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-text line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-muted line-clamp-2">
                      {item.preview || "No preview"}
                    </p>
                    <p className="mt-2 text-xs text-text-subtle">
                      From: {item.username || item.email || "Unknown user"}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {!isOpen ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyOpenId(item.id);
                            setReplyBody("");
                            setStatusMessage(null);
                          }}
                          className="rounded-organic-md bg-primary/25 px-4 py-2 text-sm font-semibold text-text whitespace-nowrap"
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void markResolved(item)}
                          className="rounded-organic-md bg-surface-mid px-4 py-2 text-sm font-medium text-text disabled:opacity-50 whitespace-nowrap"
                        >
                          {busyKey === `resolve:${item.id}` ? "Resolving…" : "Mark Done"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyOpenId(null);
                          setReplyBody("");
                        }}
                        className="rounded-organic-md px-4 py-2 text-sm text-text-muted whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-border-subtle">
                    <label className="block text-sm font-medium text-text">
                      Your response
                    </label>
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Type your response…"
                    />
                    <button
                      type="button"
                      disabled={isBusy || !replyBody.trim()}
                      onClick={() => void sendReply(item)}
                      className="mt-3 rounded-organic-md bg-primary/25 px-4 py-2 text-sm font-semibold text-text disabled:opacity-50"
                    >
                      {busyKey === `reply:${item.id}` ? "Sending…" : "Send & Mark Done"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 pt-10 border-t border-border-subtle">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
          Quick Links
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/inbox"
            className="rounded-organic-md bg-surface-mid px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated"
          >
            My Inbox
          </Link>
          <Link
            href="/admin/question-reports"
            className="rounded-organic-md bg-surface-mid px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated"
          >
            Question Reports
          </Link>
          <Link
            href="/admin/feedback"
            className="rounded-organic-md bg-surface-mid px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated"
          >
            Feedback
          </Link>
        </div>
      </div>
    </Container>
  );
}
