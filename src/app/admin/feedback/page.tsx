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
import type { CountRow } from "@/lib/admin/surveyStats";
import type { FeedbackReferralStats } from "@/lib/admin/feedbackReferralAdmin";
import {
  getFeedbackAdminLastSeenAt,
  markFeedbackAdminViewed,
} from "@/lib/admin/feedbackReferralLastSeen";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-organic-lg bg-surface-elevated px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

function CountChart({
  title,
  rows,
  color = "#2E79B5",
}: {
  title: string;
  rows: CountRow[];
  color?: string;
}) {
  const data = [...rows].reverse();
  return (
    <div className="rounded-organic-xl bg-surface-elevated p-4">
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No responses yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ left: 8, right: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={130}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FeedbackReferralStats | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feedback-referral", {
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to load");
      }
      const json = await res.json();
      setStats(json.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLastSeenAt(getFeedbackAdminLastSeenAt());
    void load();
  }, [load]);

  const unreadIds = useMemo(() => {
    if (!stats) return new Set<string>();
    const seenMs = lastSeenAt ? Date.parse(lastSeenAt) : 0;
    const ids = new Set<string>();
    for (const submission of stats.submissions) {
      const created = Date.parse(submission.createdAt);
      if (!Number.isFinite(created) || created > seenMs) {
        ids.add(submission.id);
      }
    }
    return ids;
  }, [stats, lastSeenAt]);

  const markViewed = useCallback(() => {
    const newest = stats?.submissions[0]?.createdAt;
    const iso =
      newest && Number.isFinite(Date.parse(newest))
        ? newest
        : new Date().toISOString();
    markFeedbackAdminViewed(iso);
    setLastSeenAt(iso);
  }, [stats]);

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Feedback questionnaire</h1>
          <p className="mt-1 text-sm text-text-muted">
            Friend-referral survey responses, stats, and codes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unreadIds.size > 0 ? (
            <button
              type="button"
              onClick={markViewed}
              className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text"
            >
              Mark {unreadIds.size} viewed
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text hover:bg-surface-neutral"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : null}
      {error ? (
        <p className="mt-8 text-sm text-danger">{error}</p>
      ) : null}

      {stats ? (
        <div className="mt-8 space-y-10">
          {unreadIds.size > 0 ? (
            <section className="rounded-organic-xl border border-secondary/40 bg-secondary/10 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-text">
                    {unreadIds.size} new response
                    {unreadIds.size === 1 ? "" : "s"}
                  </h2>
                  <p className="mt-1 text-xs text-text-muted">
                    Clear this notice once you have reviewed them.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={markViewed}
                  className="rounded-organic-md bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text"
                >
                  Dismiss
                </button>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-text">
                {stats.submissions
                  .filter((s) => unreadIds.has(s.id))
                  .slice(0, 8)
                  .map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#submission-${s.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {s.username || s.email || s.userId.slice(0, 8)}
                      </a>
                      <span className="text-text-muted">
                        {" · "}
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleString("en-GB")
                          : "-"}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Stats
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Asked" value={stats.asked} />
              <Stat label="Answered" value={stats.answered} />
              <Stat
                label="Response rate"
                value={
                  stats.responseRate != null ? `${stats.responseRate}%` : "-"
                }
              />
              <Stat
                label="Avg recommend (0-10)"
                value={stats.recommendAvg != null ? stats.recommendAvg : "-"}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="Codes issued" value={stats.codesIssued} />
              <Stat label="Codes redeemed" value={stats.codesRedeemed} />
              <Stat label="Codes unused" value={stats.codesUnused} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Breakdowns
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <CountChart
                title="Most useful"
                rows={stats.mostUseful}
                color="#1F8A65"
              />
              <CountChart
                title="Least useful"
                rows={stats.leastUseful}
                color="#C06028"
              />
              <CountChart
                title="Price fairness"
                rows={stats.priceFair}
                color="#2E79B5"
              />
              <CountChart
                title="What would raise recommend"
                rows={stats.recommendMore}
                color="#6B5CAD"
              />
              <CountChart
                title="Camp missing"
                rows={stats.campMissing}
                color="#B54C7A"
              />
              <CountChart
                title="Almost stopped"
                rows={stats.almostStopped}
                color="#8A6A1F"
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Responses ({stats.submissions.length})
            </h2>
            <div className="mt-3 space-y-4">
              {stats.submissions.map((submission) => {
                const isNew = unreadIds.has(submission.id);
                return (
                  <article
                    key={submission.id}
                    id={`submission-${submission.id}`}
                    className={`rounded-organic-xl bg-surface-elevated px-5 py-4 ${
                      isNew ? "ring-2 ring-secondary/50" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-text">
                          {submission.username ||
                            submission.email ||
                            submission.userId.slice(0, 8)}
                          {isNew ? (
                            <span className="ml-2 rounded-full bg-secondary/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text">
                              New
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-text-subtle">
                          {submission.email || "No email"}
                          {" · "}
                          {submission.createdAt
                            ? new Date(submission.createdAt).toLocaleString(
                                "en-GB",
                              )
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-3">
                      {submission.answers.map((answer) => (
                        <div key={`${submission.id}-${answer.questionId}`}>
                          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
                            {answer.label}
                          </dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm text-text">
                            {answer.display}
                          </dd>
                        </div>
                      ))}
                      {submission.answers.length === 0 ? (
                        <p className="text-sm text-text-muted">
                          No answers saved.
                        </p>
                      ) : null}
                    </dl>
                  </article>
                );
              })}
              {stats.submissions.length === 0 ? (
                <p className="text-sm text-text-muted">No submissions yet.</p>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Codes ({stats.codes.length}
              {stats.codesIssued > stats.codes.length
                ? ` of ${stats.codesIssued}`
                : ""}
              )
            </h2>
            <div className="mt-3 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Redeemed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.codes.map((row) => (
                    <tr key={row.code} className="border-t border-border-subtle">
                      <td className="px-4 py-3 font-mono font-semibold">
                        {row.code}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {row.ownerUsername ?? row.ownerEmail ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString("en-GB")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {row.redeemedAt
                          ? `${row.redeemedByEmail ?? "used"} · ${new Date(
                              row.redeemedAt,
                            ).toLocaleString("en-GB")}`
                          : "unused"}
                      </td>
                    </tr>
                  ))}
                  {stats.codes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-sm text-text-muted"
                      >
                        No codes yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-text-subtle">
            Onboarding survey answers remain under{" "}
            <Link href="/admin/surveys" className="underline underline-offset-2">
              Surveys
            </Link>
            .
          </p>
        </div>
      ) : null}
    </Container>
  );
}
