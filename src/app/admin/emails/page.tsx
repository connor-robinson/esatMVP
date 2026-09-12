"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

type Stats = {
  optedIn: number;
  optedOut: number;
  notAsked: number;
  sendable: number;
  totalProfiles: number;
};

type Recipient = {
  id: string;
  email: string;
  username: string | null;
  exam_preference: string | null;
};

type Campaign = {
  id: string;
  subject: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-organic-lg bg-surface-elevated px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

export default function AdminEmailsPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/emails", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setActionError(
        typeof json.error === "string" ? json.error : "Failed to load",
      );
      setLoading(false);
      return;
    }
    setStats(json.stats ?? null);
    setRecipients(json.recipients ?? []);
    setCampaigns(json.campaigns ?? []);
    setConfigured(Boolean(json.configured));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.username ?? "").toLowerCase().includes(q) ||
        (r.exam_preference ?? "").toLowerCase().includes(q),
    );
  }, [recipients, filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async (dryRun: boolean) => {
    setActionError(null);
    setActionOk(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          dryRun,
          confirmed: dryRun ? true : confirmed,
          recipientIds:
            mode === "selected" ? Array.from(selected) : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          typeof json.error === "string" ? json.error : "Send failed",
        );
        return;
      }
      if (dryRun) {
        setActionOk(
          `Dry run: would send to ${json.recipientCount ?? 0} opted-in users.`,
        );
      } else {
        setActionOk(
          `Sent ${json.sentCount ?? 0} of ${json.recipientCount ?? 0}` +
            (json.failedCount
              ? ` (${json.failedCount} failed)`
              : "") +
            ".",
        );
        setSubject("");
        setBody("");
        setConfirmed(false);
        setSelected(new Set());
      }
      if (Array.isArray(json.errors) && json.errors.length > 0) {
        setActionError(json.errors.join(" · "));
      }
      await load();
    } catch {
      setActionError("Send failed");
    } finally {
      setBusy(false);
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
    <Container size="lg" className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Product emails</h1>
          <p className="mt-1 text-sm text-text-muted">
            Tips and Tricks / product updates for users who opted in.
          </p>
        </div>
        <p
          className={cn(
            "text-xs font-medium",
            configured ? "text-text-muted" : "text-red-600 dark:text-red-400",
          )}
        >
          {configured ? "Resend configured" : "RESEND_API_KEY missing"}
        </p>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Opted in" value={stats?.optedIn ?? 0} />
            <Stat label="Sendable (has email)" value={stats?.sendable ?? 0} />
            <Stat label="Opted out" value={stats?.optedOut ?? 0} />
            <Stat label="Not asked yet" value={stats?.notAsked ?? 0} />
            <Stat label="Profiles total" value={stats?.totalProfiles ?? 0} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-organic-xl bg-surface-elevated px-5 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                Compose tips email
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    { id: "all", label: "All opted-in" },
                    { id: "selected", label: "Selected only" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={cn(
                      "rounded-organic-md px-3 py-1.5 text-sm font-medium",
                      mode === opt.id
                        ? "bg-secondary/25 text-text"
                        : "bg-surface-mid text-text-muted hover:text-text",
                    )}
                  >
                    {opt.label}
                    {opt.id === "selected" ? ` (${selected.size})` : ""}
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-xs font-medium text-text-muted">
                Subject
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1.5 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
                  placeholder="Tips and Tricks: …"
                />
              </label>

              <label className="mt-3 block text-xs font-medium text-text-muted">
                Body
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="mt-1.5 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
                  placeholder="Write the product email…"
                />
              </label>

              <p className="mt-2 text-xs text-text-subtle">
                Footer auto-adds an opt-in note and link to /profile.
              </p>

              <label className="mt-4 flex items-start gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I confirm this is a product / Tips and Tricks email to users
                  with product emails enabled
                  {mode === "selected"
                    ? ` (${selected.size} selected)`
                    : ` (${stats?.sendable ?? 0} sendable)`}
                  .
                </span>
              </label>

              {actionError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {actionError}
                </p>
              ) : null}
              {actionOk ? (
                <p className="mt-3 text-sm text-text-muted">{actionOk}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !subject.trim() || !body.trim()}
                  onClick={() => void send(true)}
                  className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                >
                  Dry run
                </button>
                <button
                  type="button"
                  disabled={
                    busy ||
                    !subject.trim() ||
                    !body.trim() ||
                    !confirmed ||
                    (mode === "selected" && selected.size === 0)
                  }
                  onClick={() => void send(false)}
                  className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send email"}
                </button>
              </div>
            </section>

            <section className="rounded-organic-xl bg-surface-elevated px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Opted in ({recipients.length})
                </h2>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-40 rounded-organic-md border border-border-subtle bg-surface-mid px-2.5 py-1.5 text-xs text-text"
                />
              </div>
              <div className="mt-3 max-h-[28rem] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface-elevated text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      {mode === "selected" ? (
                        <th className="py-2 pr-2 font-medium"> </th>
                      ) : null}
                      <th className="py-2 pr-2 font-medium">User</th>
                      <th className="py-2 pr-2 font-medium">Email</th>
                      <th className="py-2 font-medium">Exam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-border-subtle"
                      >
                        {mode === "selected" ? (
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={selected.has(r.id)}
                              onChange={() => toggle(r.id)}
                              aria-label={`Select ${r.email}`}
                            />
                          </td>
                        ) : null}
                        <td className="py-2 pr-2 text-text">
                          {r.username || "-"}
                        </td>
                        <td className="py-2 pr-2 text-text-muted">{r.email}</td>
                        <td className="py-2 text-text-muted">
                          {r.exam_preference || "-"}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={mode === "selected" ? 4 : 3}
                          className="py-6 text-sm text-text-muted"
                        >
                          No opted-in users match.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-text">Recent campaigns</h2>
            <div className="mt-3 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-border-subtle">
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {new Date(c.created_at).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-2.5 text-text">{c.subject}</td>
                      <td className="px-4 py-2.5 text-text-muted">{c.status}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.sent_count}/{c.recipient_count}
                        {c.failed_count ? ` · ${c.failed_count} fail` : ""}
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-sm text-text-muted"
                      >
                        No campaigns yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </Container>
  );
}
