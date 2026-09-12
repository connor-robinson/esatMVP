"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

type Segment = "arkwright" | "elephant" | "other" | "general";

type Snapshot = {
  since?: string;
  generated_at?: string;
  head?: Array<Record<string, unknown>>;
  feat?: Array<Record<string, unknown>>;
  seats?: Array<Record<string, unknown>>;
  prefs?: Array<Record<string, unknown>>;
  pract?: Array<Record<string, unknown>>;
  mm?: Array<Record<string, unknown>>;
  daily?: Array<Record<string, unknown>>;
  papers?: Array<Record<string, unknown>>;
  exam?: Array<Record<string, unknown>>;
  joins?: Array<Record<string, unknown>>;
};

const TOPIC_LABELS: Record<string, string> = {
  addition: "Addition",
  subtraction: "Subtraction",
  multiplication: "Multiplication",
  division: "Division",
  squaring: "Squaring",
  "trig-recall": "Trig Recall",
  "geometry-circle-theorems": "Circle Theorems",
  "algebra-quadratics": "Quadratics",
  "unit-circle": "Unit Circle",
  "triangles-trig": "Triangles",
  "algebra-equations": "Equations",
  "algebra-indices": "Indices",
  "algebra-polynomials": "Polynomials",
  "algebra-calculus": "Calculus",
  "arithmetic-percentages": "Percentages",
  "arithmetic-notation": "Notation",
  "fractions-group": "Fractions",
  "nt-divisibility": "Divisibility",
  "nt-primes-factors": "Primes & Factors",
};

const TABS: { id: Segment; label: string }[] = [
  { id: "arkwright", label: "Arkwright" },
  { id: "elephant", label: "Elephant" },
  { id: "other", label: "Other" },
  { id: "general", label: "General" },
];

const FEATURE_COLORS = ["#2E79B5", "#1F8A65", "#F0A040"];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((100 * part) / whole)}%`;
}

function topicLabel(id: string): string {
  return TOPIC_LABELS[id] ?? id;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
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

export default function AdminCohortsPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState("2026-08-24");
  const [tab, setTab] = useState<Segment>("arkwright");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/admin/cohorts?since=${encodeURIComponent(since)}`,
      { cache: "no-store" },
    );
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
    setSnapshot(json.snapshot ?? null);
    setLoading(false);
  }, [since]);

  useEffect(() => {
    void load();
  }, [load]);

  const head = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of snapshot?.head ?? []) map.set(str(row.segment), row);
    return map;
  }, [snapshot]);

  const feat = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of snapshot?.feat ?? []) map.set(str(row.segment), row);
    return map;
  }, [snapshot]);

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Cohorts</h1>
          <p className="mt-1 text-sm text-text-muted">
            Usage by Arkwright, Elephant, Other, and all users.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-text-muted">
            Since
            <input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="ml-2 rounded-organic-md border border-border-subtle bg-surface-mid px-2 py-1.5 text-sm text-text"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-organic-md bg-secondary/25 px-3 py-1.5 text-sm font-semibold text-text"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-organic-md px-3 py-1.5 text-sm font-medium",
              tab === t.id
                ? "bg-secondary/25 text-text"
                : "text-text-muted hover:bg-surface-mid",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : tab === "general" ? (
        <GeneralView
          head={head}
          feat={feat}
          mm={snapshot?.mm ?? []}
          pract={snapshot?.pract ?? []}
          papers={snapshot?.papers ?? []}
          seats={snapshot?.seats ?? []}
        />
      ) : (
        <SegmentView
          segment={tab}
          head={head.get(tab)}
          feat={feat.get(tab)}
          prefs={(snapshot?.prefs ?? []).filter((r) => str(r.segment) === tab)}
          pract={(snapshot?.pract ?? []).filter((r) => str(r.segment) === tab)}
          mm={(snapshot?.mm ?? []).filter((r) => str(r.segment) === tab)}
          daily={(snapshot?.daily ?? []).filter((r) => str(r.segment) === tab)}
          papers={(snapshot?.papers ?? []).filter((r) => str(r.segment) === tab)}
          exam={(snapshot?.exam ?? []).filter((r) => str(r.segment) === tab)}
          seats={snapshot?.seats ?? []}
          joins={snapshot?.joins ?? []}
        />
      )}
    </Container>
  );
}

