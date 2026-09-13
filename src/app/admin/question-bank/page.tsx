"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Container } from "@/components/layout/Container";
import type { QuestionBankStatsPayload } from "@/lib/admin/questionBankStats";

const TOP_SUBJECTS = 5;
const TOP_WRONG = 10;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-organic-lg bg-surface-elevated px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

function ExpandToggle({
  expanded,
  onToggle,
  hiddenCount,
  noun,
}: {
  expanded: boolean;
  onToggle: () => void;
  hiddenCount: number;
  noun: string;
}) {
  if (hiddenCount <= 0 && !expanded) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 text-sm font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
    >
      {expanded
        ? "Show top only"
        : `Show all (${hiddenCount} more ${noun})`}
    </button>
  );
}

export default function AdminQuestionBankPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<QuestionBankStatsPayload | null>(null);
  const [since, setSince] = useState<"all" | "2026-08-24">("all");
  const [subjectsExpanded, setSubjectsExpanded] = useState(false);
  const [wrongExpanded, setWrongExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      minAttempts: "5",
      wrongLimit: "100",
    });
    if (since !== "all") params.set("since", since);

    const res = await fetch(`/api/admin/question-bank?${params}`, {
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof json.error === "string" ? json.error : "Failed to load stats",
      );
      setLoading(false);
      return;
    }
    setStats(json.stats ?? null);
    setLoading(false);
  }, [since]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleSubjects = useMemo(() => {
    const rows = stats?.subjects ?? [];
    return subjectsExpanded ? rows : rows.slice(0, TOP_SUBJECTS);
  }, [stats, subjectsExpanded]);

  const visibleWrong = useMemo(() => {
    const rows = stats?.mostWrong ?? [];
    return wrongExpanded ? rows : rows.slice(0, TOP_WRONG);
  }, [stats, wrongExpanded]);

  const chartData = useMemo(
    () =>
      [...visibleSubjects]
        .reverse()
        .map((row) => ({
          label: row.subject,
          count: row.attempts,
        })),
    [visibleSubjects],
  );

  const overallPct =
    stats && stats.summary.total_attempts > 0
      ? Math.round(
          (1000 * stats.summary.correct_attempts) /
            stats.summary.total_attempts,
        ) / 10
      : null;

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
          <h1 className="text-2xl font-bold text-text">Question bank</h1>
          <p className="mt-2 text-sm text-text-muted">
            Subject popularity, hardest questions, and how much of the bank has
            been practised. Seed accounts are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/question-bank/reports"
            className="rounded-organic-md bg-secondary/25 px-3 py-2 text-sm font-semibold text-text"
          >
            Review reports
          </Link>
          <select
            value={since}
            onChange={(e) =>
              setSince(e.target.value as "all" | "2026-08-24")
            }
            className="rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
            aria-label="Time range"
          >
            <option value="all">All time</option>
            <option value="2026-08-24">Since 24 Aug 2026</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-organic-md bg-surface-mid px-3 py-2 text-sm font-medium text-text"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading && !stats ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : stats ? (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Overview
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat
                label="Unique questions done"
                value={stats.summary.unique_questions}
              />
              <Stat
                label="Total attempts"
                value={stats.summary.total_attempts}
              />
              <Stat label="Unique users" value={stats.summary.unique_users} />
              <Stat
                label="Overall % correct"
                value={overallPct != null ? `${overallPct}%` : "-"}
              />
              <Stat
                label="Wrong attempts"
                value={stats.summary.wrong_attempts}
              />
            </div>
            {stats.generated_at ? (
              <p className="mt-3 text-xs text-text-subtle">
                Generated{" "}
                {new Date(stats.generated_at).toLocaleString("en-GB")}
                {stats.since
                  ? ` · since ${new Date(stats.since).toLocaleDateString("en-GB")}`
                  : " · all time"}
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Most common subjects
            </h2>
            <p className="mt-2 text-xs text-text-subtle">
              Ranked by attempt volume. Showing{" "}
              {subjectsExpanded ? "all" : `top ${TOP_SUBJECTS}`}.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-organic-xl bg-surface-elevated p-4">
                <h3 className="mb-3 text-sm font-semibold text-text">
                  Attempts by subject
                </h3>
                {chartData.length === 0 ? (
                  <p className="text-sm text-text-muted">No attempts yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ left: 8, right: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          fill="#2E79B5"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-organic-xl bg-surface-elevated">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Attempts</th>
                      <th className="px-4 py-3 font-medium">Users</th>
                      <th className="px-4 py-3 font-medium">Questions</th>
                      <th className="px-4 py-3 font-medium">% correct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubjects.map((row) => (
                      <tr
                        key={row.subject}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-4 py-2.5 text-text">{row.subject}</td>
                        <td className="px-4 py-2.5 tabular-nums text-text">
                          {row.attempts}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-muted">
                          {row.users}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-muted">
                          {row.unique_questions}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-muted">
                          {row.pct_correct}%
                        </td>
                      </tr>
                    ))}
                    {visibleSubjects.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-sm text-text-muted"
                        >
                          No subject data.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <div className="px-4 pb-4">
                  <ExpandToggle
                    expanded={subjectsExpanded}
                    onToggle={() => setSubjectsExpanded((v) => !v)}
                    hiddenCount={Math.max(
                      0,
                      (stats.subjects.length ?? 0) - TOP_SUBJECTS,
                    )}
                    noun="subjects"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Questions people get wrong most
            </h2>
            <p className="mt-2 text-xs text-text-subtle">
              Lowest % correct among questions with at least{" "}
              {stats.min_attempts} attempts. Showing{" "}
              {wrongExpanded ? "all loaded" : `top ${TOP_WRONG}`}.
            </p>
            <div className="mt-4 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Question</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Topic</th>
                    <th className="px-4 py-3 font-medium">Attempts</th>
                    <th className="px-4 py-3 font-medium">Wrong</th>
                    <th className="px-4 py-3 font-medium">Users</th>
                    <th className="px-4 py-3 font-medium">% correct</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleWrong.map((row, index) => (
                    <tr
                      key={row.question_id}
                      className="border-t border-border-subtle"
                    >
                      <td className="px-4 py-2.5 tabular-nums text-text-subtle">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-text">
                        {row.schema_id || row.question_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.subject}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.primary_tag || "-"}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text">
                        {row.attempts}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text">
                        {row.wrong}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {row.users}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums font-medium text-text">
                        {row.pct_correct}%
                      </td>
                    </tr>
                  ))}
                  {visibleWrong.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-sm text-text-muted"
                      >
                        No questions meet the minimum attempt threshold yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <div className="px-4 pb-4">
                <ExpandToggle
                  expanded={wrongExpanded}
                  onToggle={() => setWrongExpanded((v) => !v)}
                  hiddenCount={Math.max(
                    0,
                    (stats.mostWrong.length ?? 0) - TOP_WRONG,
                  )}
                  noun="questions"
                />
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </Container>
  );
}
