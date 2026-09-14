"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import type { MockPoolInventory } from "@/lib/mockBuilder/types";
import { compareDifficultyToTypicalEsat } from "@/lib/mockBuilder/difficultyVsTypical";
import {
  MOCK_BUILDER_SUBJECTS,
  type EsatMockRow,
  type MockBuilderSubject,
} from "@/lib/mockBuilder/types";

type DiagramAvailability = Record<
  string,
  { available: number; reserved: number; defaultTarget: number }
>;

function InventoryTable({
  title,
  caption,
  headers,
  rows,
  footer,
}: {
  title: string;
  caption: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  footer?: Array<string | number>;
}) {
  return (
    <section className="rounded-organic-xl bg-surface-elevated px-5 py-5">
      <h2 className="font-heading text-base font-semibold text-text">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{caption}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-subtle text-text-muted">
            <tr>
              {headers.map((h) => (
                <th key={h} className="py-2 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border-subtle/60">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`py-2.5 pr-3 ${j === 0 ? "text-text" : "tabular-nums text-text"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="py-6 text-text-muted"
                >
                  No rows yet.
                </td>
              </tr>
            ) : null}
          </tbody>
          {footer ? (
            <tfoot>
              <tr className="border-t border-border-subtle font-semibold text-text">
                {footer.map((cell, j) => (
                  <td
                    key={j}
                    className={`py-2.5 pr-3 ${j > 0 ? "tabular-nums" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
}

export default function AdminMockBuilderPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mocks, setMocks] = useState<EsatMockRow[]>([]);
  const [inventory, setInventory] = useState<MockPoolInventory | null>(null);
  const [excludePractice, setExcludePractice] = useState(true);
  const [subject, setSubject] = useState<MockBuilderSubject>("Math 1");
  const [mockNumber, setMockNumber] = useState(1);
  const [diagramCount, setDiagramCount] = useState(3);
  const [diagramAvailability, setDiagramAvailability] =
    useState<DiagramAvailability>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/mock-builder", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load");
      setLoading(false);
      return;
    }
    setMocks(data.mocks ?? []);
    setInventory(data.inventory ?? null);
    setExcludePractice(
      data.settings?.excludePublishedMockQuestionsFromPractice !== false,
    );
    setDiagramAvailability(data.diagramAvailability ?? {});
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const meta = diagramAvailability[subject];
    if (!meta) return;
    const next = Math.min(meta.defaultTarget || 3, meta.available);
    setDiagramCount(next);
  }, [subject, diagramAvailability]);

  const diagramMeta = diagramAvailability[subject];
  const diagramHint = useMemo(() => {
    if (!diagramMeta) return "Loading diagram availability…";
    return `${diagramMeta.available} diagrams available for mocks (free-tier 10 excluded; ${diagramMeta.reserved} already reserved).`;
  }, [diagramMeta]);

  async function createMock() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/mock-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        mockNumber,
        diagramCount,
        generate: true,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Create failed");
      return;
    }
    await load();
    if (data.mock?.id) {
      window.location.href = `/admin/mock-builder/${data.mock.id}`;
    }
  }

  async function toggleExclude(next: boolean) {
    setExcludePractice(next);
    await fetch("/api/admin/mock-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "settings",
        excludePublishedMockQuestionsFromPractice: next,
      }),
    });
  }

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  const offBankSubjects =
    inventory?.subjects.filter((row) => row.totalNotInPracticeBank > 0) ?? [];
  const offBankRows = offBankSubjects.map((row) => [
    row.subject,
    row.mockStaged,
    row.pending,
    row.totalNotInPracticeBank,
  ]);
  const offBankTotals = offBankSubjects.reduce(
    (acc, row) => {
      acc.mockStaged += row.mockStaged;
      acc.pending += row.pending;
      acc.total += row.totalNotInPracticeBank;
      return acc;
    },
    { mockStaged: 0, pending: 0, total: 0 },
  );

  const unattemptedSubjects =
    inventory?.subjects.filter((row) => row.unattemptedInBank > 0) ?? [];
  const unattemptedRows = unattemptedSubjects.map((row) => [
    row.subject,
    row.unattemptedInBank,
  ]);
  const unattemptedTotal = unattemptedSubjects.reduce(
    (sum, row) => sum + row.unattemptedInBank,
    0,
  );

  return (
    <Container size="lg" className="py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Mocks</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Assemble cohesive 27-question / 40-minute ESAT modules. Pool
            inventory below shows what you can work with.
          </p>
        </div>
        <Link
          href="/admin/mock-builder/blueprints"
          className="text-sm text-text-muted underline-offset-2 hover:text-text hover:underline"
        >
          Blueprint settings
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <div className="mb-10 grid gap-4 lg:grid-cols-2">
          <InventoryTable
            title="Not in question bank (officially)"
            caption="Overnight / withheld from practice, plus still-pending rows. Mock-staged are approved with practice_eligible=false so the mock builder can use them without putting them in the student bank."
            headers={["Subject", "Mock-staged", "Pending", "Total"]}
            rows={offBankRows}
            footer={
              offBankSubjects.length
                ? [
                    "Total",
                    offBankTotals.mockStaged,
                    offBankTotals.pending,
                    offBankTotals.total,
                  ]
                : undefined
            }
          />
          <InventoryTable
            title="In question bank, never attempted"
            caption="Approved practice-bank questions with zero attempts from anyone. Still available for mock drafts (unless already reserved)."
            headers={["Subject", "Unattempted"]}
            rows={unattemptedRows}
            footer={
              unattemptedSubjects.length
                ? ["Total", unattemptedTotal]
                : undefined
            }
          />
        </div>
      )}

      <label className="mb-8 flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={excludePractice}
          onChange={(e) => toggleExclude(e.target.checked)}
        />
        Exclude published mock questions from ordinary practice
      </label>

      <section className="mb-10 rounded-organic-xl bg-surface-elevated px-5 py-5">
        <h2 className="mb-3 text-sm font-semibold text-text">
          Create draft mock
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-text-muted">Subject</span>
            <select
              className="rounded-organic-md border border-border-subtle bg-surface px-2 py-1.5 text-text"
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value as MockBuilderSubject)
              }
            >
              {MOCK_BUILDER_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-text-muted">Mock number</span>
            <input
              type="number"
              min={1}
              max={99}
              className="w-20 rounded-organic-md border border-border-subtle bg-surface px-2 py-1.5 text-text"
              value={mockNumber}
              onChange={(e) => setMockNumber(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-text-muted">Diagram questions</span>
            <input
              type="number"
              min={0}
              max={27}
              className="w-24 rounded-organic-md border border-border-subtle bg-surface px-2 py-1.5 text-text"
              value={diagramCount}
              onChange={(e) => setDiagramCount(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            disabled={creating}
            onClick={createMock}
            className="rounded-organic-md bg-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? "Labeling + generating…" : "Generate draft"}
          </button>
        </div>
        <p className="mt-2 text-xs text-text-subtle">{diagramHint}</p>
        <p className="mt-1 text-xs text-text-subtle">
          Generate first AI-labels missing 1–5 difficulty for this subject
          (batch of unlabeled approved questions, not the whole bank), then
          assembles the draft. Free-tier preview questions (first 10 per
          subject) are never used. Approved/published mock questions stay
          reserved and cannot be reused.
        </p>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </section>

      {loading ? null : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-subtle text-text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Mock</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Access</th>
                <th className="py-2 pr-3 font-medium">Difficulty</th>
                <th className="py-2 pr-3 font-medium">Vs typical ESAT</th>
                <th className="py-2 pr-3 font-medium">Workload</th>
                <th className="py-2 font-medium">AI review</th>
              </tr>
            </thead>
            <tbody>
              {mocks.map((m) => {
                const vs = compareDifficultyToTypicalEsat(
                  m.predicted_difficulty,
                  m.blueprint_snapshot,
                );
                return (
                <tr key={m.id} className="border-b border-border-subtle/60">
                  <td className="py-2.5 pr-3">
                    <Link
                      href={`/admin/mock-builder/${m.id}`}
                      className="font-medium text-text underline-offset-2 hover:underline"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 capitalize text-text">{m.status}</td>
                  <td className="py-2.5 pr-3 text-text">
                    {m.is_free ? "Free" : "Paid"}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-text">
                    {m.predicted_difficulty != null
                      ? Number(m.predicted_difficulty).toFixed(1)
                      : "–"}
                  </td>
                  <td className="py-2.5 pr-3 text-text">{vs?.label ?? "–"}</td>
                  <td className="py-2.5 pr-3 tabular-nums text-text">
                    {m.predicted_workload_seconds != null
                      ? `${Math.round(m.predicted_workload_seconds / 60)} min`
                      : "–"}
                  </td>
                  <td className="py-2.5 text-text">
                    {m.ai_review
                      ? m.ai_review.pass
                        ? "PASS"
                        : "REVIEW"
                      : "–"}
                  </td>
                </tr>
                );
              })}
              {mocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-text-muted">
                    No mocks yet. Generate your first draft above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
