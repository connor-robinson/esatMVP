"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewStatsBreakdown as Breakdown } from "@/types/review";

const DIFF_ORDER = ["Easy", "Medium", "Hard", "Extreme", "Other"] as const;

function maxOfRecord(r: Record<string, number>): number {
  return Math.max(0, ...Object.values(r));
}

function BarRow({
  label,
  value,
  max,
  colorClass,
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between gap-2 text-[10px] font-mono text-white/75">
        <span className="truncate" title={label}>
          {label}
        </span>
        <span className="tabular-nums text-white/90 shrink-0">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function sortedEntries(r: Record<string, number>): [string, number][] {
  return Object.entries(r).sort((a, b) => b[1] - a[1]);
}

function MiniMatrix({
  title,
  matrix,
  rowOrderHint,
}: {
  title: string;
  matrix: Record<string, Record<string, number>>;
  rowOrderHint?: string[];
}) {
  const rows = useMemo(() => {
    const keys = Object.keys(matrix);
    if (rowOrderHint?.length) {
      const ordered = rowOrderHint.filter((k) => keys.includes(k));
      const rest = keys.filter((k) => !ordered.includes(k)).sort();
      return [...ordered, ...rest];
    }
    return keys.sort((a, b) => {
      const sa = Object.values(matrix[a] || {}).reduce((x, y) => x + y, 0);
      const sb = Object.values(matrix[b] || {}).reduce((x, y) => x + y, 0);
      return sb - sa;
    });
  }, [matrix, rowOrderHint]);

  const cols = useMemo(() => {
    const set = new Set<string>();
    for (const rk of rows) {
      const inner = matrix[rk] || {};
      for (const c of Object.keys(inner)) set.add(c);
    }
    const list = [...set];
    list.sort((a, b) => {
      const ia = DIFF_ORDER.indexOf(a as (typeof DIFF_ORDER)[number]);
      const ib = DIFF_ORDER.indexOf(b as (typeof DIFF_ORDER)[number]);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    });
    return list;
  }, [matrix, rows]);

  if (rows.length === 0) return null;

  const maxCell = Math.max(
    1,
    ...rows.flatMap((rk) => Object.values(matrix[rk] || {}))
  );

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-mono uppercase tracking-wide text-white/45">{title}</div>
      <div className="overflow-x-auto rounded-md border border-white/[0.08]">
        <table className="w-full min-w-[200px] text-[10px] font-mono">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.04]">
              <th className="p-1 text-left text-white/50 font-normal w-16"> </th>
              {cols.map((c) => (
                <th key={c} className="p-1 text-center text-white/55 font-normal whitespace-nowrap">
                  {c === "Other" ? "?" : c.slice(0, 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rk) => (
              <tr key={rk} className="border-b border-white/[0.06] last:border-0">
                <td className="p-1 pr-2 text-white/65 truncate max-w-[100px]" title={rk}>
                  {rk}
                </td>
                {cols.map((c) => {
                  const v = matrix[rk]?.[c] ?? 0;
                  const intensity = maxCell > 0 ? 0.12 + (v / maxCell) * 0.55 : 0.12;
                  return (
                    <td key={c} className="p-0.5 text-center align-middle">
                      <div
                        className="rounded px-0.5 py-0.5 tabular-nums text-white/90 min-h-[1.25rem] flex items-center justify-center"
                        style={{
                          backgroundColor: `rgba(255,255,255,${intensity})`,
                        }}
                        title={`${rk} · ${c}: ${v}`}
                      >
                        {v || "·"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-white/35 leading-tight">
        Column letters: E/M/H/X = Easy–Extreme; ? = other difficulty. Darker = more questions.
      </p>
    </div>
  );
}

export type ReviewStatsBreakdownProps = {
  variant?: "sidebar" | "dashboard";
  /** Re-fetch on an interval (ms) while mounted; also when the tab becomes visible again. */
  liveRefreshMs?: number;
  defaultOpen?: boolean;
  className?: string;
};

export function ReviewStatsBreakdown({
  variant = "sidebar",
  liveRefreshMs,
  defaultOpen = false,
  className,
}: ReviewStatsBreakdownProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Breakdown | null>(null);
  const dataRef = useRef<Breakdown | null>(null);
  dataRef.current = data;

  const fetchBreakdown = useCallback(async (opts?: { quiet?: boolean }) => {
    const quiet = Boolean(opts?.quiet && dataRef.current != null);
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/review/stats/breakdown?_=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = (await res.json()) as Breakdown & { error?: string; details?: string };
      if (!res.ok) {
        throw new Error(json.error || json.details || `HTTP ${res.status}`);
      }
      setData(json as Breakdown);
      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (defaultOpen || liveRefreshMs) {
      void fetchBreakdown();
    }
  }, [defaultOpen, liveRefreshMs, fetchBreakdown]);

  useEffect(() => {
    if (!liveRefreshMs || liveRefreshMs < 5000) return;
    const id = window.setInterval(() => {
      void fetchBreakdown({ quiet: true });
    }, liveRefreshMs);
    return () => window.clearInterval(id);
  }, [liveRefreshMs, fetchBreakdown]);

  useEffect(() => {
    if (!liveRefreshMs) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void fetchBreakdown({ quiet: true });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [liveRefreshMs, fetchBreakdown]);

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loadedOnce && !loading) {
      void fetchBreakdown();
    }
  };

  const esatSubjectOrder = useMemo(
    () => ["Math 1", "Math 2", "Physics", "Chemistry", "Biology"],
    []
  );
  const tmuaSubjectOrder = useMemo(() => ["Paper 1", "Paper 2"], []);

  const d = data;
  const esatOtherStatus =
    d && d.esat.total - d.esat.approved - d.esat.pending >= 0
      ? d.esat.total - d.esat.approved - d.esat.pending
      : 0;
  const tmuaOtherStatus =
    d && d.tmua.total - d.tmua.approved - d.tmua.pending >= 0
      ? d.tmua.total - d.tmua.approved - d.tmua.pending
      : 0;

  const maxDiff = d ? maxOfRecord(d.difficultyAll) : 0;
  const maxEsatSub = d ? maxOfRecord(d.esat.bySubject) : 0;
  const maxTmuaSub = d ? maxOfRecord(d.tmua.bySubject) : 0;

  const isDash = variant === "dashboard";

  return (
    <div
      className={cn(
        "flex flex-col bg-white/[0.02]",
        isDash
          ? "rounded-organic-lg border border-white/10"
          : "border-b border-white/10",
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex-shrink-0 flex items-center justify-between gap-2 text-left",
          "hover:bg-white/[0.04] transition-colors border-b border-white/[0.06]",
          isDash ? "px-4 py-3" : "px-3 py-2.5"
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 font-mono font-medium text-white/85",
            isDash ? "text-sm" : "text-xs"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5 text-sky-300/90" strokeWidth={2.5} />
          {isDash ? "Question bank stats" : "Stats"}
          {liveRefreshMs ? (
            <span className="text-[10px] font-normal text-white/40 normal-case">
              · live ~{Math.round(liveRefreshMs / 1000)}s
            </span>
          ) : null}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-white/45 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/45 shrink-0" />
        )}
      </button>

      {open && (
        <div
          className={cn(
            "px-3 pb-3 pt-2 space-y-3",
            isDash && "md:px-4"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-white/40 truncate">
              {d?.generatedAt
                ? `Updated ${new Date(d.generatedAt).toLocaleString()}`
                : liveRefreshMs || defaultOpen
                  ? "Loading…"
                  : " "}
            </span>
            <button
              type="button"
              onClick={() => void fetchBreakdown()}
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-mono",
                "text-white/70 hover:bg-white/10 disabled:opacity-50"
              )}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[10px] font-mono text-red-300/95">
              {error}
            </div>
          )}

          {loading && !d && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/50 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning database…
            </div>
          )}

          {d && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                  <div className="text-[9px] font-mono uppercase text-white/45">All (excl. deleted)</div>
                  <div className="text-lg font-mono font-semibold text-white tabular-nums">
                    {d.totalNonDeleted.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                  <div className="text-[9px] font-mono uppercase text-white/45">Other test_type</div>
                  <div className="text-lg font-mono font-semibold text-amber-200/90 tabular-nums">
                    {d.otherTestTypeCount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-violet-500/25 bg-violet-500/[0.07] p-2 space-y-1">
                  <div className="text-[10px] font-mono font-semibold text-violet-200/95">TMUA</div>
                  <div className="text-xl font-mono text-white tabular-nums">{d.tmua.total.toLocaleString()}</div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-mono text-white/65">
                    <span>Appr. {d.tmua.approved}</span>
                    <span>Queue {d.tmua.pending}</span>
                    <span>Other {tmuaOtherStatus}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] p-2 space-y-1">
                  <div className="text-[10px] font-mono font-semibold text-emerald-200/95">ESAT</div>
                  <div className="text-xl font-mono text-white tabular-nums">{d.esat.total.toLocaleString()}</div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-mono text-white/65">
                    <span>Appr. {d.esat.approved}</span>
                    <span>Queue {d.esat.pending}</span>
                    <span>Other {esatOtherStatus}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wide text-white/45">
                  Difficulty (all papers)
                </div>
                <div className="space-y-1.5">
                  {DIFF_ORDER.map((key) => {
                    const v = d.difficultyAll[key] ?? 0;
                    if (v === 0 && key === "Other") return null;
                    return (
                      <BarRow
                        key={key}
                        label={key}
                        value={v}
                        max={maxDiff}
                        colorClass="bg-sky-400/70"
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wide text-white/45">
                  ESAT by subject
                </div>
                <div className="space-y-1.5">
                  {sortedEntries(d.esat.bySubject).map(([label, value]) => (
                    <BarRow
                      key={label}
                      label={label}
                      value={value}
                      max={maxEsatSub}
                      colorClass="bg-emerald-400/65"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wide text-white/45">
                  TMUA by subject
                </div>
                <div className="space-y-1.5">
                  {sortedEntries(d.tmua.bySubject).map(([label, value]) => (
                    <BarRow
                      key={label}
                      label={label}
                      value={value}
                      max={maxTmuaSub}
                      colorClass="bg-violet-400/65"
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-white/45">ESAT difficulty</div>
                  {DIFF_ORDER.filter((key) => (d.esat.byDifficulty[key] ?? 0) > 0).map((key) => (
                    <BarRow
                      key={`e-${key}`}
                      label={key}
                      value={d.esat.byDifficulty[key] ?? 0}
                      max={maxOfRecord(d.esat.byDifficulty)}
                      colorClass="bg-emerald-400/50"
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-white/45">TMUA difficulty</div>
                  {DIFF_ORDER.filter((key) => (d.tmua.byDifficulty[key] ?? 0) > 0).map((key) => (
                    <BarRow
                      key={`t-${key}`}
                      label={key}
                      value={d.tmua.byDifficulty[key] ?? 0}
                      max={maxOfRecord(d.tmua.byDifficulty)}
                      colorClass="bg-violet-400/50"
                    />
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  "space-y-3",
                  isDash && "grid gap-4 md:grid-cols-2 md:space-y-0"
                )}
              >
                <MiniMatrix
                  title="ESAT · subject × difficulty"
                  matrix={d.esat.subjectByDifficulty}
                  rowOrderHint={esatSubjectOrder}
                />
                <MiniMatrix
                  title="TMUA · subject × difficulty"
                  matrix={d.tmua.subjectByDifficulty}
                  rowOrderHint={tmuaSubjectOrder}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