function SegmentView({
  segment,
  head,
  feat,
  prefs,
  pract,
  mm,
  daily,
  papers,
  exam,
  seats,
  joins,
}: {
  segment: Exclude<Segment, "general">;
  head?: Record<string, unknown>;
  feat?: Record<string, unknown>;
  prefs: Array<Record<string, unknown>>;
  pract: Array<Record<string, unknown>>;
  mm: Array<Record<string, unknown>>;
  daily: Array<Record<string, unknown>>;
  papers: Array<Record<string, unknown>>;
  exam: Array<Record<string, unknown>>;
  seats: Array<Record<string, unknown>>;
  joins: Array<Record<string, unknown>>;
}) {
  const users = num(head?.users);
  const active = num(head?.active_in_window);
  const activated = num(head?.activated);
  const qb = num(feat?.qb_attempts);
  const drills = num(feat?.drill_sessions);
  const papersN = num(feat?.paper_sessions);
  const cal = num(feat?.cal_attempts);

  const pie = [
    { name: "Question bank", value: qb },
    { name: "Mental maths", value: drills },
    { name: "Past papers", value: papersN },
  ].filter((d) => d.value > 0);

  const mmRows = [...mm]
    .sort((a, b) => num(b.sessions) - num(a.sessions))
    .slice(0, 10)
    .map((r) => ({
      section: topicLabel(str(r.topic_id)),
      sessions: num(r.sessions),
      users: num(r.users),
      questions: num(r.questions),
    }));

  const slug =
    segment === "arkwright"
      ? "arkwright-2026"
      : segment === "elephant"
        ? "elephant26"
        : null;
  const seat = slug
    ? seats.find((s) => str(s.slug) === slug)
    : undefined;

  const dailyRows = [...daily]
    .sort((a, b) => str(a.day).localeCompare(str(b.day)))
    .map((r) => ({
      day: str(r.day).slice(5, 10),
      qb: num(r.qb_attempts),
    }));

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Users" value={users} />
        {segment !== "other" ? (
          <Stat
            label="Activated"
            value={`${activated} (${pct(activated, users)})`}
          />
        ) : null}
        <Stat label="Active in window" value={`${active} (${pct(active, users)})`} />
        <Stat label="QB attempts" value={qb} />
        <Stat label="Mental maths" value={drills} />
        <Stat label="Past papers" value={papersN} />
        <Stat label="Calibration" value={cal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="QB vs mental maths vs papers">
          {pie.length === 0 ? (
            <p className="text-sm text-text-muted">No usage in window.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pie.map((_, i) => (
                      <Cell key={i} fill={FEATURE_COLORS[i % FEATURE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Unique users by feature">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { feature: "QB", users: num(feat?.qb_users) },
                  { feature: "Mental maths", users: num(feat?.drill_users) },
                  { feature: "Past papers", users: num(feat?.paper_users) },
                  { feature: "Calibration", users: num(feat?.cal_users) },
                ]}
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="feature" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="users" fill="#2E79B5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Reports / seats">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Bug reports" value={num(feat?.bug_reports)} />
            <Stat label="Support" value={num(feat?.support_requests)} />
            <Stat label="Fermi" value={num(feat?.fermi_sessions)} />
            {seat ? (
              <Stat
                label="Seats"
                value={`${num(seat.cohort_used)} / ${num(seat.cohort_cap)}`}
              />
            ) : (
              <Stat label="Partner seats" value="n/a" />
            )}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Mental maths sections">
          {mmRows.length === 0 ? (
            <p className="text-sm text-text-muted">No mental maths sessions.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[...mmRows].reverse()}
                  margin={{ left: 8, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="section"
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="#1F8A65" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Section detail">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="py-1 pr-2 font-medium">Section</th>
                  <th className="py-1 pr-2 font-medium">Sess</th>
                  <th className="py-1 pr-2 font-medium">Users</th>
                  <th className="py-1 font-medium">Qs</th>
                </tr>
              </thead>
              <tbody>
                {mmRows.map((r) => (
                  <tr key={r.section} className="border-t border-border-subtle">
                    <td className="py-1.5 pr-2 text-text">{r.section}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.sessions}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{r.users}</td>
                    <td className="py-1.5 tabular-nums">{r.questions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Subjects preferred">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prefs.map((r) => ({
                  subject: str(r.subject),
                  n: num(r.n),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="n" fill="#2E79B5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Subjects practised (QB)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pract.map((r) => ({
                  subject: str(r.subject),
                  attempts: num(r.attempts),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="attempts" fill="#F0A040" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Past papers / exam">
          <div className="h-52">
            {papers.length === 0 ? (
              <p className="text-sm text-text-muted">No past papers.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={papers.map((r) => ({
                      name: str(r.paper_name),
                      value: num(r.sessions),
                    }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={70}
                  >
                    {papers.map((_, i) => (
                      <Cell key={i} fill={FEATURE_COLORS[i % FEATURE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {exam.length > 0 ? (
            <p className="mt-2 text-xs text-text-subtle">
              Exam pref:{" "}
              {exam
                .map((r) => `${str(r.exam)} ${num(r.n)}`)
                .join(" · ")}
            </p>
          ) : null}
        </ChartCard>
      </div>

      {dailyRows.length > 0 ? (
        <ChartCard title="QB attempts / day">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="qb"
                  stroke="#2E79B5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : null}

      {slug ? (
        <p className="text-xs text-text-subtle">
          Joins:{" "}
          {joins
            .filter((j) => str(j.slug) === slug)
            .map((j) => `${str(j.week).slice(0, 10)} ×${num(j.joins)}`)
            .join(" · ") || "none"}
        </p>
      ) : null}
    </div>
  );
}

function GeneralView({
  head,
  feat,
  mm,
  pract,
  papers,
  seats,
}: {
  head: Map<string, Record<string, unknown>>;
  feat: Map<string, Record<string, unknown>>;
  mm: Array<Record<string, unknown>>;
  pract: Array<Record<string, unknown>>;
  papers: Array<Record<string, unknown>>;
  seats: Array<Record<string, unknown>>;
}) {
  const segments = ["arkwright", "elephant", "other"] as const;
  const totalUsers = segments.reduce((s, k) => s + num(head.get(k)?.users), 0);
  const totalActive = segments.reduce(
    (s, k) => s + num(head.get(k)?.active_in_window),
    0,
  );
  const qb = segments.reduce((s, k) => s + num(feat.get(k)?.qb_attempts), 0);
  const drills = segments.reduce(
    (s, k) => s + num(feat.get(k)?.drill_sessions),
    0,
  );
  const papersN = segments.reduce(
    (s, k) => s + num(feat.get(k)?.paper_sessions),
    0,
  );

  const volume = segments.map((k) => ({
    segment: k[0].toUpperCase() + k.slice(1),
    QB: num(feat.get(k)?.qb_attempts),
    "Mental maths": num(feat.get(k)?.drill_sessions),
    Papers: num(feat.get(k)?.paper_sessions),
  }));

  const mmAll = new Map<string, { sessions: number; users: number; questions: number }>();
  for (const row of mm) {
    const id = str(row.topic_id);
    const cur = mmAll.get(id) ?? { sessions: 0, users: 0, questions: 0 };
    cur.sessions += num(row.sessions);
    cur.users += num(row.users);
    cur.questions += num(row.questions);
    mmAll.set(id, cur);
  }
  const mmRows = [...mmAll.entries()]
    .map(([id, v]) => ({ section: topicLabel(id), ...v }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 12);

  const practAll = new Map<string, number>();
  for (const row of pract) {
    const subj = str(row.subject);
    practAll.set(subj, (practAll.get(subj) ?? 0) + num(row.attempts));
  }

  const paperAll = new Map<string, number>();
  for (const row of papers) {
    const name = str(row.paper_name);
    paperAll.set(name, (paperAll.get(name) ?? 0) + num(row.sessions));
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="All users" value={totalUsers} />
        <Stat
          label="Partner seats"
          value={seats.reduce((s, r) => s + num(r.entitled), 0)}
        />
        <Stat label="Active in window" value={totalActive} />
        <Stat label="QB attempts" value={qb} />
        <Stat label="Mental maths" value={drills} />
        <Stat label="Past papers" value={papersN} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Most used of the three">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Question bank", value: qb },
                    { name: "Mental maths", value: drills },
                    { name: "Past papers", value: papersN },
                  ].filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {FEATURE_COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Volume by segment">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="segment" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="QB" fill="#2E79B5" />
                <Bar dataKey="Mental maths" fill="#1F8A65" />
                <Bar dataKey="Papers" fill="#F0A040" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Mental maths sections (all)">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[...mmRows].reverse()}
                margin={{ left: 8, right: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="section"
                  width={110}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="sessions" fill="#1F8A65" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Subjects practised / papers">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...practAll.entries()].map(([subject, attempts]) => ({
                  subject,
                  attempts,
                }))}
              >
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="attempts" fill="#F0A040" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[...paperAll.entries()].map(([name, value]) => ({
                    name,
                    value,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={60}
                >
                  {[...paperAll.keys()].map((_, i) => (
                    <Cell key={i} fill={FEATURE_COLORS[i % FEATURE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
