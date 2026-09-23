"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

type ConversionFunnelData = {
  variant: string;
  unique_viewers: number;
  total_views: number;
  unique_attempters: number;
  total_attempts: number;
  unique_purchasers: number;
  total_purchases: number;
  avg_purchase_amount: number;
  total_revenue: number;
  view_to_attempt_rate: number;
  attempt_to_purchase_rate: number;
  overall_conversion_rate: number;
};

type AttributionSource = {
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  total_users: number;
  signups: number;
  purchases: number;
  signup_rate: number;
  purchase_rate: number;
};

type AnalyticsData = {
  funnel: ConversionFunnelData[];
  attribution: AttributionSource[];
  timeRange: string;
};

const COLORS = ["#2E79B5", "#1F8A65", "#F0A040", "#C45C5C"];

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-organic-lg px-4 py-3",
      highlight ? "bg-primary/20" : "bg-surface-elevated"
    )}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn(
        "mt-1 text-xl font-semibold tabular-nums",
        highlight ? "text-primary" : "text-text"
      )}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-organic-xl bg-surface-elevated p-4", className)}>
      <h3 className="mb-3 text-sm font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminConversionAnalyticsPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(90);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/conversion-analytics?days=${days}`, {
      cache: "no-store",
    });
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
    setData(json);
    setLoading(false);
  }, [days]);

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

  const bestVariant = data?.funnel.reduce((best, current) =>
    current.overall_conversion_rate > (best?.overall_conversion_rate ?? 0) ? current : best
  , data.funnel[0]);

  const totalRevenue = data?.funnel.reduce((sum, v) => sum + Number(v.total_revenue), 0) ?? 0;
  const totalPurchases = data?.funnel.reduce((sum, v) => sum + v.total_purchases, 0) ?? 0;

  return (
    <Container size="lg" className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Conversion Analytics</h1>
          <p className="mt-1 text-sm text-text-muted">
            A/B test performance, attribution sources, and conversion funnels.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-1.5 text-sm text-text"
            aria-label="Time range"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : data ? (
        <div className="mt-6 space-y-6">
          {/* Summary Stats */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Overall Performance ({data.timeRange})
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total Revenue" value={`£${totalRevenue.toFixed(2)}`} highlight />
              <Stat label="Total Purchases" value={totalPurchases} />
              <Stat 
                label="Best Variant" 
                value={bestVariant ? `${bestVariant.variant} (${bestVariant.overall_conversion_rate.toFixed(1)}%)` : 'N/A'} 
                highlight 
              />
              <Stat 
                label="Avg Order Value" 
                value={totalPurchases > 0 ? `£${(totalRevenue / totalPurchases).toFixed(2)}` : '£0'} 
              />
            </div>
          </section>

          {/* Conversion Funnel by Variant */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              A/B Test Performance
            </h2>
            
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Conversion rates by variant">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.funnel}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="variant" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="overall_conversion_rate" name="Conversion %" fill="#2E79B5" />
                      <Bar dataKey="view_to_attempt_rate" name="View to Attempt %" fill="#1F8A65" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Revenue by variant">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.funnel}
                        dataKey="total_revenue"
                        nameKey="variant"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {data.funnel.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Variant</th>
                    <th className="px-4 py-3 font-medium text-right">Views</th>
                    <th className="px-4 py-3 font-medium text-right">Attempts</th>
                    <th className="px-4 py-3 font-medium text-right">Purchases</th>
                    <th className="px-4 py-3 font-medium text-right">View→Attempt</th>
                    <th className="px-4 py-3 font-medium text-right">Attempt→Purchase</th>
                    <th className="px-4 py-3 font-medium text-right">Overall CVR</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.funnel.map((row, i) => (
                    <tr
                      key={row.variant}
                      className={cn(
                        "border-t border-border-subtle",
                        row.variant === bestVariant?.variant && "bg-primary/10"
                      )}
                    >
                      <td className="px-4 py-2.5 font-medium text-text">{row.variant}</td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.unique_viewers}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.unique_attempters}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.unique_purchasers}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.view_to_attempt_rate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.attempt_to_purchase_rate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right font-semibold text-text">
                        {row.overall_conversion_rate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right font-semibold text-text">
                        £{Number(row.total_revenue).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Attribution Sources */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
              Attribution Sources
            </h2>
            <div className="mt-3 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Medium</th>
                    <th className="px-4 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium text-right">Total Users</th>
                    <th className="px-4 py-3 font-medium text-right">Signups</th>
                    <th className="px-4 py-3 font-medium text-right">Purchases</th>
                    <th className="px-4 py-3 font-medium text-right">Signup Rate</th>
                    <th className="px-4 py-3 font-medium text-right">Purchase Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attribution.map((row, i) => (
                    <tr key={i} className="border-t border-border-subtle">
                      <td className="px-4 py-2.5 text-text">
                        {row.first_utm_source || '(direct)'}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.first_utm_medium || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.first_utm_campaign || '-'}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.total_users}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.signups}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text-muted">
                        {row.purchases}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right text-text">
                        {row.signup_rate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-right font-semibold text-text">
                        {row.purchase_rate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {data.attribution.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
                        No attribution data in this time range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </Container>
  );
}
