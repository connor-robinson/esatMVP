"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cssVar } from "@/config/colors";
import { Container } from "@/components/layout/Container";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import {
  TmuaDualCurveChart,
  TmuaDualCurveExplainer,
} from "@/components/tools/scoreConverter/TmuaDualCurveChart";
import { fetchEsatTable, type EsatRow } from "@/lib/esat/percentiles";
import {
  CONVERTER_EXAMS,
  TMUA_IRT_FROM_YEAR,
  resolvePercentileTableKey,
  type ConverterExam,
  type ConvertResponse,
  type ConvertedSection,
  type ModuleColor,
  type SectionOption,
  type SectionsResponse,
  type YearOption,
  type YearsResponse,
} from "@/lib/scoreConverter/esatModules";

const MAX_SECTIONS = 3;
const OVERALL_CHART_KEY = "__overall__";

/** What the selected past paper proxies for in current admissions. */
function examTargetLabel(exam: ConverterExam): "ESAT" | "TMUA" {
  return exam === "TMUA" ? "TMUA" : "ESAT";
}

const fieldLabel = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle";

const controlBase = "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const selectWrap =
  "relative min-w-[5.5rem] rounded-organic-lg bg-surface-mid transition-colors hover:bg-surface-subtle border-0";

const selectClass = cn(
  "h-9 w-full cursor-pointer appearance-none rounded-organic-lg bg-transparent py-0 pl-3 pr-8 text-sm font-medium text-text [color-scheme:dark]",
  controlBase,
);

const markInputClass = cn(
  "h-8 w-11 rounded-organic-md bg-surface-mid text-center text-sm font-semibold tabular-nums text-text disabled:opacity-35",
  controlBase,
);

const COLOR_TEXT: Record<ModuleColor, string> = {
  maths: "text-maths",
  physics: "text-physics",
  chemistry: "text-chemistry",
  biology: "text-biology",
  advanced: "text-advanced",
  "tmua-accent": "text-tmua-accent",
};

function displaySubject(opt: SectionOption): string {
  if (opt.moduleLabel) return opt.moduleLabel;
  const tail = opt.legacyLabel.split("—")[1]?.trim();
  if (tail) {
    if (/both papers/i.test(tail)) return "Both papers";
    return tail;
  }
  return opt.legacyLabel.split("—")[0]?.trim() ?? opt.partName;
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children,
  minWidth = "5rem",
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <label className="block shrink-0">
      <span className={fieldLabel}>{label}</span>
      <div className={selectWrap} style={{ minWidth }}>
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(selectClass, disabled && "opacity-40")}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
      </div>
    </label>
  );
}

