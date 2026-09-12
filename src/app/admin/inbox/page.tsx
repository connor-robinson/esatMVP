"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type {
  InboxAudience,
  InboxMessageListItem,
  InboxUserSearchHit,
} from "@/lib/inbox";
import { cn } from "@/lib/utils";

export default function AdminInboxPage() {
  const [forbidden, setForbidden] = useState(false);
  const [messages, setMessages] = useState<InboxMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [audience, setAudience] = useState<InboxAudience>("broadcast");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<InboxUserSearchHit[]>([]);
  const [selected, setSelected] = useState<InboxUserSearchHit[]>([]);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/inbox", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMessages(data.messages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const send = async () => {
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
      await load();
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
          <h1 className="text-2xl font-bold text-text">Inbox</h1>
          <p className="mt-2 text-sm text-text-muted">
            Send a personal note to specific users, or a general message to
            everyone.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/admin/support"
            className="text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Support
          </Link>
          <Link
            href="/inbox"
            className="text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            My inbox
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-organic-xl bg-surface-elevated px-5 py-5 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
          Compose
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: "broadcast", label: "Everyone" },
              { id: "personal", label: "Specific users" },
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
          rows={6}
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
          disabled={sending || !subject.trim() || !body.trim()}
          onClick={() => void send()}
          className="mt-4 rounded-organic-md bg-secondary/25 px-4 py-2 text-sm font-semibold text-text transition-opacity disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
          Sent ({messages.length})
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-text-muted">Loading…</p>
        ) : (
          <div className="mt-4 space-y-4">
            {messages.map((m) => (
              <article
                key={m.id}
                className="rounded-organic-xl bg-surface-elevated px-5 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      {m.audience === "broadcast"
                        ? "Everyone"
                        : `Personal · ${m.recipients?.length ?? 0} recipient${(m.recipients?.length ?? 0) === 1 ? "" : "s"}`}
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
                    To:{" "}
                    {m.recipients
                      .map((r) => r.username || r.email || r.user_id.slice(0, 8))
                      .join(", ")}
                  </p>
                ) : null}
              </article>
            ))}
            {messages.length === 0 ? (
              <p className="text-sm text-text-muted">No messages sent yet.</p>
            ) : null}
          </div>
        )}
      </section>
    </Container>
  );
}
