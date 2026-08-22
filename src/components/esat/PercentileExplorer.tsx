"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Loader2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import {
  DEFAULT_MODULE_ID,
  DEFAULT_SCORE,
  DEFAULT_TEST_CYCLE_ID,
  ESAT_TEST_CYCLES,
  SCORE_MAX,
  SCORE_MIN,
  SCORE_STEP,
  getExplorerModule,
  getTestCycle,
  parseModuleId,
  parseScoreParam,
  parseTestCycleId,
  type EsatExplorerModuleId,
  type EsatTestCycleId,
} from "@/lib/esat/percentileCatalog";
import {
  fetchEsatTable,
  interpolatePercentile,
  type EsatRow,
} from "@/lib/esat/percentiles";
import {
  ensureCumulativeRows,
  formatApproximatePercentile,
  formatCycleInterpretation,
  formatTopPercentLabel,
  roundScore,
} from "@/lib/esat/percentileWording";
import type { ModuleColor } from "@/lib/scoreConverter/esatModules";

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-[#94A3B8]";

const controlBase =
  "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const selectTriggerClass = cn(
  "flex h-11 w-full items-center justify-between gap-2 rounded-2xl px-3.5 text-base font-medium transition-all duration-fast",
  "bg-white/[0.06] text-white hover:bg-white/[0.09] active:scale-[0.99]",
  controlBase,
);

const CHART_ACCENT: Record<ModuleColor, string> = {
  maths: "var(--color-maths)",
  physics: "var(--color-physics)",
  chemistry: "var(--color-chemistry)",
  biology: "var(--color-biology)",
  advanced: "var(--color-advanced)",
  "tmua-accent": "var(--color-tmua-accent)",
};

const MODULE_TEXT: Record<ModuleColor, string> = {
  maths: "text-maths",
  physics: "text-physics",
  chemistry: "text-chemistry",
  biology: "text-biology",
  advanced: "text-advanced",
  "tmua-accent": "text-tmua-accent",
};

const stepperBtnClass = cn(
  "flex h-11 w-11 shrink-0 items-center justify-center text-[#94A3B8] transition-colors",
  "hover:bg-white/[0.08] hover:text-white active:scale-[0.98]",
  "disabled:pointer-events-none disabled:opacity-30",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/20",
  controlBase,
);

function sanitizeScoreDraft(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) return cleaned.slice(0, 2);
  const whole = cleaned.slice(0, dotIndex).slice(0, 1);
  const fraction = cleaned.slice(dotIndex + 1, dotIndex + 2);
  return fraction.length > 0 || cleaned.endsWith(".") ? `${whole}.${fraction}` : whole;
}

function commitScoreDraft(draft: string): number {
  const parsed = Number.parseFloat(draft);
  if (!Number.isFinite(parsed)) return SCORE_MIN;
  return roundScore(Math.max(SCORE_MIN, Math.min(SCORE_MAX, parsed)));
}

function useInitialState() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [cycleId, setCycleId] = useState<EsatTestCycleId>(DEFAULT_TEST_CYCLE_ID);
  const [moduleId, setModuleId] = useState<EsatExplorerModuleId>(DEFAULT_MODULE_ID);
  const [score, setScore] = useState(DEFAULT_SCORE);

  useEffect(() => {
    const cycleParam = parseTestCycleId(searchParams.get("cycle"));
    const moduleParam = parseModuleId(searchParams.get("module"));
    const scoreParam = parseScoreParam(searchParams.get("score"));

    if (cycleParam && getTestCycle(cycleParam)) setCycleId(cycleParam);
    if (moduleParam && getExplorerModule(cycleParam ?? DEFAULT_TEST_CYCLE_ID, moduleParam)) {
      setModuleId(moduleParam);
    }
    if (scoreParam != null) setScore(scoreParam);
    setReady(true);
  }, [searchParams]);

  return { ready, cycleId, setCycleId, moduleId, setModuleId, score, setScore };
}

