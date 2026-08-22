"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PercentileChartSkeleton,
  PercentileCumulativeChart,
} from "@/components/esat/PercentileCumulativeChart";
import { SeoSection } from "@/components/seo/SeoSections";
import {
  DEFAULT_MODULE_ID,
  DEFAULT_SCORE,
  DEFAULT_TEST_CYCLE_ID,
  ESAT_TEST_CYCLES,
  SCORE_MAX,
  SCORE_MIN,
  SCORE_STEP,
  cycleSupportsComparison,
  getExplorerModule,
  getPreviousTestCycle,
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
  formatPercentileDetail,
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

function useInitialState() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [cycleId, setCycleId] = useState<EsatTestCycleId>(DEFAULT_TEST_CYCLE_ID);
  const [moduleId, setModuleId] = useState<EsatExplorerModuleId>(DEFAULT_MODULE_ID);
  const [score, setScore] = useState(DEFAULT_SCORE);
  const [compareEnabled, setCompareEnabled] = useState(false);

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

  return { ready, cycleId, setCycleId, moduleId, setModuleId, score, setScore, compareEnabled, setCompareEnabled };
}

export function PercentileExplorer() {
  const {
    ready,
    cycleId,
    setCycleId,
    moduleId,
    setModuleId,
    score,
    setScore,
    compareEnabled,
    setCompareEnabled,
  } = useInitialState();

  const [rowsByKey, setRowsByKey] = useState<Record<string, EsatRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [showDataTable, setShowDataTable] = useState(false);
  const [scoreInput, setScoreInput] = useState(DEFAULT_SCORE.toFixed(1));

  const cycle = getTestCycle(cycleId);
  const module = getExplorerModule(cycleId, moduleId);
  const previousCycle = getPreviousTestCycle(cycleId);
  const canCompare = cycleSupportsComparison(cycleId);

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

  useEffect(() => {
    if (!canCompare && compareEnabled) setCompareEnabled(false);
  }, [canCompare, compareEnabled, setCompareEnabled]);

  const rows = module ? rowsByKey[module.tableKey] ?? [] : [];
  const compareModule =
    compareEnabled && previousCycle
      ? previousCycle.modules.find((item) => item.id === moduleId)
      : undefined;
  const compareRows =
    compareModule && compareEnabled ? rowsByKey[compareModule.tableKey] ?? [] : undefined;

  const percentile = useMemo(() => {
    if (rows.length < 2) return null;
    const value = interpolatePercentile(rows, score);
    return Number.isFinite(value) ? value : null;
  }, [rows, score]);

  const handleScoreChange = useCallback((next: number) => {
    setScore(roundScore(next));
  }, [setScore]);

  const handleScoreInputCommit = useCallback(() => {
    const parsed = Number.parseFloat(scoreInput);
    if (!Number.isFinite(parsed)) {
      setScoreInput(score.toFixed(1));
      return;
    }
    handleScoreChange(parsed);
  }, [handleScoreChange, score, scoreInput]);

  if (!ready || !cycle || !module) return null;

  const accentColor = CHART_ACCENT[module.color];

  return (
    <SeoSection
      id="percentile-explorer"
      heading="Explore ESAT score percentiles"
      lead="See where a scaled score sits within the official UAT-UK distribution for each module and test cycle."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="percentile-cycle" className={fieldLabel}>
              Test cycle
            </label>
            <div className="relative">
              <select
                id="percentile-cycle"
                value={cycleId}
                onChange={(event) =>
                  setCycleId(event.target.value as EsatTestCycleId)
                }
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

          <div className="sm:col-span-2">
            <label htmlFor="percentile-score-slider" className={fieldLabel}>
              ESAT score
            </label>
            <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.04] p-4 sm:flex-row sm:items-center">
              <input
                id="percentile-score-slider"
                type="range"
                min={SCORE_MIN}
                max={SCORE_MAX}
                step={SCORE_STEP}
                value={score}
                onChange={(event) => handleScoreChange(Number(event.target.value))}
                aria-valuemin={SCORE_MIN}
                aria-valuemax={SCORE_MAX}
                aria-valuenow={score}
                aria-label="ESAT score slider"
                className="h-3 w-full cursor-pointer accent-[#3B82F6]"
              />
              <div className="flex items-center gap-2 sm:w-28 sm:shrink-0">
                <label htmlFor="percentile-score-input" className="sr-only">
                  ESAT score numeric input
                </label>
                <input
                  id="percentile-score-input"
                  type="number"
                  min={SCORE_MIN}
                  max={SCORE_MAX}
                  step={SCORE_STEP}
                  value={scoreInput}
                  onChange={(event) => setScoreInput(event.target.value)}
                  onBlur={handleScoreInputCommit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleScoreInputCommit();
                  }}
                  aria-label="ESAT score numeric input"
                  className={cn(
                    "h-11 w-full rounded-2xl bg-[#0A0F1D]/80 px-3 text-center text-base font-semibold tabular-nums text-white",
                    controlBase,
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {canCompare ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[#94A3B8]">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(event) => setCompareEnabled(event.target.checked)}
              className="h-5 w-5 shrink-0 rounded accent-[#3B82F6]"
              aria-label="Compare with previous test cycle"
            />
            Compare with previous cycle
            {previousCycle ? ` (${previousCycle.label})` : null}
          </label>
        ) : null}

        <div
          className="rounded-3xl bg-[#161D2F] p-5 sm:p-6"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="space-y-1">
            <p className="text-2xl font-display font-bold text-white sm:text-3xl">
              {score.toFixed(1)} in {module.label}
            </p>
            {percentile != null ? (
              <>
                <p className="text-lg font-semibold text-[#93C5FD]">
                  {formatApproximatePercentile(percentile)}
                </p>
                <p className="text-base text-white/90">{formatTopPercentLabel(percentile)}</p>
                <p className="pt-2 text-sm leading-relaxed text-[#94A3B8]">
                  {formatCycleInterpretation(score, module.label, cycle.label, percentile)}
                </p>
                <p className="text-xs leading-relaxed text-[#64748B]">
                  {formatPercentileDetail(percentile)}
                </p>
              </>
            ) : (
              <p className="text-sm text-[#94A3B8]">Percentile unavailable for this selection.</p>
            )}
          </div>

          <div className="mt-6">
            {loading ? (
              <PercentileChartSkeleton />
            ) : rows.length > 1 && percentile != null ? (
              <PercentileCumulativeChart
                rows={rows}
                compareRows={compareRows}
                score={score}
                onScoreChange={handleScoreChange}
                accentColor={accentColor}
                compareLabel={previousCycle?.label ?? "Previous cycle"}
              />
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-2xl bg-white/[0.04] text-sm text-[#94A3B8]">
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
                className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
              >
                UAT-UK Explanation of Results
              </a>
            </p>
            <p>
              Percentiles describe performance within that test cohort. They are not university
              admissions cut-offs.
            </p>
          </div>

          <div className="mt-5">
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
                    Published cumulative percentile data for {module.label} in the {cycle.label}
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

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Loading official percentile tables…
          </div>
        ) : null}
      </div>
    </SeoSection>
  );
}
