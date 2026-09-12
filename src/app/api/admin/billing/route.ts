import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";

export const dynamic = "force-dynamic";

type SubRow = {
  id: string;
  user_id: string;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  cancel_at_period_end: boolean | null;
  created: string | null;
  ended_at: string | null;
  current_period_end: string | null;
};

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function buildSeries(
  keys: Array<string | null>,
  from: string,
  to: string,
): Array<{ day: string; count: number }> {
  const counts = new Map<string, number>();
  for (const k of keys) {
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const out: Array<{ day: string; count: number }> = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor <= end) {
    const day = cursor.toISOString().slice(0, 10);
    out.push({ day, count: counts.get(day) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status ?? 403 },
    );
  }

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days") ?? "90");
  const days = Number.isFinite(daysParam)
    ? Math.min(365, Math.max(14, Math.floor(daysParam)))
    : 90;

  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const fromDay = from.toISOString().slice(0, 10);
  const toDay = to.toISOString().slice(0, 10);

  const { data: subs, error } = await admin.service
    .from("subscriptions")
    .select(
      "id, user_id, status, trial_start, trial_end, canceled_at, cancel_at_period_end, created, ended_at, current_period_end",
    )
    .order("created", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (subs ?? []) as SubRow[];

  const trialStarts = rows
    .map((r) => dayKey(r.trial_start))
    .filter((d): d is string => Boolean(d));
  const cancelDays = rows
    .map((r) => dayKey(r.canceled_at))
    .filter((d): d is string => Boolean(d));

  const trialsSeries = buildSeries(trialStarts, fromDay, toDay);
  const cancelsSeries = buildSeries(cancelDays, fromDay, toDay);

  const history = trialsSeries.map((t, i) => ({
    day: t.day,
    trials: t.count,
    cancels: cancelsSeries[i]?.count ?? 0,
  }));

  const cancelledUserIds = [
    ...new Set(
      rows.filter((r) => r.canceled_at).map((r) => r.user_id).filter(Boolean),
    ),
  ];

  const profileById = new Map<
    string,
    { username: string | null; email: string | null }
  >();
  if (cancelledUserIds.length > 0) {
    const { data: profiles } = await admin.service
      .from("profiles")
      .select("id, username, email")
      .in("id", cancelledUserIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id as string, {
        username: (p.username as string | null) ?? null,
        email: (p.email as string | null) ?? null,
      });
    }
  }

  const cancellations = rows
    .filter((r) => r.canceled_at)
    .sort((a, b) => String(b.canceled_at).localeCompare(String(a.canceled_at)))
    .slice(0, 100)
    .map((r) => {
      const profile = profileById.get(r.user_id);
      return {
        subscriptionId: r.id,
        userId: r.user_id,
        username: profile?.username ?? null,
        email: profile?.email ?? null,
        status: r.status,
        canceledAt: r.canceled_at,
        hadTrial: Boolean(r.trial_start),
        trialEnd: r.trial_end,
        cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
        endedAt: r.ended_at,
      };
    });

  const summary = {
    trialsEver: rows.filter((r) => r.trial_start).length,
    currentlyTrialing: rows.filter((r) => r.status === "trialing").length,
    cancelsEver: rows.filter((r) => r.canceled_at).length,
    scheduledCancel: rows.filter(
      (r) =>
        r.cancel_at_period_end &&
        (r.status === "active" || r.status === "trialing"),
    ).length,
    activePaid: rows.filter((r) => r.status === "active").length,
    trialsInWindow: history.reduce((sum, d) => sum + d.trials, 0),
    cancelsInWindow: history.reduce((sum, d) => sum + d.cancels, 0),
  };

  return NextResponse.json({
    from: fromDay,
    to: toDay,
    days,
    summary,
    history,
    cancellations,
  });
}
