"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { formatExpiry } from "@/lib/tester/format";
import { cn } from "@/lib/utils";
import type { TesterConfig, Stage3ApprovalMode } from "@/lib/tester/types";

interface AdminTester {
  id: string;
  userId: string;
  username: string | null;
  status: string;
  currentStage: number;
  joinedAt: string;
  stage1ExpiresAt: string | null;
  stage2ExpiresAt: string | null;
  stage3ExpiresAt: string | null;
  meaningfulSessions: number;
  initialSurveyDone: boolean;
  feedbackSurveyDone: boolean;
  finalSurveyDone: boolean;
  foundingDiscountEligible: boolean;
  testimonialPermission: string | null;
  testimonialDisplayType: string | null;
  followUpAllowed: boolean | null;
  manuallyApproved: boolean;
  marketingConsent: boolean;
}

const FILTERS = [
  { id: "", label: "All" },
  { id: "willing_to_pay", label: "Willing to pay" },
  { id: "very_disappointed", label: "Very disappointed" },
  { id: "testimonial_candidate", label: "Testimonial candidates" },
];

export default function AdminFoundingTesterPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testers, setTesters] = useState<AdminTester[]>([]);
  const [config, setConfig] = useState<TesterConfig | null>(null);
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/admin/tester${filter ? `?filter=${filter}` : ""}`,
      { cache: "no-store" },
    );
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTesters(data.testers ?? []);
    setConfig(data.config ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (id: string, action: string) => {
    let days: number | undefined;
    if (action === "grant" || action === "extend") {
      const input = window.prompt(`Number of days to ${action}?`, "30");
      if (!input) return;
      days = Number(input);
      if (!Number.isFinite(days) || days < 1) return;
    }
    if (action === "revoke" || action === "reset") {
      if (!window.confirm(`Are you sure you want to ${action} this tester?`)) return;
    }
    await fetch(`/api/admin/tester/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, days }),
    });
    await load();
  };

  if (forbidden) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-organic-xl bg-surface-elevated p-8 text-center">
          <h1 className="text-xl font-bold text-text">Admins only</h1>
          <p className="mt-3 text-sm text-text-muted">
            You don’t have permission to view this page.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-text">Founding Tester admin</h1>
          <div className="flex gap-2">
            <a
              href="/api/admin/tester/export?type=surveys"
              className="rounded-full bg-surface-elevated px-4 py-2 text-sm font-semibold text-text hover:opacity-90"
            >
              Export surveys CSV
            </a>
            <a
              href="/api/admin/tester/export?type=metrics"
              className="rounded-full bg-surface-elevated px-4 py-2 text-sm font-semibold text-text hover:opacity-90"
            >
              Export metrics CSV
            </a>
          </div>
        </div>

        {config ? <ConfigEditor config={config} onSaved={load} /> : null}

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  filter === f.id
                    ? "bg-primary/20 text-text"
                    : "bg-surface-elevated text-text-muted hover:text-text",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-40 animate-pulse rounded-organic-xl bg-surface-subtle" />
          ) : testers.length === 0 ? (
            <p className="text-sm text-text-muted">No testers found.</p>
          ) : (
            <div className="overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Sessions</th>
                    <th className="px-4 py-3">Surveys</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testers.map((t) => (
                    <TesterRow
                      key={t.id}
                      tester={t}
                      open={openId === t.id}
                      onToggle={() => setOpenId(openId === t.id ? null : t.id)}
                      onAction={(a) => runAction(t.id, a)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function activeExpiry(t: AdminTester): string | null {
  if (t.status === "stage_1_active") return t.stage1ExpiresAt;
  if (t.status === "stage_2_active") return t.stage2ExpiresAt;
  if (t.status === "stage_3_active") return t.stage3ExpiresAt;
  return null;
}

function TesterRow({
  tester,
  open,
  onToggle,
  onAction,
}: {
  tester: AdminTester;
  open: boolean;
  onToggle: () => void;
  onAction: (action: string) => void;
}) {
  const expiry = activeExpiry(tester);
  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3 text-text">
          <div className="font-medium">{tester.username ?? "-"}</div>
          <div className="text-xs text-text-muted">{tester.userId.slice(0, 8)}</div>
        </td>
        <td className="px-4 py-3 text-text-muted">{tester.status}</td>
        <td className="px-4 py-3 text-text-muted">
          {expiry ? formatExpiry(expiry) : "-"}
        </td>
        <td className="px-4 py-3 text-text-muted">{tester.meaningfulSessions}</td>
        <td className="px-4 py-3 text-text-muted">
          {[
            tester.initialSurveyDone ? "I" : "",
            tester.feedbackSurveyDone ? "F1" : "",
            tester.finalSurveyDone ? "F2" : "",
          ]
            .filter(Boolean)
            .join(" · ") || "-"}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn label="View" onClick={onToggle} />
            {tester.status === "awaiting_manual_approval" ? (
              <>
                <ActionBtn label="Approve" onClick={() => onAction("approve")} />
                <ActionBtn label="Reject" onClick={() => onAction("reject")} />
              </>
            ) : null}
            <ActionBtn label="Grant" onClick={() => onAction("grant")} />
            <ActionBtn label="Extend" onClick={() => onAction("extend")} />
            <ActionBtn label="Revoke" onClick={() => onAction("revoke")} />
            <ActionBtn label="Reset" onClick={() => onAction("reset")} />
          </div>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={6} className="px-4 pb-4">
            <ResponsesPanel id={tester.id} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-text transition-colors hover:bg-surface-mid"
    >
      {label}
    </button>
  );
}

function ResponsesPanel({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<
    { survey_key: string; questionLabel: string; answer_value: unknown }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/admin/tester/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (mounted) {
          setResponses(d.responses ?? []);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className="h-16 animate-pulse rounded-organic-md bg-surface-subtle" />;
  }
  if (responses.length === 0) {
    return <p className="text-sm text-text-muted">No survey responses yet.</p>;
  }

  return (
    <div className="rounded-organic-md bg-surface-subtle p-4">
      {responses.map((r, i) => (
        <div key={i} className="border-b border-border-subtle py-2 last:border-0">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {r.survey_key}
          </p>
          <p className="text-sm font-medium text-text">{r.questionLabel}</p>
          <p className="text-sm text-text-muted">
            {Array.isArray(r.answer_value)
              ? r.answer_value.join(", ")
              : String(r.answer_value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ConfigEditor({
  config,
  onSaved,
}: {
  config: TesterConfig;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TesterConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof TesterConfig>(key: K, value: TesterConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/tester", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    onSaved();
  };

  return (
    <div className="rounded-organic-xl bg-surface-elevated p-6">
      <h2 className="text-lg font-bold text-text">Programme configuration</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumField label="Stage 1 (hours)" value={form.stage_1_hours} onChange={(v) => update("stage_1_hours", v)} />
        <NumField label="Stage 2 (days)" value={form.stage_2_days} onChange={(v) => update("stage_2_days", v)} />
        <NumField label="Stage 3 (days)" value={form.stage_3_days} onChange={(v) => update("stage_3_days", v)} />
        <NumField label="Min session seconds" value={form.meaningful_session_min_seconds} onChange={(v) => update("meaningful_session_min_seconds", v)} />
        <NumField label="Min session questions" value={form.meaningful_session_min_questions} onChange={(v) => update("meaningful_session_min_questions", v)} />
        <NumField label="Founding discount %" value={form.founding_discount_percent} onChange={(v) => update("founding_discount_percent", v)} />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Stage 3 approval
          </label>
          <select
            value={form.stage_3_approval_mode}
            onChange={(e) => update("stage_3_approval_mode", e.target.value as Stage3ApprovalMode)}
            className="mt-1 w-full rounded-organic-md bg-surface-subtle px-3 py-2 text-sm text-text focus:outline-none"
          >
            <option value="auto">Automatic approval</option>
            <option value="manual">Manual approval</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => update("offer_to_paid_users", !form.offer_to_paid_users)}
            className="flex items-center gap-2 text-sm text-text"
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-organic-sm text-background",
                form.offer_to_paid_users ? "bg-primary" : "bg-surface-subtle",
              )}
            >
              {form.offer_to_paid_users ? "✓" : ""}
            </span>
            Offer to paid users
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Discount code (optional)
          </label>
          <input
            type="text"
            value={form.founding_discount_code ?? ""}
            onChange={(e) => update("founding_discount_code", e.target.value || null)}
            className="mt-1 w-full rounded-organic-md bg-surface-subtle px-3 py-2 text-sm text-text focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-text px-6 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save configuration"}
        </button>
        {saved ? <span className="text-sm text-success">Saved</span> : null}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-organic-md bg-surface-subtle px-3 py-2 text-sm text-text focus:outline-none"
      />
    </div>
  );
}
