"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Container } from "@/components/layout/Container";
import type {
  QuestionReportStatusFilter,
  QuestionReportSummary,
  ReportedQuestionItem,
} from "@/lib/admin/reportedQuestions";
import { cn } from "@/lib/utils";

const PIE_COLORS = [
  "#2E79B5",
  "#1F8A65",
  "#F0A040",
  "#C45C5C",
  "#7B6BB5",
  "#4A90A4",
  "#D4A017",
  "#5B7C99",
];

const FILTERS: { id: QuestionReportStatusFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-organic-lg bg-surface-elevated px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-organic-xl bg-surface-elevated p-4">
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}

function reporterLabel(meta: ReportedQuestionItem["meta"]): string {
  if (meta.username && meta.email) return `${meta.username} (${meta.email})`;
  return meta.username || meta.email || "Unknown user";
}

function ticketTone(status: string): string {
  if (status === "open" || status === "in_progress") {
    return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  }
  if (status === "resolved" || status === "closed") {
    return "bg-secondary/20 text-text";
  }
  return "bg-surface-mid text-text-muted";
}

export default function AdminQuestionReportsDashboardPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<QuestionReportStatusFilter>("open");
  const [items, setItems] = useState<ReportedQuestionItem[]>([]);
  const [summary, setSummary] = useState<QuestionReportSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/admin/question-reports?status=${encodeURIComponent(status)}`,
      { cache: "no-store" },
    );
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to load");
      setLoading(false);
      return;
    }
    setItems((json.items ?? []) as ReportedQuestionItem[]);
    setSummary((json.summary ?? null) as QuestionReportSummary | null);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = useMemo(() => {
    if (!summary) return 0;
    return summary.open + summary.inProgress;
  }, [summary]);

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
          <h1 className="text-2xl font-bold text-text">Question reports</h1>
          <p className="mt-2 text-sm text-text-muted">
            All question-bank content reports, with status filters and where
            issues cluster.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/question-reports/review?status=${encodeURIComponent(status)}`}
            className="rounded-organic-md bg-secondary/25 px-3 py-2 text-sm font-semibold text-text"
          >
            Open reviewer
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-organic-md bg-surface-mid px-3 py-2 text-sm font-medium text-text"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setStatus(filter.id)}
            className={cn(
              "rounded-organic-md px-3 py-1.5 text-sm font-medium transition-colors",
              status === filter.id
                ? "bg-secondary/25 text-text"
                : "bg-surface-mid text-text-muted hover:text-text",
            )}
          >
            {filter.label}
            {filter.id === "open" && openCount > 0 ? (
              <span className="ml-1.5 tabular-nums text-text-subtle">
                ({openCount})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading && !summary ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : summary ? (
        <div className="mt-8 space-y-10">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Overview
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="In this filter" value={summary.total} />
              <Stat label="Open" value={summary.open} />
              <Stat label="In progress" value={summary.inProgress} />
              <Stat label="Resolved" value={summary.resolved} />
              <Stat label="With question" value={summary.withQuestion} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="By report reason">
              {summary.byReason.length === 0 ? (
                <p className="text-sm text-text-muted">No data</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.byReason}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} (${Math.round((percent ?? 0) * 100)}%)`
                        }
                      >
                        {summary.byReason.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="By subject">
              {summary.bySubject.length === 0 ? (
                <p className="text-sm text-text-muted">No data</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.bySubject}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} (${Math.round((percent ?? 0) * 100)}%)`
                        }
                      >
                        {summary.bySubject.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="By primary tag">
              {summary.byPrimaryTag.length === 0 ? (
                <p className="text-sm text-text-muted">No data</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.byPrimaryTag}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${String(name).slice(0, 18)} (${Math.round((percent ?? 0) * 100)}%)`
                        }
                      >
                        {summary.byPrimaryTag.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
                Reports
              </h2>
              <p className="text-xs text-text-subtle">
                {items.length} reviewable
                {loading ? " · refreshing…" : ""}
              </p>
            </div>

            {items.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                No reports in this filter.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-organic-xl border border-border-subtle">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-mid/60 text-xs uppercase tracking-[0.08em] text-text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Reported</th>
                      <th className="px-3 py-2 font-semibold">Reporter</th>
                      <th className="px-3 py-2 font-semibold">Reason</th>
                      <th className="px-3 py-2 font-semibold">Subject</th>
                      <th className="px-3 py-2 font-semibold">Ticket</th>
                      <th className="px-3 py-2 font-semibold">Question</th>
                      <th className="px-3 py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.meta.ticketId}
                        className="border-t border-border-subtle"
                      >
                        <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">
                          {item.meta.reportedAt}
                        </td>
                        <td className="px-3 py-2.5 text-text">
                          {reporterLabel(item.meta)}
                        </td>
                        <td className="px-3 py-2.5 text-text">
                          {item.meta.reason}
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">
                          {item.meta.db.subjects}
                          <span className="block text-xs text-text-subtle">
                            {item.meta.topicLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-organic-md px-2 py-0.5 text-xs font-medium capitalize",
                              ticketTone(item.meta.ticketStatus),
                            )}
                          >
                            {item.meta.ticketStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">
                          <span className="capitalize">
                            {item.meta.db.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Link
                            href={`/admin/question-reports/review?status=${encodeURIComponent(status)}&ticket=${encodeURIComponent(item.meta.ticketId)}`}
                            className="text-sm font-semibold text-text underline-offset-2 hover:underline"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Container>
  );
}
