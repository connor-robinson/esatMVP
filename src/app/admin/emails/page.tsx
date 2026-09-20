"use client";

import Link from "next/link";
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

type Engagement = {
  emailsSent: number;
  campaignsSent: number;
  openCount: number;
  uniqueOpeners: number;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
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
  subject_b?: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
  open_count: number;
  unique_openers: number;
  click_count: number;
  unique_clickers: number;
  unsubscribe_count: number;
};

type TemplateOption = {
  id: string;
  label: string;
  subject: string;
  subjectB?: string | null;
  text: string;
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
  const [testAddress, setTestAddress] = useState("ansonchanw@gmail.com");
  const [stats, setStats] = useState<Stats | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [abEnabled, setAbEnabled] = useState(false);
  const [subject, setSubject] = useState("");
  const [subjectB, setSubjectB] = useState("");
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
    setEngagement((json.engagement ?? null) as Engagement | null);
    setRecipients(json.recipients ?? []);
    setCampaigns((json.campaigns ?? []) as Campaign[]);
    setTemplates((json.templates ?? []) as TemplateOption[]);
    setConfigured(Boolean(json.configured));
    if (typeof json.testAddress === "string" && json.testAddress.trim()) {
      setTestAddress(json.testAddress.trim());
    }
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

  const applyTemplate = (id: string | null) => {
    setTemplateId(id);
    if (!id) return;
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setSubject(template.subject);
    if (template.subjectB) {
      setAbEnabled(true);
      setSubjectB(template.subjectB);
    } else {
      setAbEnabled(false);
      setSubjectB("");
    }
    setBody(template.text);
  };

  const effectiveSubjectB = abEnabled ? subjectB.trim() : "";
  const canCompose =
    Boolean(subject.trim()) &&
    Boolean(body.trim()) &&
    (!abEnabled ||
      (Boolean(effectiveSubjectB) &&
        effectiveSubjectB !== subject.trim()));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async (opts: {
    dryRun?: boolean;
    testSend?: boolean;
    testVariant?: "a" | "b";
  }) => {
    const dryRun = Boolean(opts.dryRun);
    const testSend = Boolean(opts.testSend);
    setActionError(null);
    setActionOk(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          subjectB: abEnabled ? subjectB.trim() : null,
          body,
          templateId,
          dryRun,
          testSend,
          testVariant: opts.testVariant ?? null,
          confirmed: dryRun || testSend ? true : confirmed,
          recipientIds:
            mode === "selected" && !testSend
              ? Array.from(selected)
              : undefined,
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
          `Dry run: would send to ${json.recipientCount ?? 0} opted-in users` +
            (json.abEnabled ? " with A/B subjects." : "."),
        );
      } else if (testSend) {
        const variantLabel =
          opts.testVariant === "b"
            ? "B"
            : opts.testVariant === "a"
              ? "A"
              : "";
        setActionOk(
          `Test${variantLabel ? ` ${variantLabel}` : ""} sent to ${testAddress}.`,
        );
      } else {
        setActionOk(
          `Sent ${json.sentCount ?? 0} of ${json.recipientCount ?? 0}` +
            (json.failedCount
              ? ` (${json.failedCount} failed)`
              : "") +
            (json.abEnabled ? " (A/B subjects)." : "."),
        );
        setSubject("");
        setSubjectB("");
        setAbEnabled(false);
        setBody("");
        setTemplateId(null);
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
            Tips and Tricks / product updates for users who opted in. Opens and
            clicks are tracked automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/emails/analytics"
            className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text"
          >
            Tracking analytics
          </Link>
          <p
            className={cn(
              "text-xs font-medium",
              configured ? "text-text-muted" : "text-red-600 dark:text-red-400",
            )}
          >
            {configured ? "Resend configured" : "RESEND_API_KEY missing"}
          </p>
        </div>
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

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Emails sent" value={engagement?.emailsSent ?? 0} />
            <Stat
              label="Campaigns sent"
              value={engagement?.campaignsSent ?? 0}
            />
            <Stat
              label="Unique opens"
              value={engagement?.uniqueOpeners ?? 0}
            />
            <Stat label="Link clicks" value={engagement?.clickCount ?? 0} />
            <Stat
              label="People who clicked"
              value={engagement?.uniqueClickers ?? 0}
            />
            <Stat
              label="Unsubscribed via email"
              value={engagement?.unsubscribeCount ?? 0}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-organic-xl bg-surface-elevated px-5 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                Compose tips email
              </h2>

              {templates.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-medium text-text-muted">
                    Template
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate(null)}
                      className={cn(
                        "rounded-organic-md px-3 py-1.5 text-sm font-medium",
                        templateId === null
                          ? "bg-secondary/25 text-text"
                          : "bg-surface-mid text-text-muted hover:text-text",
                      )}
                    >
                      Custom text
                    </button>
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t.id)}
                        className={cn(
                          "rounded-organic-md px-3 py-1.5 text-sm font-medium",
                          templateId === t.id
                            ? "bg-secondary/25 text-text"
                            : "bg-surface-mid text-text-muted hover:text-text",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {templateId ? (
                    <p className="mt-2 text-xs text-text-subtle">
                      HTML template selected. Links, opens, and unsubscribe
                      are tracked on send.
                    </p>
                  ) : null}
                </div>
              ) : null}

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

              <label className="mt-4 flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={abEnabled}
                  onChange={(e) => setAbEnabled(e.target.checked)}
                />
                <span>A/B test subject line (50/50 split)</span>
              </label>

              <label className="mt-3 block text-xs font-medium text-text-muted">
                {abEnabled ? "Subject A" : "Subject"}
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1.5 w-full rounded-organic-md bg-surface-mid px-3 py-2 text-sm text-text"
                  placeholder={
                    abEnabled
                      ? "Access your 5 Free ESAT Mocks from us"
                      : "Tips and Tricks: …"
                  }
                />
              </label>

              {abEnabled ? (
                <label className="mt-3 block text-xs font-medium text-text-muted">
                  Subject B
                  <input
                    value={subjectB}
                    onChange={(e) => setSubjectB(e.target.value)}
                    className="mt-1.5 w-full rounded-organic-md bg-surface-mid px-3 py-2 text-sm text-text"
                    placeholder="About the ESAT Mock papers"
                  />
                </label>
              ) : null}

              <label className="mt-3 block text-xs font-medium text-text-muted">
                Body {templateId ? "(plain-text fallback)" : ""}
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (templateId) setTemplateId(null);
                  }}
                  rows={8}
                  className="mt-1.5 w-full rounded-organic-md bg-surface-mid px-3 py-2 text-sm text-text"
                  placeholder="Write the product email…"
                />
              </label>

              <p className="mt-2 text-xs text-text-subtle">
                Every send includes open tracking and click-tracked links, plus
                manage-preferences and unsubscribe footer links. Test sends
                always go only to {testAddress}.
                {abEnabled
                  ? " Recipients are split evenly between subjects A and B."
                  : ""}
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
                  disabled={busy || !canCompose}
                  onClick={() => void send({ dryRun: true })}
                  className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                >
                  Dry run
                </button>
                {abEnabled ? (
                  <>
                    <button
                      type="button"
                      disabled={busy || !canCompose}
                      onClick={() =>
                        void send({ testSend: true, testVariant: "a" })
                      }
                      className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                    >
                      {busy ? "Sending…" : "Send test A"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !canCompose}
                      onClick={() =>
                        void send({ testSend: true, testVariant: "b" })
                      }
                      className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                    >
                      {busy ? "Sending…" : "Send test B"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !canCompose}
                    onClick={() => void send({ testSend: true })}
                    className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                  >
                    {busy ? "Sending…" : `Send test to ${testAddress}`}
                  </button>
                )}
                <button
                  type="button"
                  disabled={
                    busy ||
                    !canCompose ||
                    !confirmed ||
                    (mode === "selected" && selected.size === 0)
                  }
                  onClick={() => void send({})}
                  className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text disabled:opacity-50"
                >
                  {busy ? "Sending…" : abEnabled ? "Send A/B email" : "Send email"}
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
                  className="w-40 rounded-organic-md bg-surface-mid px-2.5 py-1.5 text-xs text-text"
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-text">
                Recent campaigns
              </h2>
              <Link
                href="/admin/emails/analytics"
                className="text-sm font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
              >
                Full tracking →
              </Link>
            </div>
            <div className="mt-3 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                    <th className="px-4 py-3 font-medium">Opens</th>
                    <th className="px-4 py-3 font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">People</th>
                    <th className="px-4 py-3 font-medium">Unsub</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-border-subtle">
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {new Date(c.created_at).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-2.5 text-text">
                        {c.subject_b ? (
                          <span>
                            <span className="mr-1.5 rounded-organic-md bg-secondary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text">
                              A/B
                            </span>
                            <span className="block text-xs text-text-muted">
                              A: {c.subject}
                            </span>
                            <span className="block text-xs text-text-muted">
                              B: {c.subject_b}
                            </span>
                          </span>
                        ) : (
                          c.subject
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{c.status}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.sent_count}/{c.recipient_count}
                        {c.failed_count ? ` · ${c.failed_count} fail` : ""}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.unique_openers ?? 0}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.click_count ?? 0}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.unique_clickers ?? 0}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.unsubscribe_count ?? 0}
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
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