export function ScoreConverter({ initialExam }: { initialExam?: ConverterExam }) {
  const [exam, setExam] = useState<ConverterExam>(initialExam ?? "NSAA");

  useEffect(() => {
    if (initialExam) setExam(initialExam);
  }, [initialExam]);

  const [years, setYears] = useState<YearOption[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [year, setYear] = useState<YearOption | null>(null);

  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [rawByKey, setRawByKey] = useState<Record<string, number>>({});
  const [scaledInput, setScaledInput] = useState("");

  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  const [activeChartKey, setActiveChartKey] = useState<string | null>(null);
  const [chartRows, setChartRows] = useState<EsatRow[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const isScaledMode = year?.mode === "scaled";

  const isNsaaEngaa = exam === "NSAA" || exam === "ENGAA";
  const isTmuaRaw = exam === "TMUA" && !isScaledMode;

  const sectionGroups = useMemo(() => {
    const map = new Map<string, SectionOption[]>();
    for (const s of sections) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return Array.from(map.entries());
  }, [sections]);

  const partsInGroup = useMemo(() => {
    if (!isNsaaEngaa) return sections;
    return sectionGroups.find(([g]) => g === selectedGroup)?.[1] ?? [];
  }, [sections, sectionGroups, selectedGroup, isNsaaEngaa]);

  const checkedSections = useMemo(
    () => sections.filter((s) => checkedKeys.includes(s.key)),
    [sections, checkedKeys],
  );

  const scaledValid = useMemo(() => {
    const n = parseFloat(scaledInput);
    return Number.isFinite(n) && n >= 1 && n <= 9;
  }, [scaledInput]);

  const canCalculate = isScaledMode
    ? year != null && scaledValid
    : year != null && checkedSections.length > 0;

  const invalidateResults = useCallback(() => {
    setHasCalculated(false);
    setResult(null);
    setResultError(null);
    setActiveChartKey(null);
    setChartRows([]);
  }, []);

  useEffect(() => {
    setYearsLoading(true);
    setYear(null);
    setSections([]);
    setSelectedGroup("");
    setCheckedKeys([]);
    setRawByKey({});
    setScaledInput("");
    invalidateResults();

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/score-converter/years?exam=${exam}`);
        if (!res.ok) throw new Error("years");
        const data = (await res.json()) as YearsResponse;
        if (!cancelled) {
          setYears(data.years.filter((y) => y.hasData || y.mode === "scaled"));
        }
      } catch {
        if (!cancelled) setYears([]);
      } finally {
        if (!cancelled) setYearsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam, invalidateResults]);

  useEffect(() => {
    if (!year || year.mode === "scaled") {
      setSections([]);
      setCheckedKeys([]);
      return;
    }

    setSectionsLoading(true);
    setCheckedKeys([]);
    setRawByKey({});
    invalidateResults();

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/score-converter/sections?exam=${exam}&year=${year.year}`,
        );
        if (!res.ok) throw new Error("sections");
        const data = (await res.json()) as SectionsResponse;
        if (!cancelled) setSections(data.options);
      } catch {
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam, year, invalidateResults]);

  useEffect(() => {
    if (sectionGroups.length === 0) {
      setSelectedGroup("");
      return;
    }
    setSelectedGroup((prev) =>
      sectionGroups.some(([g]) => g === prev) ? prev : sectionGroups[0][0],
    );
  }, [sectionGroups]);

  const handleGroupChange = (group: string) => {
    invalidateResults();
    setSelectedGroup(group);
    setCheckedKeys((prev) =>
      prev.filter((k) => sections.some((s) => s.key === k && s.group === group)),
    );
  };

  const toggleSection = (opt: SectionOption) => {
    invalidateResults();
    if (isTmuaRaw) {
      setCheckedKeys([opt.key]);
      setRawByKey((r) => ({ ...r, [opt.key]: r[opt.key] ?? 0 }));
      return;
    }
    setCheckedKeys((prev) => {
      if (prev.includes(opt.key)) {
        return prev.filter((k) => k !== opt.key);
      }
      if (prev.length >= MAX_SECTIONS) return prev;
      setRawByKey((r) => ({ ...r, [opt.key]: r[opt.key] ?? 0 }));
      return [...prev, opt.key];
    });
  };

  const setRaw = (key: string, value: number) => {
    invalidateResults();
    setRawByKey((prev) => ({ ...prev, [key]: value }));
  };

  const runConvert = async () => {
    if (!year || !canCalculate) return;
    setResultLoading(true);
    setResultError(null);
    setHasCalculated(true);
    setResult(null);
    setChartRows([]);
    setActiveChartKey(null);

    try {
      const payload = isScaledMode
        ? { exam, year: year.year, mode: "scaled", scaledScore: parseFloat(scaledInput) }
        : {
            exam,
            year: year.year,
            mode: "raw",
            selections: checkedSections.map((o) => ({
              paperName: o.paperName,
              partName: o.partName,
              legacyLabel: o.legacyLabel,
              raw: rawByKey[o.key] ?? 0,
            })),
          };
      const res = await fetch("/api/score-converter/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Conversion failed");
      }
      const data = (await res.json()) as ConvertResponse;
      setResult(data);
      const isMultiEsat = data.sections.length > 1 && exam !== "TMUA";
      setActiveChartKey(
        isMultiEsat ? OVERALL_CHART_KEY : (data.sections[0]?.key ?? null),
      );
    } catch (e: unknown) {
      setResult(null);
      setResultError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setResultLoading(false);
    }
  };

  const activeSection = useMemo(
    () => result?.sections.find((s) => s.key === activeChartKey) ?? result?.sections[0] ?? null,
    [result, activeChartKey],
  );

  useEffect(() => {
    const isTmuaLegacy =
      exam === "TMUA" && year && year.year < TMUA_IRT_FROM_YEAR;
    if (
      !result ||
      !year ||
      activeChartKey === OVERALL_CHART_KEY ||
      activeSection?.scaledScore == null ||
      activeSection.tmuaDualCurve ||
      activeSection.chartRows ||
      isTmuaLegacy
    ) {
      setChartRows([]);
      return;
    }

    const sectionOpt = sections.find((s) => s.key === activeSection.key);
    const partName = isScaledMode
      ? "Paper 1"
      : sectionOpt?.partName ?? activeSection.legacyLabel;
    const tableKey = resolvePercentileTableKey(exam, year.year, partName);
    if (!tableKey) {
      setChartRows([]);
      return;
    }

    let cancelled = false;
    setChartLoading(true);
    fetchEsatTable(tableKey)
      .then((rows) => {
        if (!cancelled) setChartRows(rows);
      })
      .catch(() => {
        if (!cancelled) setChartRows([]);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result, exam, year, isScaledMode, activeSection, sections]);

  return (
    <Container size="lg" className="py-10 sm:py-14">
      {/* Results — top */}
      <div className="mb-5 min-h-[280px] rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card sm:min-h-[320px] sm:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-4xl">
            ESAT Score Converter
          </h1>
          {exam !== "TMUA" && (
            <p className="mt-2 text-sm text-text-muted">
              Take TMUA instead? Switch using the{" "}
              <span className="font-medium text-text">Exam</span> selector below.
            </p>
          )}
        </div>

        {!hasCalculated && !resultLoading && !resultError && (
          <ResultsPreviewPlaceholder exam={exam} year={year?.year} />
        )}

        {resultLoading && (
          <ResultsPreviewPlaceholder exam={exam} year={year?.year} loading />
        )}

        {resultError && hasCalculated && !resultLoading && (
          <div className="space-y-4">
            <ResultsPreviewPlaceholder exam={exam} year={year?.year} />
            <p className="text-center text-sm text-error">{resultError}</p>
          </div>
        )}

        {result && !resultLoading && (
          <ResultsPanel
            result={result}
            exam={exam}
            year={year!.year}
            activeSection={activeSection}
            activeChartKey={activeChartKey}
            onSelectChart={setActiveChartKey}
            chartRows={chartRows}
            chartLoading={chartLoading}
          />
        )}
      </div>

      {/* Inputs */}
      <div className="rounded-organic-xl bg-surface-elevated p-4 shadow-modal-card sm:p-5">
        {/* Row 1: exam, year, section, calculate */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="block shrink-0">
            <span className={fieldLabel}>Exam</span>
            <div className="flex items-center gap-2">
              <div className={cn(selectWrap, "min-w-[5.5rem]")}>
                <select
                  value={exam}
                  onChange={(e) => {
                    setExam(e.target.value as ConverterExam);
                    setYear(null);
                    invalidateResults();
                  }}
                  className={selectClass}
                >
                  {CONVERTER_EXAMS.map((e) => (
                    <option key={e} value={e} className="bg-surface-elevated text-text">
                      {e}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              </div>
              <span className="text-sm text-text-subtle">›</span>
              <span
                className={cn(
                  "text-sm font-bold tracking-tight",
                  exam === "TMUA" ? "text-tmua-accent" : "text-secondary",
                )}
              >
                {examTargetLabel(exam)}
              </span>
            </div>
          </label>

          <SelectField
            label="Year"
            value={year?.year ?? ""}
            minWidth="4.5rem"
            disabled={yearsLoading || years.length === 0}
            onChange={(e) => {
              const opt = years.find((y) => y.year === Number(e.target.value)) ?? null;
              setYear(opt);
              setScaledInput("");
              setCheckedKeys([]);
              setRawByKey({});
              invalidateResults();
            }}
          >
            <option value="" disabled className="bg-surface-elevated text-text">
              {yearsLoading ? "…" : "—"}
            </option>
            {years.map((y) => (
              <option key={y.year} value={y.year} className="bg-surface-elevated text-text">
                {y.year}
              </option>
            ))}
          </SelectField>

          {year && isNsaaEngaa && !isScaledMode && sectionGroups.length > 0 && (
            <SelectField
              label="Section"
              value={selectedGroup}
              minWidth="7rem"
              disabled={sectionsLoading}
              onChange={(e) => handleGroupChange(e.target.value)}
            >
              {sectionGroups.map(([group]) => (
                <option key={group} value={group} className="bg-surface-elevated text-text">
                  {group}
                </option>
              ))}
            </SelectField>
          )}

          {year && isScaledMode && (
            <label className="block shrink-0">
              <span className={fieldLabel}>Scaled</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={scaledInput}
                  onChange={(e) => {
                    invalidateResults();
                    setScaledInput(e.target.value.replace(/[^0-9.]/g, ""));
                  }}
                  placeholder="6.8"
                  className={cn(markInputClass, "w-14")}
                />
                <span className="text-xs font-medium text-text-subtle">/9</span>
              </div>
            </label>
          )}

          <button
            type="button"
            onClick={() => void runConvert()}
            disabled={!canCalculate || resultLoading}
            className={cn(
              "ml-auto inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-organic-lg bg-secondary px-5 text-sm font-semibold text-background transition-all duration-fast",
              "hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100",
            )}
          >
            {resultLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="sr-only">Calculating</span>
              </>
            ) : (
              "Calculate"
            )}
          </button>
        </div>

        {/* Row 2: subject marks */}
        {year && !isScaledMode && (
          <div className="mt-4 pt-2">
            {sectionsLoading && (
              <span className="text-xs text-text-muted">Loading…</span>
            )}
            {!sectionsLoading && partsInGroup.length === 0 && (
              <span className="text-xs text-text-muted">No subjects for this section.</span>
            )}
            {!sectionsLoading && partsInGroup.length > 0 && (
              <div
                className={cn(
                  "grid gap-2",
                  isTmuaRaw ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
                )}
              >
                {partsInGroup.map((s) => {
                  const checked = checkedKeys.includes(s.key);
                  const disabled =
                    !isTmuaRaw && !checked && checkedKeys.length >= MAX_SECTIONS;
                  const c = COLOR_TEXT[s.color];
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        "rounded-organic-lg bg-surface-mid/40 px-3 py-2.5 transition-opacity",
                        !checked && "opacity-55",
                        disabled && "opacity-35",
                      )}
                    >
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2",
                          disabled && "cursor-not-allowed",
                        )}
                      >
                        <input
                          type={isTmuaRaw ? "radio" : "checkbox"}
                          name={isTmuaRaw ? "tmua-section" : undefined}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleSection(s)}
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 cursor-pointer accent-secondary",
                            isTmuaRaw ? "rounded-full" : "rounded",
                            controlBase,
                          )}
                        />
                        <span className={cn("truncate text-xs font-semibold", c)}>
                          {displaySubject(s)}
                        </span>
                      </label>
                      <div className="mt-2 flex items-baseline gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={!checked}
                          value={checked ? String(rawByKey[s.key] ?? 0) : ""}
                          placeholder="—"
                          onChange={(e) => {
                            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                            if (Number.isNaN(n)) setRaw(s.key, 0);
                            else setRaw(s.key, Math.max(0, Math.min(s.maxRaw, n)));
                          }}
                          className={cn(markInputClass, "w-12")}
                        />
                        <span className="text-[11px] font-medium text-text-subtle">
                          /{s.maxRaw}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-text-subtle">
        Historical proxy from official data — not an ESAT score.
      </p>
    </Container>
  );
}

function ResultsPanel({
  result,
  exam,
  year,
  activeSection,
  activeChartKey,
  onSelectChart,
  chartRows,
  chartLoading,
}: {
  result: ConvertResponse;
  exam: ConverterExam;
  year: number;
  activeSection: ConvertedSection | null;
  activeChartKey: string | null;
  onSelectChart: (key: string) => void;
  chartRows: EsatRow[];
  chartLoading: boolean;
}) {
  const multi = result.sections.length > 1;
  const showOverall = multi && exam !== "TMUA" && result.averageScaled != null;
  const showingOverall = activeChartKey === OVERALL_CHART_KEY;

  const sectionChartRows =
    activeSection?.chartRows && activeSection.chartRows.length > 1
      ? activeSection.chartRows
      : chartRows;

  return (
    <div className="space-y-5">
      {multi && (
        <div className="flex flex-wrap gap-2">
          {showOverall && (
            <button
              type="button"
              onClick={() => onSelectChart(OVERALL_CHART_KEY)}
              className={cn(
                "rounded-organic-md px-3 py-1.5 text-xs font-semibold transition-colors",
                showingOverall
                  ? "bg-surface-mid text-text"
                  : "text-text-muted hover:bg-surface-subtle",
              )}
            >
              <span className="text-secondary">Overall</span>
              <span className="ml-1.5 tabular-nums text-text">
                {result.averageScaled!.toFixed(1)}
              </span>
            </button>
          )}
          {result.sections.map((s) => {
            const active = s.key === activeChartKey;
            const c = COLOR_TEXT[s.color];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelectChart(s.key)}
                className={cn(
                  "rounded-organic-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  active ? "bg-surface-mid text-text" : "text-text-muted hover:bg-surface-subtle",
                )}
              >
                <span className={c}>
                  {s.moduleLabel ??
                    s.legacyLabel.split("—")[1]?.trim() ??
                    s.legacyLabel.split("—")[0]?.trim()}
                </span>
                {s.scaledScore != null && (
                  <span className="ml-1.5 tabular-nums text-text">
                    {s.scaledScore.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {showingOverall && showOverall ? (
        <OverallResult result={result} exam={exam} year={year} />
      ) : activeSection ? (
        <SectionResult
          section={activeSection}
          exam={exam}
          year={year}
          chartRows={sectionChartRows}
          chartLoading={chartLoading && sectionChartRows.length === 0}
        />
      ) : (
        <p className="text-sm text-text-muted">No results.</p>
      )}
    </div>
  );
}

function OverallResult({
  result,
  exam,
  year,
}: {
  result: ConvertResponse;
  exam: ConverterExam;
  year: number;
}) {
  const topPct =
    result.averagePercentile != null
      ? Math.max(0, 100 - result.averagePercentile).toFixed(1)
      : null;
  const chartRows = result.overallChartRows ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-text-subtle">
            {exam} {year} · Overall
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-secondary sm:text-5xl">
            {result.averageScaled!.toFixed(1)}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Average across {result.sections.length} subjects
          </p>
        </div>
        {topPct != null && (
          <div className="text-right">
            <p className="text-xs text-text-subtle">Top</p>
            <p className="text-3xl font-bold tabular-nums text-text sm:text-4xl">
              {topPct}%
            </p>
          </div>
        )}
      </div>

      {chartRows.length > 1 && result.averageScaled != null && (
        <PercentileMiniChart
          rows={chartRows}
          score={result.averageScaled}
          percentile={result.averagePercentile}
          xLabel="Scaled score"
        />
      )}
    </div>
  );
}

function SectionResult({
  section,
  exam,
  year,
  chartRows,
  chartLoading,
}: {
  section: ConvertedSection;
  exam: ConverterExam;
  year: number;
  chartRows: EsatRow[];
  chartLoading: boolean;
}) {
  const colorClass = COLOR_TEXT[section.color];
  const dual = section.tmuaDualCurve;
  const topPct =
    section.percentile != null
      ? Math.max(0, 100 - section.percentile).toFixed(1)
      : null;

  if (section.scaledScore == null) {
    return (
      <p className="text-sm text-text-muted">No conversion data for this section.</p>
    );
  }

  if (dual) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs text-text-subtle">
            {exam} {year}
            {section.legacyLabel ? ` · ${section.legacyLabel}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
                Actual {year}
              </p>
              <p className={cn("text-3xl font-bold tabular-nums sm:text-4xl", colorClass)}>
                {dual.student.actualScaled.toFixed(1)}
              </p>
              {section.raw != null && section.maxRaw != null && (
                <p className="mt-0.5 text-xs text-text-muted">
                  {section.raw}/{section.maxRaw} raw
                </p>
              )}
            </div>
            {dual.student.estimatedScaled != null && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
                  Est. 2026 scale
                </p>
                <p className="text-3xl font-bold tabular-nums text-secondary sm:text-4xl">
                  {dual.student.estimatedScaled.toFixed(1)}
                </p>
                {topPct != null && (
                  <p className="mt-0.5 text-xs text-text-muted">Top {topPct}%</p>
                )}
              </div>
            )}
          </div>
        </div>

        <TmuaDualCurveChart data={dual} />
        <TmuaDualCurveExplainer summary={dual.summary} />

        {section.fallbackFromYear != null && (
          <NoteRow>
            {year} table unavailable — using {section.fallbackFromYear} as approximation.
          </NoteRow>
        )}

        {section.confidence !== "high" && section.reliabilityNote && (
          <NoteRow warning>{section.reliabilityNote}</NoteRow>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-text-subtle">
            {exam} {year}
            {section.legacyLabel ? ` · ${section.legacyLabel}` : ""}
          </p>
          <p className={cn("mt-1 text-4xl font-bold tabular-nums sm:text-5xl", colorClass)}>
            {section.scaledScore.toFixed(1)}
          </p>
          {section.raw != null && section.maxRaw != null && (
            <p className="mt-0.5 text-xs text-text-muted">
              {section.raw}/{section.maxRaw} correct
            </p>
          )}
        </div>
        {topPct != null && (
          <div className="text-right">
            <p className="text-xs text-text-subtle">Top</p>
            <p className="text-3xl font-bold tabular-nums text-text sm:text-4xl">
              {topPct}%
            </p>
          </div>
        )}
      </div>

      {chartLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading chart…
        </div>
      )}

      {!chartLoading && chartRows.length > 1 && (
        <PercentileMiniChart
          rows={chartRows}
          score={section.scaledScore}
          percentile={section.percentile}
          xLabel="Scaled score"
        />
      )}

      {section.newScaleEquivalent != null && (
        <p className="text-xs text-text-muted">
          ≈ {section.newScaleEquivalent.toFixed(1)} on post-2024 TMUA scale
        </p>
      )}

      {section.fallbackFromYear != null && (
        <NoteRow>
          {year} table unavailable — using {section.fallbackFromYear} as approximation.
        </NoteRow>
      )}

      {section.confidence !== "high" && section.reliabilityNote && (
        <NoteRow warning>{section.reliabilityNote}</NoteRow>
      )}
    </div>
  );
}

function NoteRow({
  children,
  warning,
}: {
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-organic-md p-3 text-xs leading-relaxed text-text-muted",
        warning ? "bg-warning/10" : "bg-surface-subtle",
      )}
    >
      {warning && (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      )}
      {children}
    </div>
  );
}

/** Mirrors the real results layout before Calculate — ??? scores + ghost chart. */
function ResultsPreviewPlaceholder({
  exam,
  year,
  loading = false,
}: {
  exam: ConverterExam;
  year?: number;
  loading?: boolean;
}) {
  const accent =
    exam === "TMUA" ? COLOR_TEXT["tmua-accent"] : "text-text-subtle";

  return (
    <div className={cn("relative space-y-5", loading && "opacity-70")}>
      {loading && (
        <div className="absolute right-0 top-0 flex items-center gap-2 text-xs text-text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
          Calculating…
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-text-subtle">
            {year ? `${exam} ${year}` : `${exam} › ${examTargetLabel(exam)}`}
            <span className="text-text-muted"> · —</span>
          </p>
          <p
            className={cn(
              "mt-1 text-4xl font-bold tracking-widest tabular-nums sm:text-5xl",
              accent,
              loading ? "animate-pulse opacity-50" : "opacity-40",
            )}
          >
            ???
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-subtle">Top</p>
          <p
            className={cn(
              "text-3xl font-bold tracking-wider tabular-nums sm:text-4xl",
              loading ? "animate-pulse text-text-subtle/50" : "text-text-subtle/40",
            )}
          >
            ??%
          </p>
        </div>
      </div>

      <GhostPercentileChart />
    </div>
  );
}

/** Fuzzy stand-in for the distribution chart — same footprint, no real data. */
function GhostPercentileChart() {
  const w = 720;
  const h = 220;
  const pad = 32;
  const minX = 1;
  const maxX = 9;
  const densities = [
    { score: 1, d: 0.4 },
    { score: 2, d: 1.2 },
    { score: 3, d: 3.5 },
    { score: 4, d: 6.8 },
    { score: 5, d: 9.2 },
    { score: 6, d: 8.5 },
    { score: 7, d: 5.2 },
    { score: 8, d: 2.1 },
    { score: 9, d: 0.5 },
  ];
  const maxY = 10;

  const toX = (x: number) =>
    pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
  const toY = (y: number) => h - pad - (y / maxY) * (h - 2 * pad);

  const linePoints = densities.map((p) => `${toX(p.score)},${toY(p.d)}`).join(" ");
  const areaPoints = [
    `${toX(minX)},${h - pad}`,
    ...densities.map((p) => `${toX(p.score)},${toY(p.d)}`),
    `${toX(maxX)},${h - pad}`,
  ].join(" ");

  const ghostScore = 5.5;
  const ghostX = toX(ghostScore);
  const ghostY = toY(6.2);

  return (
    <div className="relative" aria-hidden>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block blur-[2px] opacity-40 saturate-50"
      >
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={cssVar.borderSubtle} />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke={cssVar.borderSubtle} />
        <polygon
          points={areaPoints}
          fill="color-mix(in srgb, var(--color-maths) 12%, transparent)"
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke={cssVar.textSubtle}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {[2, 4, 6, 8].map((t) => (
          <text
            key={t}
            x={toX(t)}
            y={h - pad + 14}
            fill={cssVar.textMuted}
            fontSize="9"
            textAnchor="middle"
            opacity={0.6}
          >
            {t}
          </text>
        ))}
        <line
          x1={ghostX}
          y1={pad}
          x2={ghostX}
          y2={h - pad}
          stroke="color-mix(in srgb, var(--color-maths) 25%, transparent)"
          strokeDasharray="4 4"
        />
        <circle
          cx={ghostX}
          cy={ghostY}
          r="4"
          fill={cssVar.maths}
          fillOpacity={0.35}
          stroke={cssVar.background}
          strokeWidth="2"
        />
        <text x={w / 2} y={h - 4} fill={cssVar.textMuted} fontSize="10" textAnchor="middle" opacity={0.5}>
          Scaled score
        </text>
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-elevated/30" />
    </div>
  );
}