export function PercentileExplorer() {
  const { ready, cycleId, setCycleId, moduleId, setModuleId, score, setScore } =
    useInitialState();

  const [rowsByKey, setRowsByKey] = useState<Record<string, EsatRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const [scoreInput, setScoreInput] = useState(DEFAULT_SCORE.toFixed(1));

  const cycle = getTestCycle(cycleId);
  const module = getExplorerModule(cycleId, moduleId);

  const tableKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const testCycle of ESAT_TEST_CYCLES) {
      for (const mod of testCycle.modules) keys.add(mod.tableKey);
    }
    return [...keys];
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const entries = await Promise.all(
          tableKeys.map(async (key) => {
            const rows = await fetchEsatTable(key);
            return [key, ensureCumulativeRows(rows)] as const;
          }),
        );
        if (!cancelled) setRowsByKey(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setRowsByKey({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tableKeys]);

  useEffect(() => {
    setScoreInput(score.toFixed(1));
  }, [score]);

  const rows = module ? rowsByKey[module.tableKey] ?? [] : [];

  const percentile = useMemo(() => {
    if (rows.length < 2) return null;
    const value = interpolatePercentile(rows, score);
    return Number.isFinite(value) ? value : null;
  }, [rows, score]);

  const handleScoreChange = useCallback(
    (next: number) => {
      setScore(roundScore(next));
    },
    [setScore],
  );

  const handleScoreInputCommit = useCallback(() => {
    if (!scoreInput || scoreInput === ".") {
      setScoreInput(score.toFixed(1));
      return;
    }
    const next = commitScoreDraft(scoreInput);
    handleScoreChange(next);
    setScoreInput(next.toFixed(1));
  }, [handleScoreChange, score, scoreInput]);

  const bumpScore = useCallback(
    (delta: number) => {
      const next = roundScore(
        Math.max(SCORE_MIN, Math.min(SCORE_MAX, score + delta)),
      );
      handleScoreChange(next);
      setScoreInput(next.toFixed(1));
    },
    [handleScoreChange, score],
  );

  if (!ready || !cycle || !module) return null;

  const accentColor = CHART_ACCENT[module.color];
  const accentTextClass = MODULE_TEXT[module.color];

  return (
    <section id="percentile-explorer" className="scroll-mt-24">
      <div className="rounded-3xl bg-[#161D2F] p-5 sm:p-6 lg:p-7">
        <div className="grid gap-4 border-b border-white/[0.06] pb-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="percentile-cycle" className={fieldLabel}>
              Test cycle
            </label>
            <div className="relative">
              <select
                id="percentile-cycle"
                value={cycleId}
                onChange={(event) => setCycleId(event.target.value as EsatTestCycleId)}
                className={selectTriggerClass}
                aria-label="Test cycle"
              >
                {ESAT_TEST_CYCLES.map((item) => (
                  <option key={item.id} value={item.id} className="bg-[#161D2F]">
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                aria-hidden
              />
            </div>
          </div>

          <div>
            <label htmlFor="percentile-module" className={fieldLabel}>
              Module
            </label>
            <div className="relative">
              <select
                id="percentile-module"
                value={moduleId}
                onChange={(event) =>
                  setModuleId(event.target.value as EsatExplorerModuleId)
                }
                className={selectTriggerClass}
                aria-label="ESAT module"
              >
                {cycle.modules.map((item) => (
                  <option key={item.id} value={item.id} className="bg-[#161D2F]">
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
                aria-hidden
              />
            </div>
          </div>

          <div>
            <label htmlFor="percentile-score-input" className={fieldLabel}>
              ESAT score
            </label>
            <div
              className="flex h-11 w-full items-stretch overflow-hidden rounded-2xl bg-white/[0.06]"
              role="group"
              aria-label="ESAT score"
            >
              <button
                type="button"
                onClick={() => bumpScore(-SCORE_STEP)}
                disabled={score <= SCORE_MIN}
                className={stepperBtnClass}
                aria-label="Decrease ESAT score by 0.1"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
              <input
                id="percentile-score-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={scoreInput}
                onChange={(event) =>
                  setScoreInput(sanitizeScoreDraft(event.target.value))
                }
                onBlur={handleScoreInputCommit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleScoreInputCommit();
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    bumpScore(SCORE_STEP);
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    bumpScore(-SCORE_STEP);
                  }
                }}
                aria-label="ESAT score"
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-center text-base font-semibold tabular-nums text-white",
                  controlBase,
                )}
              />
              <button
                type="button"
                onClick={() => bumpScore(SCORE_STEP)}
                disabled={score >= SCORE_MAX}
                className={stepperBtnClass}
                aria-label="Increase ESAT score by 0.1"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6" aria-live="polite" aria-atomic="true">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-display font-bold text-white sm:text-3xl">
                <span className={cn("tabular-nums", accentTextClass)}>
                  {score.toFixed(1)}
                </span>{" "}
                in {module.label}
              </p>
              {percentile != null ? (
                <>
                  <p className={cn("mt-1 text-lg font-semibold", accentTextClass)}>
                    {formatApproximatePercentile(percentile)}
                  </p>
                  <p className="mt-0.5 text-sm text-[#94A3B8]">
                    {formatTopPercentLabel(percentile)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-[#94A3B8]">
                  Percentile unavailable for this selection.
                </p>
              )}
            </div>
            {percentile != null ? (
              <p className="max-w-md text-sm leading-relaxed text-[#94A3B8]">
                {formatCycleInterpretation(score, module.label, cycle.label, percentile)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex h-[260px] items-center justify-center rounded-2xl bg-white/[0.04] text-sm text-[#94A3B8]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Loading distribution…
            </div>
          ) : rows.length > 1 && percentile != null ? (
            <PercentileMiniChart
              rows={rows}
              score={score}
              percentile={percentile}
              accentColor={accentColor}
              xLabel="ESAT score"
              interactive
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center rounded-2xl bg-white/[0.04] text-sm text-[#94A3B8]">
              Chart unavailable for this module.
            </div>
          )}
        </div>

        <div className="mt-5 space-y-2 text-sm leading-relaxed text-[#94A3B8]">
          <p>
            Source:{" "}
            <a
              href={cycle.explanationOfResultsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/60"
            >
              UAT-UK Explanation of Results
            </a>
          </p>
          <p>
            Percentiles describe performance within that test cohort. They are not university
            admissions cut-offs.
          </p>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDataTable((open) => !open)}
            aria-expanded={showDataTable}
            aria-controls="percentile-explorer-data-table"
            className="inline-flex min-h-11 items-center rounded-2xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
          >
            {showDataTable ? "Hide graph data" : "View graph data"}
          </button>

          {showDataTable ? (
            <div id="percentile-explorer-data-table" className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-[#94A3B8]">
                <caption className="sr-only">
                  Published score distribution for {module.label} in the {cycle.label}
                </caption>
                <thead>
                  <tr className="text-xs uppercase tracking-[0.12em] text-[#64748B]">
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Score
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      % candidates
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Cumulative % at or below score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.score} className="border-t border-white/[0.06]">
                      <td className="px-3 py-2 tabular-nums text-white">{row.score.toFixed(1)}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.candidatePct != null ? row.candidatePct.toFixed(1) : "-"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{row.cumulativePct.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
