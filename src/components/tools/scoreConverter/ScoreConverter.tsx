"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";
import { PercentileMiniChart } from "@/components/papers/mark/PercentileMiniChart";
import { fetchEsatTable, type EsatRow } from "@/lib/esat/percentiles";
import {
  CONVERTER_EXAMS,
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

/** What the selected past paper proxies for in current admissions. */
function examTargetLabel(exam: ConverterExam): "ESAT" | "TMUA" {
  return exam === "TMUA" ? "TMUA" : "ESAT";
}

const fieldLabel = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle";

const selectWrap =
  "relative min-w-[5.5rem] rounded-organic-lg bg-surface-mid transition-colors hover:bg-surface-subtle";

const selectClass =
  "h-9 w-full cursor-pointer appearance-none rounded-organic-lg bg-transparent py-0 pl-3 pr-8 text-sm font-medium text-text outline-none focus:outline-none focus:ring-0";

const markInputClass =
  "h-8 w-11 rounded-organic-md bg-surface-mid text-center text-sm font-semibold tabular-nums text-text outline-none focus:outline-none focus:ring-0 disabled:opacity-35";

const COLOR_TEXT: Record<ModuleColor, string> = {
  maths: "text-maths",
  physics: "text-physics",
  chemistry: "text-chemistry",
  biology: "text-biology",
  advanced: "text-advanced",
  "tmua-accent": "text-tmua-accent",
};

function shortSectionLabel(label: string): string {
  const part = label.split("—")[0]?.trim() ?? label;
  return part.length > 22 ? `${part.slice(0, 20)}…` : part;
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

  const toggleSection = (opt: SectionOption) => {
    invalidateResults();
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
      const firstKey = data.sections[0]?.key ?? null;
      setActiveChartKey(firstKey);
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
    if (!result || !year || activeSection?.scaledScore == null) {
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

        {!hasCalculated && !resultLoading && (
          <div className="flex min-h-[160px] flex-col items-center justify-center text-center sm:min-h-[180px]">
            <p className="text-sm text-text-muted">
              Results will show here after you fill in the details and calculate.
            </p>
          </div>
        )}

        {resultLoading && (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 sm:min-h-[180px]">
            <Loader2 className="h-5 w-5 animate-spin text-secondary" />
            <p className="text-xs text-text-muted">Calculating…</p>
          </div>
        )}

        {resultError && hasCalculated && !resultLoading && (
          <div className="flex min-h-[160px] items-center justify-center sm:min-h-[180px]">
            <p className="text-sm text-error">{resultError}</p>
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

      {/* Inputs — bottom row */}
      <div className="rounded-organic-xl bg-surface-elevated p-4 shadow-modal-card sm:p-5">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
          <div className="shrink-0">
            <span className={fieldLabel}>Exam</span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-bold tracking-tight",
                  exam === "TMUA" ? "text-tmua-accent" : "text-secondary",
                )}
              >
                {examTargetLabel(exam)}
              </span>
              <div className={cn(selectWrap, "min-w-[5rem]")}>
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
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span className={fieldLabel}>Year</span>
            <div className={cn(selectWrap, "min-w-[4.5rem]")}>
              <select
                value={year?.year ?? ""}
                onChange={(e) => {
                  const opt = years.find((y) => y.year === Number(e.target.value)) ?? null;
                  setYear(opt);
                  setScaledInput("");
                  setCheckedKeys([]);
                  setRawByKey({});
                  invalidateResults();
                }}
                disabled={yearsLoading || years.length === 0}
                className={cn(selectClass, "disabled:opacity-40")}
              >
                <option value="" disabled>
                  {yearsLoading ? "…" : "—"}
                </option>
                {years.map((y) => (
                  <option key={y.year} value={y.year}>
                    {y.year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            </div>
          </div>

          {year && isScaledMode && (
            <div className="shrink-0">
              <span className={fieldLabel}>Scaled</span>
              <div className="flex items-center gap-1">
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
            </div>
          )}

          {year && !isScaledMode && (
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-4 gap-y-3">
              {sectionsLoading && (
                <span className="pb-2 text-xs text-text-muted">Loading sections…</span>
              )}
              {!sectionsLoading && sections.length === 0 && year && (
                <span className="pb-2 text-xs text-text-muted">No sections</span>
              )}
              {sections.map((s) => {
                const checked = checkedKeys.includes(s.key);
                const disabled = !checked && checkedKeys.length >= MAX_SECTIONS;
                const c = COLOR_TEXT[s.color];
                return (
                  <label
                    key={s.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-organic-lg px-2 py-1.5 transition-colors",
                      checked ? "bg-surface-mid" : "hover:bg-surface-subtle/80",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSection(s)}
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-secondary"
                    />
                    <span className={cn("max-w-[7rem] truncate text-xs font-medium", c)}>
                      {shortSectionLabel(s.legacyLabel)}
                    </span>
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
                      onClick={(e) => e.stopPropagation()}
                      className={markInputClass}
                    />
                    <span className="text-xs font-medium text-text-subtle">/{s.maxRaw}</span>
                  </label>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => void runConvert()}
            disabled={!canCalculate || resultLoading}
            className={cn(
              "ml-auto inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-organic-lg bg-secondary px-5 text-sm font-semibold text-background shadow-glow transition-all duration-fast",
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

  return (
    <div className="space-y-5">
      {multi && (
        <div className="flex flex-wrap gap-2">
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
                <span className={c}>{s.legacyLabel.split("—")[0]?.trim()}</span>
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

      {activeSection ? (
        <SectionResult
          section={activeSection}
          exam={exam}
          year={year}
          chartRows={chartRows}
          chartLoading={chartLoading}
        />
      ) : (
        <p className="text-sm text-text-muted">No results.</p>
      )}

      {multi && result.averageScaled != null && (
        <p className="text-xs text-text-muted">
          Average across sections:{" "}
          <span className="font-semibold text-text">{result.averageScaled.toFixed(1)}</span>
        </p>
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
  const topPct =
    section.percentile != null
      ? Math.max(0, 100 - section.percentile).toFixed(1)
      : null;

  if (section.scaledScore == null) {
    return (
      <p className="text-sm text-text-muted">No conversion data for this section.</p>
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
