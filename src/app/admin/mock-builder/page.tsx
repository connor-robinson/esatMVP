"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import {
  MOCK_BUILDER_SUBJECTS,
  type EsatMockRow,
  type MockBuilderSubject,
} from "@/lib/mockBuilder/types";

export default function AdminMockBuilderPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mocks, setMocks] = useState<EsatMockRow[]>([]);
  const [excludePractice, setExcludePractice] = useState(true);
  const [subject, setSubject] = useState<MockBuilderSubject>("Math 1");
  const [mockNumber, setMockNumber] = useState(1);
  const [creating, setCreating] = useState(false);
  const [labeling, setLabeling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    setExcludePractice(
      data.settings?.excludePublishedMockQuestionsFromPractice !== false,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createMock() {
    setCreating(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/admin/mock-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        mockNumber,
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

  async function labelDifficulty() {
    setLabeling(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/admin/mock-builder/label-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        maxQuestions: 120,
        onlyMissingDifficulty: true,
      }),
    });
    const data = await res.json();
    setLabeling(false);
    if (!res.ok) {
      setError(data.error || "Labeling failed");
      return;
    }
    setInfo(data.message || `Labeled ${data.labeledCount} questions`);
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
      <main className="py-16">
        <Container size="md">
          <p className="text-stone-600">You do not have admin access.</p>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-10">
      <Container size="lg">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500">Admin</p>
            <h1 className="text-2xl font-semibold text-stone-900">
              ESAT Mock Builder
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Assemble cohesive 27-question / 40-minute modules from the question
              bank. Paper-level quality over random selection.
            </p>
          </div>
          <Link
            href="/admin/mock-builder/blueprints"
            className="text-sm text-stone-700 underline"
          >
            Blueprint settings
          </Link>
        </div>

        <label className="mb-8 flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={excludePractice}
            onChange={(e) => toggleExclude(e.target.checked)}
          />
          Exclude published mock questions from ordinary practice
        </label>

        <section className="mb-10 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <h2 className="mb-3 text-sm font-medium text-stone-800">
            Create draft mock
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-stone-600">Subject</span>
              <select
                className="rounded border border-stone-300 bg-white px-2 py-1.5"
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
              <span className="mb-1 block text-stone-600">Mock number</span>
              <input
                type="number"
                min={1}
                max={99}
                className="w-20 rounded border border-stone-300 bg-white px-2 py-1.5"
                value={mockNumber}
                onChange={(e) => setMockNumber(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              disabled={creating}
              onClick={createMock}
              className="rounded bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {creating ? "Generating…" : "Generate draft"}
            </button>
            <button
              type="button"
              disabled={labeling}
              onClick={labelDifficulty}
              className="rounded border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800 disabled:opacity-50"
            >
              {labeling ? "AI labeling…" : "AI-label difficulty (1–5)"}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Mock 1 is marked free; mocks 2–6 are paid (existing entitlement).
            Difficulty 1–5 is assigned by Vertex when missing; generate also
            auto-labels up to ~96 unlabeled questions first.
          </p>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          {info && <p className="mt-2 text-sm text-stone-700">{info}</p>}
        </section>

        {loading ? (
          <p className="text-stone-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-stone-500">
                <tr>
                  <th className="py-2 pr-3">Mock</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Access</th>
                  <th className="py-2 pr-3">Difficulty</th>
                  <th className="py-2 pr-3">Workload</th>
                  <th className="py-2">AI review</th>
                </tr>
              </thead>
              <tbody>
                {mocks.map((m) => (
                  <tr key={m.id} className="border-b border-stone-100">
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/admin/mock-builder/${m.id}`}
                        className="font-medium text-stone-900 underline"
                      >
                        {m.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 capitalize">{m.status}</td>
                    <td className="py-2.5 pr-3">
                      {m.is_free ? "Free" : "Paid"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {m.predicted_difficulty != null
                        ? Number(m.predicted_difficulty).toFixed(1)
                        : "–"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {m.predicted_workload_seconds != null
                        ? `${Math.round(m.predicted_workload_seconds / 60)} min`
                        : "–"}
                    </td>
                    <td className="py-2.5">
                      {m.ai_review
                        ? m.ai_review.pass
                          ? "PASS"
                          : "REVIEW"
                        : "–"}
                    </td>
                  </tr>
                ))}
                {mocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-stone-500">
                      No mocks yet. Generate your first draft above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </main>
  );
}
