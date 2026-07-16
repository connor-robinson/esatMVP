"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import {
  fetchEsatTable,
  interpolatePercentile,
  type EsatRow,
} from "@/lib/esat/percentiles";

const SUBJECTS = [
  { id: "math1", label: "Math 1", table: "esat_math1_cumulative" },
  { id: "math2", label: "Math 2", table: "esat_math2_cumulative" },
  { id: "physics", label: "Physics", table: "esat_physics_cumulative" },
  { id: "chem", label: "Chem", table: "esat_chemistry_cumulative" },
  { id: "bio", label: "Bio", table: "esat_biology_cumulative" },
] as const;

const SCORE_PILLS = [5.0, 6.0, 6.5, 7.0, 7.5, 8.0] as const;

type SubjectId = (typeof SUBJECTS)[number]["id"];

/**
 * Interactive homepage preview of the ESAT score converter — real distribution
 * tables + PercentileMiniChart.
 */
export function ScoreConverterPreview() {
  const [subjectId, setSubjectId] = useState<SubjectId>("math1");
  const [score, setScore] = useState(7.0);
  const [rowsByTable, setRowsByTable] = useState<Record<string, EsatRow[]>>({});
  const [loading, setLoading] = useState(true);

  const subject = SUBJECTS.find((s) => s.id === subjectId) ?? SUBJECTS[0];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const entries = await Promise.all(
          SUBJECTS.map(async (s) => {
            const rows = await fetchEsatTable(s.table);
            return [s.table, rows] as const;
          }),
        );
        if (cancelled) return;
        setRowsByTable(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setRowsByTable({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = rowsByTable[subject.table] ?? [];
  const percentile = useMemo(() => {
    if (rows.length < 2) return null;
    const pct = interpolatePercentile(rows, score);
    return Number.isFinite(pct) ? pct : null;
  }, [rows, score]);

  const topPct =
    percentile != null ? Math.max(0, 100 - percentile) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#161D2F] p-5 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
            Score converter
          </p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Official ESAT score distributions
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-display font-bold tabular-nums text-white">
            {score.toFixed(1)}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[#93C5FD]">
            {topPct != null ? `Top ${topPct.toFixed(1)}%` : "Pick a score"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {SUBJECTS.map((s) => {
          const active = s.id === subjectId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubjectId(s.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-[#3B82F6] text-white"
                  : "bg-white/[0.06] text-[#94A3B8] hover:bg-white/10 hover:text-white",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SCORE_PILLS.map((pill) => {
          const active = Math.abs(score - pill) < 0.05;
          return (
            <button
              key={pill}
              type="button"
              onClick={() => setScore(pill)}
              className={cn(
                "min-w-[3rem] rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold tabular-nums transition-colors",
                active
                  ? "bg-white text-[#0A0F1D]"
                  : "bg-[#0A0F1D]/70 text-white/70 hover:bg-[#0A0F1D] hover:text-white",
              )}
            >
              {pill.toFixed(1)}
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-[13.5rem]">
        {loading ? (
          <div className="flex h-[13.5rem] items-center justify-center text-sm text-[#94A3B8]">
            Loading distribution…
          </div>
        ) : rows.length > 1 && percentile != null ? (
          <PercentileMiniChart
            rows={rows}
            score={score}
            percentile={percentile}
            xLabel="Scaled score"
            className="[&_svg]:h-[200px]"
          />
        ) : (
          <div className="flex h-[13.5rem] items-center justify-center text-sm text-[#94A3B8]">
            Chart unavailable right now
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] text-[#94A3B8]">
        Hover the blue point for your exact percentile · {subject.label}
      </p>

      <Link
        href="/tools/score-converter"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#2563EB]"
      >
        Try me
        <span aria-hidden className="text-lg leading-none">
          →
        </span>
      </Link>
    </div>
  );
}
