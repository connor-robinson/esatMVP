"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  buildPastPaperTopWrongExportCsv,
  buildPastPaperTopWrongExportJson,
  minAttemptsForRange,
  sinceIsoForRange,
  type PastPaperStatsPayload,
  type PastPaperTimeRange,
} from "@/lib/admin/pastPaperStats";
import { cn } from "@/lib/utils";

const TOP_PAPERS = 5;
const TOP_SECTIONS = 5;
const TOP_WRONG = 10;
const TOP_EXPORT = 5;

const TIME_RANGES: { id: PastPaperTimeRange; label: string }[] = [
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
  row: PastPaperStatsPayload["mostWrong"][number],
): string {
  if (!row.option_breakdown.length) return "-";
  return row.option_breakdown
    .map((o) => `${o.option} ${o.pct}% (${o.count})`)
    .join(" · ");
}

function paperLabel(row: PastPaperStatsPayload["papers"][number]): string {
  return `${row.exam_name} · ${row.paper_variant}`;
}

export default function AdminPastPapersPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PastPaperStatsPayload | null>(null);
  const [range, setRange] = useState<PastPaperTimeRange>("all");
  const [papersExpanded, setPapersExpanded] = useState(false);
  const [sectionsExpanded, setSectionsExpanded] = useState(false);
  const [wrongExpanded, setWrongExpanded] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

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
      const res = await fetch(`/api/admin/past-papers?${params}`, {
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
      setStats((json.stats as PastPaperStatsPayload | null) ?? null);
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

  const visiblePapers = useMemo(() => {
    const rows = stats?.papers ?? [];
    return papersExpanded ? rows : rows.slice(0, TOP_PAPERS);
  }, [stats, papersExpanded]);

  const visibleSections = useMemo(() => {
    const rows = stats?.sections ?? [];
    return sectionsExpanded ? rows : rows.slice(0, TOP_SECTIONS);
  }, [stats, sectionsExpanded]);

  const visibleWrong = useMemo(() => {
    const rows = stats?.mostWrong ?? [];
    return wrongExpanded ? rows : rows.slice(0, TOP_WRONG);
  }, [stats, wrongExpanded]);

  const topExportRows = useMemo(
    () => (stats?.mostWrong ?? []).slice(0, TOP_EXPORT),
    [stats],
  );

  const paperChartData = useMemo(
    () =>
      [...visiblePapers]
        .reverse()
        .map((row) => ({
          label: `${row.exam_name} ${row.paper_variant}`.slice(0, 28),
          count: row.sessions,
        })),
    [visiblePapers],
  );

  const sectionChartData = useMemo(
    () =>
      [...visibleSections]
        .reverse()
        .map((row) => ({
          label: row.section.slice(0, 28),
          count: row.sessions,
        })),
    [visibleSections],
  );

  const overallPct =
    stats && stats.summary.answered_attempts > 0
      ? Math.round(
          (1000 * stats.summary.correct_attempts) /
            stats.summary.answered_attempts,
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
        `past-papers-top5-wrong-${range}-${stamp}.csv`,
        buildPastPaperTopWrongExportCsv(topExportRows, meta),
        "text/csv;charset=utf-8",
      );
      return;
    }
    downloadText(
      `past-papers-top5-wrong-${range}-${stamp}.json`,
      buildPastPaperTopWrongExportJson(topExportRows, meta),
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
          <h1 className="text-2xl font-bold text-text">Past papers</h1>
          <p className="mt-2 text-sm text-text-muted">
            Session volume, section popularity, and hardest questions (plus-four
            ranking). Seed accounts are excluded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Stat label="Sessions" value={stats.summary.total_sessions} />
              <Stat
                label="Completed"
                value={stats.summary.completed_sessions}
              />
              <Stat label="Unique users" value={stats.summary.unique_users} />
              <Stat
                label="Answered attempts"
                value={stats.summary.answered_attempts}
              />
              <Stat
                label="Unique questions"
                value={stats.summary.unique_questions}
              />
              <Stat
                label="Overall % correct"
                value={overallPct != null ? `${overallPct}%` : "-"}
              />
            </div>
            {stats.generated_at ? (
              <p className="mt-3 text-xs text-text-subtle">
                Generated{" "}
                {new Date(stats.generated_at).toLocaleString("en-GB")}
                {stats.since
                  ? ` · ${rangeLabel.toLowerCase()} since ${new Date(stats.since).toLocaleString("en-GB")}`
                  : " · all time"}
                {" · "}
                {stats.summary.wrong_attempts} wrong attempts
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Most practised papers
            </h2>
            <p className="mt-2 text-xs text-text-subtle">
              Ranked by session volume. Showing{" "}
              {papersExpanded ? "all" : `top ${TOP_PAPERS}`}.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-organic-xl bg-surface-elevated p-4">
                <h3 className="mb-3 text-sm font-semibold text-text">
                  Sessions by paper
                </h3>
                {chartsReady && paperChartData.length > 0 ? (
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        layout="vertical"
                        data={paperChartData}
                        margin={{ left: 8, right: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={120}
                          tick={{ fontSize: 10 }}
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
                    {paperChartData.length === 0
                      ? "No sessions yet."
                      : "Preparing chart…"}
                  </p>
                )}
              </div>

              <div className="min-w-0 overflow-x-auto rounded-organic-xl bg-surface-elevated">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Paper</th>
                      <th className="px-4 py-3 font-medium">Sessions</th>
                      <th className="px-4 py-3 font-medium">Done</th>
                      <th className="px-4 py-3 font-medium">Users</th>
                      <th className="px-4 py-3 font-medium">Avg %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePapers.map((row) => (
                      <tr
                        key={`${row.paper_id ?? "x"}-${row.paper_variant}`}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-4 py-2.5 text-text">
                          {paperLabel(row)}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text">
                          {row.sessions}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-muted">
                          {row.completed}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-muted">
                          {row.users}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-muted">
                          {row.avg_pct_correct != null
                            ? `${row.avg_pct_correct}%`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {visiblePapers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-sm text-text-muted"
                        >
                          No paper data.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <div className="px-4 pb-4">
                  <ExpandToggle
                    expanded={papersExpanded}
                    onToggle={() => setPapersExpanded((v) => !v)}
                    hiddenCount={Math.max(
                      0,
                      (stats.papers.length ?? 0) - TOP_PAPERS,
                    )}
                    noun="papers"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Most common sections
            </h2>
            <p className="mt-2 text-xs text-text-subtle">
              From selected sections on sessions. Showing{" "}
              {sectionsExpanded ? "all" : `top ${TOP_SECTIONS}`}.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-organic-xl bg-surface-elevated p-4">
                <h3 className="mb-3 text-sm font-semibold text-text">
                  Sessions by section
                </h3>
                {chartsReady && sectionChartData.length > 0 ? (
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        layout="vertical"
                        data={sectionChartData}
                        margin={{ left: 8, right: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={120}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          fill="#1F8A65"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    {sectionChartData.length === 0
                      ? "No section data."
                      : "Preparing chart…"}
                  </p>
                )}
              </div>

              <div className="min-w-0 overflow-x-auto rounded-organic-xl bg-surface-elevated">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Section</th>
                      <th className="px-4 py-3 font-medium">Sessions</th>
                      <th className="px-4 py-3 font-medium">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSections.map((row) => (
                      <tr
                        key={row.section}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-4 py-2.5 text-text">{row.section}</td>
                        <td className="px-4 py-2.5 tabular-nums text-text">
                          {row.sessions}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-muted">
                          {row.users}
                        </td>
                      </tr>
                    ))}
                    {visibleSections.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-sm text-text-muted"
                        >
                          No section data.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <div className="px-4 pb-4">
                  <ExpandToggle
                    expanded={sectionsExpanded}
                    onToggle={() => setSectionsExpanded((v) => !v)}
                    hiddenCount={Math.max(
                      0,
                      (stats.sections.length ?? 0) - TOP_SECTIONS,
                    )}
                    noun="sections"
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
                  Attempts count every try (retries included); Unique users is
                  distinct people. Ranked by plus-four wrong rate: 100 × (wrong +
                  2) / (attempts + 4). Min {stats.min_attempts} attempts ·{" "}
                  {rangeLabel}. Showing{" "}
                  {wrongExpanded ? "all loaded" : `top ${TOP_WRONG}`}. Operator
                  and admin accounts are excluded.
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
                          #{index + 1} · {row.exam_name}
                          {row.exam_year ? ` ${row.exam_year}` : ""} ·{" "}
                          {row.section}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-text">
                          Q{row.question_number} · {row.paper_label}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs sm:grid-cols-4">
                        <div>
                          <p className="text-text-subtle">Attempts (all tries)</p>
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
                          <p className="text-text-subtle">Unique users</p>
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
                    <th className="px-4 py-3 font-medium">Exam</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Attempts</th>
                    <th className="px-4 py-3 font-medium">Wrong</th>
                    <th className="px-4 py-3 font-medium">Unique users</th>
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
                      <td className="px-4 py-2.5 text-text">
                        Q{row.question_number}
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {row.paper_label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.exam_name}
                        {row.exam_year ? ` ${row.exam_year}` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.section}
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
    </Container>
  );
}
