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

type DemoExam = {
  id: string;
  exam: "NSAA" | "ENGAA" | "TMUA";
  year: number;
  mapsTo: "ESAT" | "TMUA";
  table: string;
  section: {
    label: string;
    raw: number;
    max: number;
    scaled: number;
  };
};

/** Fixed sample conversions - click Try me to enter your own year and marks. */
const DEMOS: DemoExam[] = [
  {
    id: "nsaa",
    exam: "NSAA",
    year: 2023,
    mapsTo: "ESAT",
    table: "esat_math1_cumulative",
    section: { label: "Mathematics 1", raw: 18, max: 40, scaled: 6.1 },
  },
  {
    id: "engaa",
    exam: "ENGAA",
    year: 2022,
    mapsTo: "ESAT",
    table: "esat_combined_math_phys_cumulative",
    section: { label: "Section 1", raw: 24, max: 40, scaled: 6.7 },
  },
  {
    id: "tmua",
    exam: "TMUA",
    year: 2023,
    mapsTo: "TMUA",
    table: "esat_math1_cumulative",
    section: { label: "Paper 1", raw: 12, max: 20, scaled: 6.4 },
  },
];

/**
 * Homepage preview of the score converter: fixed sample conversions with a
 * real percentile chart. Full year/mark entry lives on /tools/score-converter.
 */
export function ScoreConverterPreview() {
  const [demoId, setDemoId] = useState(DEMOS[0]!.id);
  const [rowsByTable, setRowsByTable] = useState<Record<string, EsatRow[]>>({});
  const [loading, setLoading] = useState(true);

  const demo = DEMOS.find((d) => d.id === demoId) ?? DEMOS[0]!;

  useEffect(() => {
    let cancelled = false;
    const tables = [...new Set(DEMOS.map((d) => d.table))];

    async function load() {
      setLoading(true);
      try {
        const entries = await Promise.all(
          tables.map(async (table) => {
            const rows = await fetchEsatTable(table);
            return [table, rows] as const;
          }),
        );
        if (!cancelled) setRowsByTable(Object.fromEntries(entries));
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

  const rows = rowsByTable[demo.table] ?? [];
  const score = demo.section.scaled;
  const percentile = useMemo(() => {
    if (rows.length < 2) return null;
    const pct = interpolatePercentile(rows, score);
    return Number.isFinite(pct) ? pct : null;
  }, [rows, score]);

  const topPct = percentile != null ? Math.max(0, 100 - percentile) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#161D2F] p-5 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3B82F6]">
            Score converter
          </p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            {demo.exam} {demo.year} → {demo.mapsTo}
          </p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-medium text-[#94A3B8]">
          Sample result
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {DEMOS.map((d) => {
          const active = d.id === demoId;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDemoId(d.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-[#3B82F6] text-white"
                  : "bg-white/[0.06] text-[#94A3B8] hover:bg-white/10 hover:text-white",
              )}
            >
              {d.exam}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#0A0F1D]/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">{demo.section.label}</p>
          <p className="mt-0.5 text-xs tabular-nums text-[#94A3B8]">
            {demo.section.raw} / {demo.section.max} raw
          </p>
        </div>
        <p className="text-lg font-bold tabular-nums text-[#93C5FD]">
          {demo.section.scaled.toFixed(1)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-[#0A0F1D]/80 px-4 py-3.5 text-center sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Predicted {demo.mapsTo}
          </p>
          <p className="mt-1 text-2xl font-display font-bold tabular-nums text-white sm:text-3xl">
            {score.toFixed(1)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#0A0F1D]/80 px-4 py-3.5 text-center sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            Percentile
          </p>
          <p className="mt-1 text-2xl font-display font-bold tabular-nums text-white sm:text-3xl">
            {topPct != null ? `Top ${topPct.toFixed(0)}%` : "-"}
          </p>
        </div>
      </div>

      <div className="mt-5 min-h-[11.5rem]">
        {loading ? (
          <div className="flex h-[11.5rem] items-center justify-center text-sm text-[#94A3B8]">
            Loading chart…
          </div>
        ) : rows.length > 1 && percentile != null ? (
          <PercentileMiniChart
            key={demo.id}
            rows={rows}
            score={score}
            percentile={percentile}
            xLabel="Scaled score"
            animate
            className="[&_svg]:h-[180px]"
          />
        ) : (
          <div className="flex h-[11.5rem] items-center justify-center text-sm text-[#94A3B8]">
            Chart unavailable
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] text-[#94A3B8]">
        Hover the blue point for the exact percentile
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
