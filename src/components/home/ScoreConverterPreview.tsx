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
  mapsTo: "ESAT" | "TMUA";
  table: string;
  section: {
    label: string;
    raw: number;
    max: number;
    scaled: number;
  };
};

/** Fixed sample conversions for the homepage preview. */
const DEMOS: DemoExam[] = [
  {
    id: "nsaa",
    exam: "NSAA",
    mapsTo: "ESAT",
    table: "esat_math1_cumulative",
    section: { label: "Mathematics 1", raw: 18, max: 40, scaled: 6.1 },
  },
  {
    id: "engaa",
    exam: "ENGAA",
    mapsTo: "ESAT",
    table: "esat_combined_math_phys_cumulative",
    section: { label: "Section 1", raw: 24, max: 40, scaled: 6.7 },
  },
  {
    id: "tmua",
    exam: "TMUA",
    mapsTo: "TMUA",
    table: "esat_math1_cumulative",
    section: { label: "Paper 1", raw: 12, max: 20, scaled: 6.4 },
  },
];

const CHART_BLUE = "#3B82F6";

/**
 * Homepage score-converter preview: percentile curve in site chrome, blue accent.
 * Full year/mark entry lives on /tools/score-converter.
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
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-[#0A0F1D] px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap gap-2">
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
                  : "bg-[#252B3B] text-[#94A3B8] hover:bg-[#2E3648] hover:text-white",
              )}
            >
              {d.exam}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            Predicted {demo.mapsTo}
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
            {score.toFixed(1)}
          </p>
          <p className="mt-1 text-xs tabular-nums text-[#94A3B8]">
            {demo.section.raw}/{demo.section.max} raw · {demo.section.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            Percentile
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-[#93C5FD]">
            {topPct != null ? `Top ${topPct.toFixed(0)}%` : "-"}
          </p>
        </div>
      </div>

      <div className="mt-6 min-h-[12rem] rounded-xl bg-[#161D2F]/80 px-2 py-3 sm:px-3">
        {loading ? (
          <div className="flex h-[12rem] items-center justify-center text-sm text-[#94A3B8]">
            Loading chart…
          </div>
        ) : rows.length > 1 && percentile != null ? (
          <PercentileMiniChart
            key={demo.id}
            rows={rows}
            score={score}
            percentile={percentile}
            xLabel="Scaled score"
            accentColor={CHART_BLUE}
            animate
            className="[&_svg]:h-[190px] [&_text]:fill-[#94A3B8]"
          />
        ) : (
          <div className="flex h-[12rem] items-center justify-center text-sm text-[#94A3B8]">
            Chart unavailable
          </div>
        )}
      </div>

      <Link
        href="/tools/score-converter"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#2563EB]"
      >
        Open score converter
        <span aria-hidden className="text-lg leading-none">
          →
        </span>
      </Link>
    </div>
  );
}
