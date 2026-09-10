"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import type {
  EsatMockRow,
  MockCandidateQuestion,
  MockSlot,
  MockStatus,
  PaperCalibrationStats,
  QuestionCalibrationStats,
} from "@/lib/mockBuilder/types";

type AlternativesState = {
  position: number;
  items: MockCandidateQuestion[];
} | null;

export default function AdminMockDetailPage() {
  const params = useParams();
  const mockId = String(params.mockId);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState<EsatMockRow | null>(null);
  const [slots, setSlots] = useState<MockSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativesState>(null);
  const [stats, setStats] = useState<{
    paper: PaperCalibrationStats;
    questionStats: QuestionCalibrationStats[];
  } | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/mock-builder/${mockId}`, {
      cache: "no-store",
    });
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
    setMock(data.mock);
    setSlots(data.slots ?? []);
    setLoading(false);
  }, [mockId]);

  useEffect(() => {
    load();
  }, [load]);

  const topicSummary = useMemo(() => {
    if (!mock?.topic_coverage) return "";
    return Object.entries(mock.topic_coverage)
      .map(([k, v]) => `${k}:${v}`)
      .join(" · ");
  }, [mock]);

  const presentationSummary = useMemo(() => {
    if (!mock?.presentation_mix) return "";
    return Object.entries(mock.presentation_mix)
      .map(([k, v]) => `${k}:${v}`)
      .join(" · ");
  }, [mock]);

  async function run(action: string, fn: () => Promise<void>) {
    setBusy(action);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    await run("generate", async () => {
      const res = await fetch(`/api/admin/mock-builder/${mockId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepLocks: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
    });
  }

  async function aiReview() {
    await run("review", async () => {
      const res = await fetch(`/api/admin/mock-builder/${mockId}/review`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");
    });
  }

  async function setStatus(status: MockStatus) {
    await run(status, async () => {
      const res = await fetch(`/api/admin/mock-builder/${mockId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");
    });
  }

  async function cancelMock() {
    const ok = window.confirm(
      "Cancel this mock? It will be deleted and its questions freed for other mocks (unless still used elsewhere).",
    );
    if (!ok) return;
    setBusy("cancel");
    setError(null);
    try {
      const res = await fetch(`/api/admin/mock-builder/${mockId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancel failed");
      window.location.href = "/admin/mock-builder";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
      setBusy(null);
    }
  }

  async function loadStats() {
    await run("stats", async () => {
      const res = await fetch(`/api/admin/mock-builder/${mockId}/stats`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Stats failed");
      setStats(data);
    });
  }

  async function toggleLock(position: number, locked: boolean) {
    await run("lock", async () => {
      const res = await fetch(`/api/admin/mock-builder/${mockId}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock", position, locked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lock failed");
      setSlots(data.slots ?? []);
      setMock(data.mock);
    });
  }

  async function move(position: number, dir: -1 | 1) {
    const to = position + dir;
    if (to < 1 || to > slots.length) return;
    await run("move", async () => {
      const res = await fetch(`/api/admin/mock-builder/${mockId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPosition: position, toPosition: to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reorder failed");
      setSlots(data.slots ?? []);
    });
  }

  async function openReplace(position: number) {
    setBusy("alts");
    const res = await fetch(
      `/api/admin/mock-builder/${mockId}/replace?position=${position}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Failed to load alternatives");
      return;
    }
    setAlternatives({ position, items: data.alternatives ?? [] });
  }

  async function applyReplace(position: number, questionId: string) {
    await run("replace", async () => {
      const res = await fetch(`/api/admin/mock-builder/${mockId}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, questionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Replace failed");
      setAlternatives(null);
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

  if (loading || !mock) {
    return (
      <main className="py-16">
        <Container size="md">
          <p className="text-stone-500">{error ?? "Loading…"}</p>
        </Container>
      </main>
    );
  }

  const aiLabel = mock.ai_review
    ? mock.ai_review.pass
      ? "PASS"
      : "REVIEW"
    : "–";

  return (
    <main className="py-10">
      <Container size="lg">
        <div className="mb-6">
          <Link href="/admin/mock-builder" className="text-sm text-stone-600 underline">
            ← All mocks
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">
            {mock.title}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {mock.question_count} questions · {mock.time_limit_minutes} minutes ·{" "}
            {mock.is_free ? "FREE" : "PAID"} · status{" "}
            <span className="capitalize">{mock.status}</span>
          </p>
        </div>

        <div className="mb-6 grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="text-stone-500">Predicted difficulty</div>
            <div className="font-medium">
              {mock.predicted_difficulty != null
                ? `${Number(mock.predicted_difficulty).toFixed(1)} / 5`
                : "–"}
            </div>
          </div>
          <div>
            <div className="text-stone-500">Predicted workload</div>
            <div className="font-medium">
              {mock.predicted_workload_seconds != null
                ? `${Math.round(mock.predicted_workload_seconds / 60)} min (${mock.predicted_workload_seconds}s)`
                : "–"}
            </div>
          </div>
          <div>
            <div className="text-stone-500">AI review</div>
            <div className="font-medium">{aiLabel}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-stone-500">Topic coverage</div>
            <div className="font-medium break-words">{topicSummary || "–"}</div>
          </div>
          <div>
            <div className="text-stone-500">Presentation mix</div>
            <div className="font-medium">{presentationSummary || "–"}</div>
          </div>
        </div>

        {mock.ai_review && (
          <div className="mb-6 rounded-lg border border-stone-200 p-4 text-sm">
            <h2 className="mb-2 font-medium">AI paper review (advisory)</h2>
            <p className="text-stone-600">
              Scores: overall {mock.ai_review.overallScore}, difficulty{" "}
              {mock.ai_review.difficultyScore}, timing {mock.ai_review.timingScore},
              topics {mock.ai_review.topicCoverageScore}, variety{" "}
              {mock.ai_review.varietyScore}
            </p>
            {mock.ai_review.issues?.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-stone-700">
                {mock.ai_review.issues.map((issue, i) => (
                  <li key={i}>
                    [{issue.severity}] {issue.message}
                    {issue.questions?.length
                      ? ` (Q${issue.questions.join(", Q")})`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {Array.isArray((mock.generation_notes as { gaps?: unknown } | null)?.gaps) &&
          ((mock.generation_notes as { gaps: Array<{ message: string }> }).gaps
            .length > 0) && (
            <div className="mb-6 rounded-lg border border-stone-200 p-4 text-sm">
              <h2 className="mb-2 font-medium">Blueprint gaps (for generation)</h2>
              <ul className="list-disc pl-5 text-stone-700">
                {(
                  mock.generation_notes as { gaps: Array<{ message: string }> }
                ).gaps.map((g, i) => (
                  <li key={i}>{g.message}</li>
                ))}
              </ul>
            </div>
          )}

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={regenerate}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            {busy === "generate" ? "…" : "Regenerate (keep locks)"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={aiReview}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            {busy === "review" ? "…" : "Run AI paper review"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={loadStats}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            {busy === "stats" ? "…" : "Load calibration"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => setStatus("review")}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            Mark review
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => setStatus("approved")}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => setStatus("published")}
            className="rounded bg-stone-900 px-3 py-1.5 text-sm text-white"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => setStatus("archived")}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            Archive
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

        {stats && (
          <div className="mb-6 rounded-lg border border-stone-200 p-4 text-sm">
            <h2 className="mb-2 font-medium">Paper calibration</h2>
            <p>
              Completed attempts: {stats.paper.completedAttempts}. Median score:{" "}
              {stats.paper.medianScore ?? "–"}. Mean:{" "}
              {stats.paper.meanScore != null
                ? stats.paper.meanScore.toFixed(1)
                : "–"}
              . Median time:{" "}
              {stats.paper.medianCompletionTimeSeconds != null
                ? `${Math.round(stats.paper.medianCompletionTimeSeconds)}s`
                : "–"}
              . Completion rate:{" "}
              {stats.paper.completionRate != null
                ? `${Math.round(stats.paper.completionRate * 100)}%`
                : "–"}
            </p>
          </div>
        )}

        {alternatives && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">
                Replace Q{alternatives.position}
              </h2>
              <button
                type="button"
                className="text-stone-600 underline"
                onClick={() => setAlternatives(null)}
              >
                Close
              </button>
            </div>
            {alternatives.items.length === 0 ? (
              <p className="text-stone-600">No suitable alternatives found.</p>
            ) : (
              <ul className="space-y-2">
                {alternatives.items.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded border border-amber-100 bg-white p-2"
                  >
                    <div>
                      <div className="font-medium">
                        {q.topicTitle} · D{q.mockDifficulty} · {q.estimatedTimeSeconds}s ·{" "}
                        {q.reasoningType} · {q.presentationType}
                      </div>
                      <div className="text-stone-600">{q.stemSummary}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded bg-stone-900 px-2 py-1 text-xs text-white"
                      onClick={() => applyReplace(alternatives.position, q.id)}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-3">
          {slots.map((slot) => {
            const q = slot.question;
            const cal = stats?.questionStats.find(
              (s) => s.questionId === slot.questionId,
            );
            return (
              <div
                key={`${slot.position}-${slot.questionId}`}
                className="rounded-lg border border-stone-200 p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-stone-900">
                      Q{slot.position}
                      {slot.locked ? " · locked" : ""}
                    </div>
                    {q ? (
                      <div className="mt-1 text-stone-700">
                        Topic: {q.topicTitle} ({q.topicCode})
                        <br />
                        Difficulty: {q.mockDifficulty} · Est. time:{" "}
                        {q.estimatedTimeSeconds} sec · Reasoning:{" "}
                        {q.reasoningType} · Presentation: {q.presentationType}
                        <br />
                        Correct answer: {q.correctOption}
                      </div>
                    ) : (
                      <div className="text-red-700">Missing question data</div>
                    )}
                    {cal && cal.attemptCount > 0 && (
                      <div className="mt-2 text-xs text-stone-600">
                        Actual correct rate:{" "}
                        {cal.percentCorrect != null
                          ? `${cal.percentCorrect.toFixed(0)}%`
                          : "–"}
                        · Median response:{" "}
                        {cal.medianResponseTimeSeconds != null
                          ? `${Math.round(cal.medianResponseTimeSeconds)} sec`
                          : "–"}
                        · Attempts: {cal.attemptCount}
                        {cal.flags.length > 0 && (
                          <div className="mt-1 text-amber-800">
                            {cal.flags.map((f) => (
                              <div key={f}>Possible issue: {f}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {viewId === slot.questionId && q && (
                      <div className="mt-2 whitespace-pre-wrap rounded bg-stone-50 p-2 text-xs text-stone-700">
                        {q.questionStem}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        setViewId(
                          viewId === slot.questionId ? null : slot.questionId,
                        )
                      }
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => openReplace(slot.position)}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => move(slot.position, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => move(slot.position, 1)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => toggleLock(slot.position, !slot.locked)}
                    >
                      {slot.locked ? "Unlock" : "Lock"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
