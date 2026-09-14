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
import { AdminQuestionPreviewModal } from "@/components/admin/AdminQuestionPreviewModal";
import {
  buildTopWrongExportCsv,
  buildTopWrongExportJson,
  minAttemptsForRange,
  sinceIsoForRange,
  type QuestionBankStatsPayload,
  type QuestionBankTimeRange,
} from "@/lib/admin/questionBankStats";
import { cn } from "@/lib/utils";

const TOP_SUBJECTS = 5;
const TOP_WRONG = 10;
const TOP_EXPORT = 5;

const TIME_RANGES: { id: QuestionBankTimeRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

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

function downloadText(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatOptionBreakdown(
  row: QuestionBankStatsPayload["mostWrong"][number],
): string {
  if (!row.option_breakdown.length) return "-";
  return row.option_breakdown
    .map((o) => `${o.option} ${o.pct}% (${o.count})`)
    .join(" · ");
}

export default function AdminQuestionBankPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<QuestionBankStatsPayload | null>(null);
  const [range, setRange] = useState<QuestionBankTimeRange>("all");
  const [subjectsExpanded, setSubjectsExpanded] = useState(false);
  const [wrongExpanded, setWrongExpanded] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const [preview, setPreview] = useState<{
    id: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = sinceIsoForRange(range);
    const minAttempts = minAttemptsForRange(range);
    const params = new URLSearchParams({
      minAttempts: String(minAttempts),
      wrongLimit: "40",
    });
    if (since) params.set("since", since);

    try {
      const res = await fetch(`/api/admin/question-bank?${params}`, {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Failed to load stats",
        );
        setStats(null);
        return;
      }
      setStats((json.stats as QuestionBankStatsPayload | null) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

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

  const topExportRows = useMemo(
    () => (stats?.mostWrong ?? []).slice(0, TOP_EXPORT),
    [stats],
  );

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

  const rangeLabel =
    TIME_RANGES.find((r) => r.id === range)?.label ?? "All time";

  const exportTopFive = (format: "csv" | "json") => {
    if (!stats || topExportRows.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const meta = {
      rangeLabel,
      since: stats.since,
      generatedAt: stats.generated_at,
    };
    if (format === "csv") {
      downloadText(
        `qb-top5-wrong-${range}-${stamp}.csv`,
        buildTopWrongExportCsv(topExportRows, meta),
        "text/csv;charset=utf-8",
      );
      return;
    }
    downloadText(
      `qb-top5-wrong-${range}-${stamp}.json`,
      buildTopWrongExportJson(topExportRows, meta),
      "application/json;charset=utf-8",
    );
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
          <h1 className="text-2xl font-bold text-text">Question bank</h1>
          <p className="mt-2 text-sm text-text-muted">
            Subject popularity, hardest questions (plus-four ranking), and how
            much of the bank has been practised. Seed accounts are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/question-reports"
            className="rounded-organic-md bg-secondary/25 px-3 py-2 text-sm font-semibold text-text"
          >
            Question reports
          </Link>
          <div className="flex flex-wrap gap-1 rounded-organic-md bg-surface-mid p-1">
            {TIME_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRange(item.id)}
                className={cn(
                  "rounded-organic-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  range === item.id
                    ? "bg-surface-elevated text-text shadow-sm"
                    : "text-text-muted hover:text-text",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
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
      ) : null}

      {!loading && !stats && !error && !forbidden ? (
        <p className="mt-8 text-sm text-text-muted">No stats available.</p>
      ) : null}

      {stats ? (
        <div className={cn("mt-8 space-y-10", loading && "opacity-70")}>
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
                  ? ` · ${rangeLabel.toLowerCase()} since ${new Date(stats.since).toLocaleString("en-GB")}`
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
                {chartsReady && chartData.length > 0 ? (
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                ) : (
                  <p className="text-sm text-text-muted">
                    {chartData.length === 0 ? "No attempts yet." : "Preparing chart…"}
                  </p>
                )}
              </div>

              <div className="min-w-0 overflow-x-auto rounded-organic-xl bg-surface-elevated">
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
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Questions people get wrong most
                </h2>
                <p className="mt-2 text-xs text-text-subtle">
                  Ranked by plus-four wrong rate: 100 × (wrong + 2) / (attempts +
                  4). Min {stats.min_attempts} attempts · {rangeLabel}. Showing{" "}
                  {wrongExpanded ? "all loaded" : `top ${TOP_WRONG}`}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={topExportRows.length === 0}
                  onClick={() => exportTopFive("csv")}
                  className="rounded-organic-md bg-secondary/25 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
                >
                  Export top 5 CSV
                </button>
                <button
                  type="button"
                  disabled={topExportRows.length === 0}
                  onClick={() => exportTopFive("json")}
                  className="rounded-organic-md bg-surface-mid px-3 py-2 text-sm font-medium text-text disabled:opacity-50"
                >
                  Export top 5 JSON
                </button>
              </div>
            </div>

            {topExportRows.length > 0 ? (
              <div className="mt-4 space-y-3">
                {topExportRows.map((row, index) => (
                  <div
                    key={row.question_id}
                    className="rounded-organic-xl border border-border-subtle bg-surface-elevated px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                          #{index + 1} · {row.subject}
                          {row.primary_tag ? ` · ${row.primary_tag}` : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setPreview({
                              id: row.question_id,
                              label:
                                row.schema_id || row.question_id.slice(0, 8),
                            })
                          }
                          className="mt-1 font-mono text-sm text-text underline-offset-2 hover:underline"
                        >
                          {row.schema_id || row.question_id.slice(0, 8)}
                        </button>
                        {row.stem_preview ? (
                          <p className="mt-2 max-w-3xl text-sm text-text-muted">
                            {row.stem_preview}
                            {row.stem_preview.length >= 280 ? "…" : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs sm:grid-cols-4">
                        <div>
                          <p className="text-text-subtle">Attempts</p>
                          <p className="tabular-nums font-semibold text-text">
                            {row.attempts}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-subtle">Wrong</p>
                          <p className="tabular-nums font-semibold text-text">
                            {row.wrong} ({row.pct_wrong}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-text-subtle">Users</p>
                          <p className="tabular-nums font-semibold text-text">
                            {row.users}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-subtle">Plus-four wrong</p>
                          <p className="tabular-nums font-semibold text-text">
                            {row.plus_four_wrong_pct}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-text-muted">
                      Correct option:{" "}
                      <span className="font-semibold text-text">
                        {row.correct_option || "-"}
                      </span>
                      {" · "}
                      Raw correct: {row.pct_correct}%
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      Choices: {formatOptionBreakdown(row)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Question</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Topic</th>
                    <th className="px-4 py-3 font-medium">Attempts</th>
                    <th className="px-4 py-3 font-medium">Wrong</th>
                    <th className="px-4 py-3 font-medium">Users</th>
                    <th className="px-4 py-3 font-medium">% wrong</th>
                    <th className="px-4 py-3 font-medium">+4 wrong</th>
                    <th className="px-4 py-3 font-medium">Options</th>
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
                      <td className="px-4 py-2.5 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setPreview({
                              id: row.question_id,
                              label:
                                row.schema_id || row.question_id.slice(0, 8),
                            })
                          }
                          className="text-left text-text underline-offset-2 hover:underline"
                        >
                          {row.schema_id || row.question_id.slice(0, 8)}
                        </button>
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
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {row.pct_wrong}%
                      </td>
                      <td className="px-4 py-2.5 tabular-nums font-medium text-text">
                        {row.plus_four_wrong_pct}%
                      </td>
                      <td className="max-w-[280px] px-4 py-2.5 text-xs text-text-muted">
                        {formatOptionBreakdown(row)}
                      </td>
                    </tr>
                  ))}
                  {visibleWrong.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-6 text-sm text-text-muted"
                      >
                        No questions meet the minimum attempt threshold for this
                        range yet.
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

      {preview ? (
        <AdminQuestionPreviewModal
          questionId={preview.id}
          label={preview.label}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </Container>
  );
}
