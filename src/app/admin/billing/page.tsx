"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Container } from "@/components/layout/Container";

type BillingPayload = {
  from: string;
  to: string;
  days: number;
  summary: {
    trialsEver: number;
    currentlyTrialing: number;
    cancelsEver: number;
    scheduledCancel: number;
    activePaid: number;
    trialsInWindow: number;
    cancelsInWindow: number;
  };
  history: Array<{ day: string; trials: number; cancels: number }>;
  cancellations: Array<{
    subscriptionId: string;
    userId: string;
    username: string | null;
    email: string | null;
    status: string;
    canceledAt: string | null;
    hadTrial: boolean;
    trialEnd: string | null;
    cancelAtPeriodEnd: boolean;
    endedAt: string | null;
  }>;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-organic-lg bg-surface-elevated px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

export default function AdminBillingPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);
  const [data, setData] = useState<BillingPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/billing?days=${days}`, {
      cache: "no-store",
    });
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

  const chart = (data?.history ?? []).map((d) => ({
    ...d,
    label: d.day.slice(5),
  }));

  return (
    <Container size="lg" className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Billing</h1>
          <p className="mt-1 text-sm text-text-muted">
            Free trials started and cancellations over time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-1.5 text-sm text-text"
            aria-label="History window"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 180 days</option>
            <option value={365}>Last year</option>
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
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Trials ever" value={data.summary.trialsEver} />
            <Stat
              label="Currently trialing"
              value={data.summary.currentlyTrialing}
            />
            <Stat label="Active paid" value={data.summary.activePaid} />
            <Stat label="Cancels ever" value={data.summary.cancelsEver} />
            <Stat
              label="Scheduled cancel"
              value={data.summary.scheduledCancel}
            />
            <Stat
              label={`In window (${data.days}d)`}
              value={`${data.summary.trialsInWindow} trials / ${data.summary.cancelsInWindow} cancels`}
            />
          </div>

          <div className="mt-6 rounded-organic-xl bg-surface-elevated p-4">
            <h2 className="text-sm font-semibold text-text">
              Trials and cancels by day
            </h2>
            <p className="mt-1 text-xs text-text-subtle">
              {data.from} to {data.to} · trials = subscriptions.trial_start ·
              cancels = subscriptions.canceled_at
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis allowDecimals={false} width={32} />
                  <Tooltip
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.day ?? "")
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="trials"
                    name="Free trials"
                    stroke="#2E79B5"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cancels"
                    name="Cancellations"
                    stroke="#C06028"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text">Who cancelled</h2>
            <p className="mt-1 text-xs text-text-subtle">
              Latest {data.cancellations.length} cancellations (hard cancel
              timestamp on the subscription).
            </p>
            <div className="mt-4 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Had trial</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cancellations.map((row) => (
                    <tr
                      key={row.subscriptionId}
                      className="border-t border-border-subtle"
                    >
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {row.canceledAt
                          ? new Date(row.canceledAt).toLocaleString("en-GB")
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-text">
                        {row.username || row.userId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.email || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{row.status}</td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {row.hadTrial ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                  {data.cancellations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-sm text-text-muted"
                      >
                        No cancellations recorded yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </Container>
  );
}
