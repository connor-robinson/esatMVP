"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { CountRow, SurveyStatsPayload } from "@/lib/admin/surveyStats";

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
                width={120}
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

function CountTable({
  title,
  rows,
}: {
  title: string;
  rows: CountRow[];
}) {
  return (
    <div className="rounded-organic-xl bg-surface-elevated p-4">
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="py-1 pr-2 font-medium">Option</th>
            <th className="py-1 font-medium">Count</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-border-subtle">
              <td className="py-1.5 pr-2 text-text">{row.label}</td>
              <td className="py-1.5 tabular-nums text-text-muted">{row.count}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-4 text-sm text-text-muted">
                No data.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminSurveysPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SurveyStatsPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/surveys", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to load");
      setLoading(false);
      return;
    }
    setStats(json.stats ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
          <h1 className="text-2xl font-semibold text-text">Surveys</h1>
          <p className="mt-1 text-sm text-text-muted">
            Onboarding answers, referral codes, and in-product UI preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : stats ? (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Onboarding funnel
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Profiles" value={stats.funnel.totalProfiles} />
              <Stat
                label="Onboarding done"
                value={stats.funnel.onboardingCompleted}
              />
              <Stat
                label="Incomplete"
                value={stats.funnel.onboardingIncomplete}
              />
              <Stat
                label="Told referral source"
                value={stats.funnel.hasReferralSource}
              />
              <Stat label="Email opt-in" value={stats.funnel.marketingOptIn} />
              <Stat label="Email opt-out" value={stats.funnel.marketingOptOut} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              How did you hear about us?
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <CountChart
                title="Referral source"
                rows={stats.referralSources}
                color="#2E79B5"
              />
              <CountTable title="Referral source table" rows={stats.referralSources} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Exam setup
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              <CountChart
                title="Exam preference"
                rows={stats.examPreference}
                color="#7B64B8"
              />
              <CountChart
                title="ESAT subjects"
                rows={stats.esatSubjects}
                color="#F0A040"
              />
              <CountChart
                title="Target universities"
                rows={stats.targetUniversities}
                color="#1F8A65"
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CountTable
                title="Sitting proxy (is_early_applicant)"
                rows={stats.earlyApplicant}
              />
              <CountTable
                title="Marketing email consent"
                rows={[
                  { label: "Opted in", count: stats.funnel.marketingOptIn },
                  { label: "Opted out", count: stats.funnel.marketingOptOut },
                  { label: "Not asked", count: stats.funnel.marketingNotAsked },
                ]}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Question bank UI preference
            </h2>
            <p className="mt-1 text-xs text-text-subtle">
              From profiles: resolved preference, current chrome, and how it was
              set (survey / toggle / inferred).
            </p>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              <CountChart
                title="Preferred UI (survey / resolved)"
                rows={stats.qbUiSurveyChoice}
                color="#2E79B5"
              />
              <CountChart
                title="Current chrome in use"
                rows={stats.qbUiVariant}
                color="#1F8A65"
              />
              <CountChart
                title="Preference source"
                rows={stats.qbUiPreferenceSource}
                color="#C06028"
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Referral / access code usage
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat
                label="Partner invites generated"
                value={stats.partnerInviteSummary.generated}
              />
              <Stat
                label="Partner invites redeemed"
                value={stats.partnerInviteSummary.redeemed}
              />
              <Stat
                label="Feedback codes issued"
                value={stats.feedbackReferral.codesIssued}
              />
              <Stat
                label="Feedback codes redeemed"
                value={stats.feedbackReferral.codesRedeemed}
              />
              <Stat
                label="Feedback surveys done"
                value={stats.feedbackReferral.surveySubmissions}
              />
            </div>

            <div className="mt-4 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Cohort code</th>
                    <th className="px-4 py-3 font-medium">Partner</th>
                    <th className="px-4 py-3 font-medium">Used</th>
                    <th className="px-4 py-3 font-medium">Cap</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.partnerCodes.map((code) => (
                    <tr
                      key={`${code.partnerSlug}-${code.code}`}
                      className="border-t border-border-subtle"
                    >
                      <td className="px-4 py-2.5 font-mono text-text">
                        {code.code}
                        {code.label ? (
                          <span className="ml-2 text-xs text-text-subtle">
                            {code.label}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {code.partnerSlug || "-"}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text">
                        {code.redemptionCount}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {code.maxRedemptions}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{code.status}</td>
                    </tr>
                  ))}
                  {stats.partnerCodes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-sm text-text-muted"
                      >
                        No partner cohort codes.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Feedback-for-referral survey
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Submissions"
                value={stats.feedbackReferral.surveySubmissions}
              />
              <Stat
                label="Avg recommend (0-10)"
                value={
                  stats.feedbackReferral.recommendAvg != null
                    ? stats.feedbackReferral.recommendAvg
                    : "-"
                }
              />
              <Stat
                label="Recommend answers"
                value={stats.feedbackReferral.recommendCount}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <CountChart
                title="Parts used"
                rows={stats.feedbackReferral.partsUsed}
                color="#2E79B5"
              />
              <CountChart
                title="Most useful"
                rows={stats.feedbackReferral.mostUseful}
                color="#1F8A65"
              />
              <CountChart
                title="Least useful"
                rows={stats.feedbackReferral.leastUseful}
                color="#C06028"
              />
            </div>

            <h3 className="mt-6 text-sm font-semibold text-text">
              All submissions ({stats.feedbackReferral.submissions.length})
            </h3>
            <div className="mt-3 space-y-4">
              {stats.feedbackReferral.submissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-organic-xl bg-surface-elevated px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-text">
                        {submission.username ||
                          submission.email ||
                          submission.userId.slice(0, 8)}
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
                    <p className="font-mono text-xs text-text-subtle">
                      {submission.id.slice(0, 8).toUpperCase()}
                    </p>
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
                      <p className="text-sm text-text-muted">No answers saved.</p>
                    ) : null}
                  </dl>
                </article>
              ))}
              {stats.feedbackReferral.submissions.length === 0 ? (
                <p className="text-sm text-text-muted">No submissions yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </Container>
  );
}
